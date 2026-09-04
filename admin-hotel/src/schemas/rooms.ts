import { z } from 'zod';

export const bulkRoomsPatternSchema = z.object({
  prefix: z.string().max(20).optional(),
  startNumber: z.number().int().min(0),
  count: z.number().int().min(1).max(200),
  floor: z.string().max(20).optional(),
});
export type BulkRoomsPatternFormValues = z.infer<typeof bulkRoomsPatternSchema>;

export const bulkRoomsManualSchema = z.object({
  roomNumbersText: z.string().min(1, 'Enter at least one room number'),
  floor: z.string().max(20).optional(),
});
export type BulkRoomsManualFormValues = z.infer<typeof bulkRoomsManualSchema>;

/** One room number per line or comma — matches how an admin would paste a
    list from a spreadsheet either way. */
export function parseRoomNumbersText(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Mirrors the backend's pattern-generation exactly
    (`CatalogAdminServiceImpl.buildRoomNumbers`): "{prefix}-{n}" when a
    prefix is given, else the plain number — kept here only for the live
    preview, never sent as-is (the server still generates authoritatively). */
export function previewPatternRoomNumbers(prefix: string | undefined, startNumber: number, count: number): string[] {
  const p = (prefix ?? '').trim();
  const numbers: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = startNumber + i;
    numbers.push(p ? `${p}-${n}` : String(n));
  }
  return numbers;
}
