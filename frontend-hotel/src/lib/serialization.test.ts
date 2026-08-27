import { describe, expect, it } from 'vitest';
import { buildIcs } from '@/lib/ics';
import { qrCells } from '@/lib/qr';

describe('buildIcs', () => {
  it('produces a VEVENT with the reservation details', () => {
    const ics = buildIcs({
      summary: 'Executive Hotel — Superior Double or Twin',
      location: '72 Rue Oued Sebou, Agdal, 10106 Rabat, Morocco',
      description: 'Check in to your stay at Executive Hotel. Reference RC-ABC123.',
      dtStart: '2026-09-12',
      dtStartTime: '15:00',
      dtEnd: '2026-09-16',
      dtEndTime: '11:00',
      uid: 'RC-ABC123',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260912T150000');
    expect(ics).toContain('DTEND:20260916T110000');
    expect(ics).toContain('UID:RC-ABC123');
    expect(ics).toContain('LOCATION:72 Rue Oued Sebou');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toMatch(/\r\n$/);
  });

  it('escapes commas and colons in text fields', () => {
    const ics = buildIcs({
      summary: 'Stay, part 2: finale',
      location: 'x',
      description: 'd',
      dtStart: '2026-09-12',
      dtEnd: '2026-09-16',
      uid: 'U',
    });
    expect(ics).toContain('SUMMARY:Stay\\, part 2: finale');
  });
});

describe('qrCells', () => {
  it('is deterministic for a reference', () => {
    expect(qrCells('RC-ABC123')).toBe(qrCells('RC-ABC123'));
    expect(qrCells('RC-ABC123').length).toBeGreaterThan(100);
    expect(qrCells('RC-ABC123')).toContain('rect');
    expect(qrCells('RC-ABC123')).not.toBe(qrCells('RC-ABC124'));
  });
});
