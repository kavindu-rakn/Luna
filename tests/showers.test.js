import { describe, it, expect } from 'vitest';
import {
  SHOWERS,
  solarLongitude,
  peaksInYear,
  zenithalHourlyRate,
  radiantAt,
  visibleHourlyRate,
  moonlightLoss,
  activeShowers,
  bestOfNight,
  showerNightsInMonth
} from '../src/sky/showers';

const shower = (id) => SHOWERS.find((s) => s.id === id);
const at = (iso) => new Date(iso);

// IMO 2027 Meteor Shower Calendar (Rendtel, IMO INFO(3-26)), Table 5, the Working
// List of Visual Meteor Showers: each maximum's date, "accurate only for 2027",
// against its solar longitude (equinox 2000.0)
const TABLE_5_MAXIMA = {
  QUA: '2027-01-04',
  LYR: '2027-04-23',
  ETA: '2027-05-06',
  SDA: '2027-07-31',
  PER: '2027-08-13',
  ORI: '2027-10-22',
  LEO: '2027-11-18',
  GEM: '2027-12-14',
  URS: '2027-12-23'
};

describe('meteor shower maxima', () => {
  it('fall on the dates the IMO lists for 2027', () => {
    const found = Object.fromEntries(peaksInYear(2027).map(({ shower: s, date }) => [s.id, date.toISOString().slice(0, 10)]));
    expect(found).toEqual(TABLE_5_MAXIMA);
  });

  it('put the Quadrantids where the IMO predicts them', () => {
    // The calendar's web page (https://www.imo.net/calendar/): "Predictions for
    // 2027 show a peak near 3:30 UT on January 4th"
    const { date } = peaksInYear(2027).find(({ shower: s }) => s.id === 'QUA');
    expect(Math.abs(date - at('2027-01-04T03:30:00Z'))).toBeLessThan(20 * 60000);
  });

  it('come round each year at the same solar longitude', () => {
    for (const { shower: s, date } of peaksInYear(2031)) {
      expect(Math.abs(solarLongitude(date) - s.peak)).toBeLessThan(0.001);
    }
  });
});

describe('activity', () => {
  it('reaches the IMO ZHR at the maximum', () => {
    for (const s of SHOWERS) {
      const { date } = peaksInYear(2027).find(({ shower: p }) => p.id === s.id);
      expect(zenithalHourlyRate(s, date)).toBeCloseTo(s.zhr, 2);
    }
  });

  it('stops outside the activity dates (Table 5)', () => {
    // Geminids: Dec 04 to Dec 20
    expect(zenithalHourlyRate(shower('GEM'), at('2027-12-20T12:00:00Z'))).toBeGreaterThan(0);
    expect(zenithalHourlyRate(shower('GEM'), at('2027-12-21T12:00:00Z'))).toBe(0);
    expect(zenithalHourlyRate(shower('GEM'), at('2027-12-03T12:00:00Z'))).toBe(0);
    // Quadrantids, across the new year: Dec 28 to Jan 12
    expect(zenithalHourlyRate(shower('QUA'), at('2026-12-30T00:00:00Z'))).toBeGreaterThan(0);
    expect(zenithalHourlyRate(shower('QUA'), at('2027-01-13T12:00:00Z'))).toBe(0);
  });

  it('rises more slowly than it falls, for the Geminids alone (Jenniskens 1994)', () => {
    const { date } = peaksInYear(2027).find(({ shower: s }) => s.id === 'GEM');
    const day = 86400000;
    const before = zenithalHourlyRate(shower('GEM'), new Date(date - day));
    const after = zenithalHourlyRate(shower('GEM'), new Date(date.getTime() + day));
    expect(before).toBeGreaterThan(after * 1.2);
  });

  it('keeps the Quadrantids above half their peak for about six hours (IMO)', () => {
    const { date } = peaksInYear(2027).find(({ shower: s }) => s.id === 'QUA');
    const threeHours = 3 * 3600000;
    const edge = zenithalHourlyRate(shower('QUA'), new Date(date.getTime() + threeHours)) / shower('QUA').zhr;
    expect(edge).toBeGreaterThan(0.45);
    expect(edge).toBeLessThan(0.55);
  });

  it('lists the showers active at a moment, strongest first', () => {
    // 22 October 2026, the Orionids' peak night (Table 5 and the web page)
    expect(activeShowers(at('2026-10-22T00:00:00Z'))[0].shower.id).toBe('ORI');
    expect(activeShowers(at('2026-06-15T00:00:00Z'))).toEqual([]);
  });
});

