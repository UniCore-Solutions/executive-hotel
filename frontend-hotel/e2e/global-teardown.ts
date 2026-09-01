/**
 * Releases the inventory the run booked.
 *
 * Seeded reservations are real: they hold rooms, and room types here have as
 * few as two. Without this, a handful of runs sells out the horizon and later
 * runs fail with "no window with N+ rooms available". Cancelling returns the
 * nights through the normal cancellation path (BookingService#cancel →
 * InventoryService#release).
 */
import { releaseSeeded } from './backend';

export default async function globalTeardown(): Promise<void> {
  try {
    const { released, pending } = await releaseSeeded();
    if (released > 0) console.log(`[e2e] released ${released} seeded reservation(s)`);
    if (pending > 0) {
      console.warn(`[e2e] ${pending} reservation(s) still held — retried on the next run`);
    }
  } catch (err) {
    console.warn('[e2e] could not release seeded reservations:', (err as Error).message);
  }
}
