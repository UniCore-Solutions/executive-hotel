import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { reservations } from '@/services/reservations';
import CheckinFlow from './CheckinFlow';

let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={href ? String(href) : '#'} {...rest}>
      {children}
    </a>
  ),
}));

function wrap() {
  return (
    <ToastProvider>
      <CheckinFlow />
    </ToastProvider>
  );
}

describe('CheckinFlow', () => {
  it('shows Booking not found when no ref is given', async () => {
    params = new URLSearchParams('');
    render(wrap());
    expect(await screen.findByText('Booking not found')).toBeInTheDocument();
  });

  it('shows Booking not found for an unknown ref', async () => {
    params = new URLSearchParams('ref=RC-UNKNOWN');
    render(wrap());
    expect(await screen.findByText('Booking not found')).toBeInTheDocument();
  });

  it('blocks cancelled reservations with the reference copy', async () => {
    const r = reservations.create({
      email: 'x@y.dev',
      guest: {
        title: 'Mr',
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.dev',
        phone: '+212 6 00 00 00 00',
        country: 'MA',
        arrival: '',
        requests: '',
      },
      hotelId: 'executive-boutique-rabat',
      roomId: 'standard-double',
      planId: 'standard-double::bb',
      checkin: '2026-09-12',
      checkout: '2026-09-14',
      adults: 2,
      children: 0,
      rooms: 1,
      extras: [],
      promo: '',
    });
    reservations.update(r.ref, { status: 'cancelled' });
    params = new URLSearchParams(`ref=${r.ref}`);
    render(wrap());
    expect(
      await screen.findByText("This reservation was cancelled, so online check-in isn't available.")
    ).toBeInTheDocument();
  });

  it('shows the all-checked-in state for a reservation already checked in', async () => {
    const r = reservations.create({
      email: 'x@y.dev',
      guest: {
        title: 'Ms',
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.dev',
        phone: '+212 6 00 00 00 00',
        country: 'MA',
        arrival: '',
        requests: '',
      },
      hotelId: 'executive-boutique-rabat',
      roomId: 'standard-double',
      planId: 'standard-double::bb',
      checkin: '2026-09-12',
      checkout: '2026-09-14',
      adults: 2,
      children: 0,
      rooms: 1,
      extras: [],
      promo: '',
    });
    reservations.setCheckedIn(r.ref);
    params = new URLSearchParams(`ref=${r.ref}`);
    render(wrap());
    expect(await screen.findByText("You're all checked in")).toBeInTheDocument();
    expect(screen.getByText(r.ref)).toBeInTheDocument();
  });

  it('prefills the lead guest, phone and arrival slot for the demo reservation', async () => {
    params = new URLSearchParams('ref=RC-DEMO1');
    render(wrap());
    const name = await screen.findByLabelText(/Lead guest/);
    await waitFor(() => expect(name).toHaveValue('Adam Benali'));
    expect(screen.getByLabelText(/Mobile/)).toHaveValue('+212 6 61 23 45 67');
    expect(screen.getByLabelText(/Arrival time/)).toHaveValue('15:00 – 18:00');
    expect(screen.getByText('Complete check-in')).toBeInTheDocument();
  });

  it('validates the ID field and short mobile numbers', async () => {
    params = new URLSearchParams('ref=RC-DEMO1');
    render(wrap());
    const submit = await screen.findByText('Complete check-in');
    const doc = screen.getByLabelText(/ID \/ passport/);
    await userEvent.type(doc, '123');
    const phone = screen.getByLabelText(/Mobile/);
    await userEvent.clear(phone);
    await userEvent.type(phone, '123');
    await userEvent.click(submit);
    const msg = screen.getByRole('alert');
    await waitFor(() =>
      expect(msg).toHaveTextContent(
        'Enter a valid ID / passport number. Enter a valid mobile number.'
      )
    );
  });

  it('completes check-in: persists arrival details and shows the state', async () => {
    params = new URLSearchParams('ref=RC-DEMO1');
    render(wrap());
    const submit = await screen.findByText('Complete check-in');
    const doc = screen.getByLabelText(/ID \/ passport/);
    await userEvent.type(doc, 'BE1234567');
    const notes = screen.getByLabelText(/know\?/);
    await userEvent.clear(notes);
    await userEvent.type(notes, 'Late arrival');
    await userEvent.click(submit);
    expect(
      await screen.findByText("You're all checked in", undefined, { timeout: 3000 })
    ).toBeInTheDocument();
    await waitFor(() => {
      const r = reservations.byRef('RC-DEMO1');
      expect(r?.status).toBe('checked-in');
      expect(r?.checkedIn).toBe(true);
      expect(r?.arrivalDoc).toBe('BE1234567');
      expect(r?.checkedInByName).toBe('Adam Benali');
      expect(r?.notes).toBe('Late arrival');
      expect(r?.arrival).toBe('15:00 – 18:00');
    });
  });
});