describe('radiants', () => {
  it('follow the IMO track (Table 6)', () => {
    // The Perseids on Aug 10 and Aug 15
    const aug10 = radiantAt(shower('PER'), at('2027-08-10T00:00:00Z'));
    expect(aug10.ra).toBeCloseTo(45, 1);
    expect(aug10.dec).toBeCloseTo(57, 1);
    const aug15 = radiantAt(shower('PER'), at('2027-08-15T00:00:00Z'));
    expect(aug15.ra).toBeCloseTo(51, 1);
    expect(aug15.dec).toBeCloseTo(58, 1);
  });

  // Both tables give whole degrees, and Table 6 a position every five days
  it('sit at the maximum where Table 5 puts them, to within a degree or two', () => {
    const table5 = { QUA: [230, 49], LYR: [271, 34], ETA: [338, -1], SDA: [340, -16], PER: [48, 58], ORI: [95, 16], LEO: [152, 22], GEM: [112, 33], URS: [217, 76] };
    for (const { shower: s, date } of peaksInYear(2027)) {
      const r = radiantAt(s, date);
      const [ra, dec] = table5[s.id];
      expect(Math.abs(((r.ra - ra + 540) % 360) - 180), s.id).toBeLessThan(2);
      expect(Math.abs(r.dec - dec), s.id).toBeLessThan(2);
    }
  });

  it('carry on across the new year without a jump (the Quadrantids)', () => {
    const dec31 = radiantAt(shower('QUA'), at('2026-12-31T00:00:00Z'));
    const jan1 = radiantAt(shower('QUA'), at('2027-01-01T00:00:00Z'));
    expect(Math.abs(jan1.ra - dec31.ra)).toBeLessThan(1);
  });
});

describe('what can be seen', () => {
  const london = [51.48, 0];
  const sydney = [-33.87, 151.21];

  it('is nothing by day, nor while the radiant is below the horizon', () => {
    // The Geminids at noon in London
    expect(visibleHourlyRate(shower('GEM'), at('2027-12-14T12:00:00Z'), ...london)).toBe(0);
    // The Ursids' radiant (Dec +76) never rises from Sydney: "strictly a
    // northern-hemisphere event" (IMO)
    for (let h = 0; h < 24; h++) {
      expect(visibleHourlyRate(shower('URS'), new Date(Date.UTC(2027, 11, 22, h)), ...sydney)).toBe(0);
    }
  });

  it('peaks for the Geminids in the night hours from London, below the ZHR', () => {
    // "This is the one major shower that provides good activity before midnight,
    // as the constellation Gemini is well placed from 22:00 onward", and in 2026
    // the Moon is 14% lit on the peak night (IMO, https://www.imo.net/calendar/)
    const best = bestOfNight(shower('GEM'), at('2026-12-13T20:00:00Z'), ...london);
    const hour = best.at.getUTCHours();
    expect(hour >= 22 || hour <= 4).toBe(true);
    expect(best.rate).toBeGreaterThan(40);
    expect(best.rate).toBeLessThan(150);
  });

  it('waits for a full Moon to sink, as in 2027', () => {
    // The 2027 peak night has a full Moon up all night from London: the best comes
    // before dawn, as the Moon gets low, and at a fraction of a dark sky's rate
    const best = bestOfNight(shower('GEM'), at('2027-12-13T20:00:00Z'), ...london);
    expect(best.at.getUTCHours()).toBeGreaterThanOrEqual(4);
    expect(best.at.getUTCHours()).toBeLessThanOrEqual(7);
    expect(best.rate).toBeLessThan(40);
  });

  it('loses most of a shower to a full Moon high in the sky, little to a new one', () => {
    // 13 Aug 2027 is near a waxing gibbous Moon (79% lit, IMO); 2 Dec 2027 is
    // near new. Each taken with the Moon well up from London.
    const per = shower('PER');
    expect(moonlightLoss(per, at('2027-08-13T21:00:00Z'), ...london)).toBeGreaterThan(0.3);
    expect(moonlightLoss(per, at('2027-12-02T21:00:00Z'), ...london)).toBeLessThan(0.1);
  });
});

describe('the calendar', () => {
  const nights = (year, month, timeZone, lat, lon) => showerNightsInMonth(year, month, timeZone, lat, lon)
    .map((entry) => [entry.shower.id, entry.evening, entry.nightLabel]);

  it('marks each peak night by the evening it begins', () => {
    // The 2026 Geminid maximum comes at 13:46 UT on Dec 14, nearer the following
    // night than the one before it in London. The Ursids peak at 22 UT on Dec 22.
    expect(nights(2026, 11, 'Europe/London', 51.48, 0)).toEqual([
      ['GEM', 14, 'Dec 14–15'],
      ['URS', 22, 'Dec 22–23']
    ]);
  });

  it('writes a night that crosses into the next month in full', () => {
    expect(nights(2026, 6, 'Europe/London', 51.48, 0)).toContainEqual(['SDA', 31, 'Jul 31–Aug 1']);
  });

  it('leaves out a shower that cannot be seen from the place', () => {
    // The Ursids never rise from Sydney
    expect(nights(2026, 11, 'Australia/Sydney', -33.87, 151.21).map(([id]) => id)).toEqual(['GEM']);
  });

  it('lands on a moment when the shower can be seen', () => {
    for (const entry of showerNightsInMonth(2026, 7, 'Europe/London', 51.48, 0)) {
      expect(visibleHourlyRate(entry.shower, entry.best, 51.48, 0)).toBeCloseTo(entry.rate, 6);
      expect(entry.rate).toBeGreaterThanOrEqual(1);
    }
  });
});
