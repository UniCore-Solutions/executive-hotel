/** Extras selection helpers — shared by room, booking and reservation flows. */

export type ExtraSelection = Array<{ id: string; qty: number }>;

/** Parse the `extras=id:qty,id:qty` URL parameter. Ids are NOT validated
    against a catalog here — deep links may reference backend extras that no
    fixture knows about; unknown ids simply contribute nothing to totals. */
export function parseExtrasParam(raw: string | null | undefined): ExtraSelection {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((e) => {
      const [id, qty] = e.split(':');
      return { id: id || '', qty: parseInt(qty || '0', 10) || 1 };
    })
    .filter((x) => x.id);
}

/** Serialize a selection into the `extras=` URL parameter value. */
export function extrasToParam(list: ExtraSelection): string {
  return list.map((x) => `${x.id}:${x.qty}`).join(',');
}
