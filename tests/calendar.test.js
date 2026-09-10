import { describe, it, expect } from 'vitest';
import { getZonedDay, getNoonInZone, getInstantInZone } from '../src/utils/lunarCalc.js';

// Intl as an independent oracle: what a place's own clock shows for an instant
const readClock = (date, timeZone) => new Intl.DateTimeFormat('en-US', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
}).format(date);

const pad = (n) => String(n).padStart(2, '0');

describe("calendar days are read on the place's clock", () => {
  it('names the day at the place, not on the device', () => {
    // 02:00 UTC on 10 Sep: already the 10th on this Colombo test machine and in
    // Tokyo, still the 9th in Honolulu. The header used to say the 10th regardless.
    const instant = new Date('2026-09-10T02:00:00Z');
    expect(getZonedDay(instant, 'Pacific/Honolulu')).toEqual({ year: 2026, month: 8, day: 9 });
    expect(getZonedDay(instant, 'Asia/Tokyo')).toEqual({ year: 2026, month: 8, day: 10 });
  });

  it('rolls the year over at the place', () => {
    const instant = new Date('2026-12-31T20:00:00Z');
    expect(getZonedDay(instant, 'Pacific/Kiritimati')).toEqual({ year: 2027, month: 0, day: 1 });
    expect(getZonedDay(instant, 'America/New_York')).toEqual({ year: 2026, month: 11, day: 31 });
  });

  it('finds noon on a date, including far east of UTC and on DST changeover days', () => {
    const cases = [
      [2026, 8, 26, 'Pacific/Honolulu', '2026-09-26T22:00:00.000Z'],
      [2026, 8, 26, 'Asia/Colombo', '2026-09-26T06:30:00.000Z'],
      [2026, 8, 26, 'Pacific/Kiritimati', '2026-09-25T22:00:00.000Z'], // UTC+14
      [2026, 11, 25, 'Pacific/Auckland', '2026-12-24T23:00:00.000Z'], // NZDT, UTC+13
      [2026, 2, 8, 'America/New_York', '2026-03-08T16:00:00.000Z'], // clocks go forward
      [2026, 10, 1, 'America/New_York', '2026-11-01T17:00:00.000Z'] // clocks go back
    ];
    for (const [y, m, d, zone, iso] of cases) {
      expect(getNoonInZone(y, m, d, zone).toISOString()).toBe(iso);
    }
  });

  it('lands on 12:00 of the right date in every kind of zone', () => {
    const zones = [
      'Pacific/Kiritimati', 'Pacific/Chatham', 'Pacific/Auckland', 'Asia/Kathmandu',
      'Asia/Colombo', 'Europe/London', 'America/St_Johns', 'America/New_York',
      'Pacific/Honolulu', 'Pacific/Pago_Pago', 'Etc/GMT+12'
    ];
    const days = [[2026, 0, 1], [2026, 2, 8], [2026, 8, 27], [2026, 10, 1], [2026, 11, 31]];
    for (const zone of zones) {
      for (const [y, m, d] of days) {
        expect(readClock(getNoonInZone(y, m, d, zone), zone)).toBe(`${pad(m + 1)}/${pad(d)}/${y}, 12:00`);
      }
    }
  });

  it('reaches any wall time, not only noon', () => {
    const late = getInstantInZone(2026, 8, 26, 23, 45, 'Asia/Kathmandu');
    expect(readClock(late, 'Asia/Kathmandu')).toBe('09/26/2026, 23:45');

    // Just after New York's clocks jump from 02:00 to 03:00. The offset at the
    // first guess is still standard time, so this needs the second pass.
    const afterJump = getInstantInZone(2026, 2, 8, 3, 30, 'America/New_York');
    expect(afterJump.toISOString()).toBe('2026-03-08T07:30:00.000Z');
    expect(readClock(afterJump, 'America/New_York')).toBe('03/08/2026, 03:30');
  });
});
