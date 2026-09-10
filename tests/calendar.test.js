import { describe, it, expect } from 'vitest';
import { getZonedDay, getNoonInZone, getInstantInZone, getNextMajorPhases } from '../src/utils/lunarCalc.js';
import { getMonthPhases, PRINCIPAL_PHASES } from '../src/utils/calendar.js';

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

describe('a month of Moon phases at a place', () => {
  it('lists the principal phases on their days, agreeing with the drawer to the second', () => {
    const { events } = getMonthPhases(2026, 8, 'Europe/London');
    expect(events.map((e) => [e.name, e.day])).toEqual([
      ['Last Quarter', 4], ['New Moon', 11], ['First Quarter', 18], ['Full Moon', 26]
    ]);

    const next = getNextMajorPhases(new Date('2026-09-01T00:00:00Z'), 'UTC');
    const drawer = {
      new_moon: next.nextNewMoon.date,
      first_quarter: next.nextFirstQuarter.date,
      full_moon: next.nextFullMoon.date,
      last_quarter: next.nextLastQuarter.date
    };
    for (const event of events) {
      expect(Math.abs(event.date - drawer[event.key])).toBeLessThan(2000);
    }
  });

  it('puts each phase on the day it happens at the place', () => {
    const dayOf = (zone, key) => getMonthPhases(2026, 8, zone).events.find((e) => e.key === key).day;
    // The New Moon at 03:28 UTC on 11 Sep is still the evening of the 10th in Honolulu
    expect(dayOf('Pacific/Honolulu', 'new_moon')).toBe(10);
    expect(dayOf('Asia/Tokyo', 'new_moon')).toBe(11);
    // The Full Moon at 16:50 UTC on 26 Sep is already the 27th in Tokyo
    expect(dayOf('Europe/London', 'full_moon')).toBe(26);
    expect(dayOf('Asia/Tokyo', 'full_moon')).toBe(27);
  });

  it('finds both Full Moons in a blue-moon month', () => {
    const fulls = getMonthPhases(2026, 4, 'UTC').events.filter((e) => e.key === 'full_moon');
    expect(fulls.map((e) => e.day)).toEqual([1, 31]);
  });

  it('never misses or repeats a phase across a whole year', () => {
    const all = [];
    for (let month = 0; month < 12; month++) {
      all.push(...getMonthPhases(2026, month, 'Asia/Colombo').events);
    }
    const order = PRINCIPAL_PHASES.map((p) => p.key);
    for (let i = 1; i < all.length; i++) {
      const gapDays = (all[i].date - all[i - 1].date) / 86400000;
      expect(gapDays).toBeGreaterThan(5.5);
      expect(gapDays).toBeLessThan(9);
      expect(order.indexOf(all[i].key)).toBe((order.indexOf(all[i - 1].key) + 1) % 4);
    }
    // 2026 has thirteen Full Moons, and a New Moon in every month
    expect(all.filter((e) => e.key === 'full_moon')).toHaveLength(13);
    expect(all.filter((e) => e.key === 'new_moon')).toHaveLength(12);
  });

  it('keeps a late-night phase on its date the night the clocks change', () => {
    // 23:26 on 3 Oct in Sydney, hours before the clocks go forward. Counting the day
    // back 12 hours from noon, rather than from real local midnight, puts it on the 4th.
    const lastQuarter = getMonthPhases(2026, 9, 'Australia/Sydney').events.find((e) => e.key === 'last_quarter');
    expect(lastQuarter.day).toBe(3);
    expect(readClock(lastQuarter.date, 'Australia/Sydney')).toBe('10/03/2026, 23:26');
  });

  it('gives every day a phase, and marks exactly the days that hold an event', () => {
    const { days, events } = getMonthPhases(2026, 1, 'America/New_York'); // 28 days
    expect(days).toHaveLength(28);
    for (const { phase } of days) {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(days.filter((d) => d.event).map((d) => d.day)).toEqual(events.map((e) => e.day));
  });
});
