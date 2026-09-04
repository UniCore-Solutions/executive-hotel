/**
 * Formats `AuditLogEntry.metadata` for display.
 *
 * The schema declares this field as a plain `String`, but the backend's
 * resolver (`AuditLogView.metadata`) actually returns the raw `Map<String,
 * Object>` read off the `audit_logs.metadata` jsonb column — there is no
 * custom scalar or serializer in between. Spring GraphQL's default String
 * coercion falls back to `String.valueOf(...)` for a non-String value, so
 * what arrives here is Java's `Map.toString()` shape (`{key=value, ...}`),
 * not JSON — confirmed live, e.g. `{name=Executive Hotel}` and
 * `{ratePlanId=..., roomTypeId=...}`. `JSON.parse` on that throws.
 *
 * This is a pre-existing backend quirk, not something this read-only
 * module should paper over by inventing data — so this formatter tries
 * real JSON first (in case a future write path ever serializes properly),
 * falls back to parsing the `{k=v, k2=v2}` shape into the same key/value
 * rows, and only shows the raw string if neither parse succeeds.
 */
export type AuditMetadataEntry = { key: string; value: string };

export type AuditMetadataResult =
  | { kind: 'empty' }
  | { kind: 'entries'; entries: AuditMetadataEntry[] }
  | { kind: 'json'; pretty: string }
  | { kind: 'raw'; text: string };

export function parseAuditMetadata(raw: string | null | undefined): AuditMetadataResult {
  if (raw == null || raw.trim() === '') return { kind: 'empty' };

  try {
    const parsed: unknown = JSON.parse(raw);
    return { kind: 'json', pretty: JSON.stringify(parsed, null, 2) };
  } catch {
    // fall through to the Java Map#toString() shape below
  }

  const match = /^\{(.*)\}$/s.exec(raw.trim());
  if (match) {
    const body = match[1] ?? '';
    if (body.trim() === '') return { kind: 'entries', entries: [] };
    // Java's Map#toString() joins "k=v" pairs with ", " — good enough for
    // this platform's flat, single-level audit metadata (ids, names,
    // counts). Doesn't attempt to handle a comma inside a value.
    const entries = body.split(', ').map((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return { key: pair, value: '' };
      return { key: pair.slice(0, idx), value: pair.slice(idx + 1) };
    });
    return { kind: 'entries', entries };
  }

  return { kind: 'raw', text: raw };
}
