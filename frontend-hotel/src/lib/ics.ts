/** Build an .ics calendar file for a reservation (BOOK-8 gap — documented in DECISIONS D-3). */

function esc(s: string): string {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function dt(iso: string, hour: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}${m}${d}T${hour.replace(':', '')}00`;
}

export interface IcsInput {
  summary: string;
  location: string;
  description: string;
  dtStart: string;
  dtStartTime?: string;
  dtEnd: string;
  dtEndTime?: string;
  uid: string;
}

export function buildIcs({
  summary,
  location,
  description,
  dtStart,
  dtStartTime = '15:00',
  dtEnd,
  dtEndTime = '12:00',
  uid,
}: IcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Executive Hotel//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${esc(uid)}`,
    `DTSTAMP:${dt(new Date().toISOString().slice(0, 10), '00:00')}`,
    `DTSTART:${dt(dtStart, dtStartTime)}`,
    `DTEND:${dt(dtEnd, dtEndTime)}`,
    `SUMMARY:${esc(summary)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
