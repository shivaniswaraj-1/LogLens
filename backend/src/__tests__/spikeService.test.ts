import { buildHourBuckets, truncateToHour } from '../services/spikeService';

/**
 * Regression coverage for the IST/UTC bucket-alignment bug: an earlier
 * version truncated using local time (`setMinutes`), which only matches
 * Postgres' UTC-based `date_trunc('hour', ...)` on machines whose timezone
 * offset happens to be a whole number of hours. IST (UTC+5:30) broke it
 * silently — every bucket lookup missed and no spike was ever reported.
 * These tests pin the UTC-based behavior directly, independent of whatever
 * timezone the test runner's process happens to be in.
 */
describe('truncateToHour', () => {
  it('zeroes minutes/seconds/ms in UTC, not local time', () => {
    // 10:47:33.250 UTC on a specific date, chosen independent of any local offset.
    const input = new Date(Date.UTC(2026, 8, 23, 10, 47, 33, 250));
    const result = truncateToHour(input);

    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(8);
    expect(result.getUTCDate()).toBe(23);
    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('is idempotent on an already-truncated hour', () => {
    const onTheHour = new Date(Date.UTC(2026, 0, 1, 5, 0, 0, 0));
    expect(truncateToHour(onTheHour).getTime()).toBe(onTheHour.getTime());
  });

  it('correctly rolls over a UTC day boundary (23:xx -> next day 00:00 would NOT happen; truncation stays within the same hour/day)', () => {
    const nearMidnight = new Date(Date.UTC(2026, 0, 1, 23, 59, 59, 999));
    const result = truncateToHour(nearMidnight);
    expect(result.toISOString()).toBe('2026-01-01T23:00:00.000Z');
  });

  it('handles a half-hour-offset scenario deterministically', () => {
    // Simulates the exact shape of the IST bug: a timestamp whose minutes
    // component would matter if truncation ever used a local, non-UTC clock.
    const input = new Date(Date.UTC(2026, 8, 23, 5, 30, 0, 0));
    expect(truncateToHour(input).toISOString()).toBe('2026-09-23T05:00:00.000Z');
  });
});

describe('buildHourBuckets', () => {
  it('produces hoursBack + 1 buckets, one hour apart, ending at the truncated current hour', () => {
    const now = new Date(Date.UTC(2026, 8, 23, 10, 15, 0, 0));
    const buckets = buildHourBuckets(24, now);

    expect(buckets).toHaveLength(25);
    expect(buckets[buckets.length - 1].toISOString()).toBe('2026-09-23T10:00:00.000Z');
    expect(buckets[0].toISOString()).toBe('2026-09-22T10:00:00.000Z');

    for (let i = 1; i < buckets.length; i += 1) {
      expect(buckets[i].getTime() - buckets[i - 1].getTime()).toBe(60 * 60 * 1000);
    }
  });

  it('spans a UTC year boundary correctly', () => {
    const now = new Date(Date.UTC(2027, 0, 1, 2, 0, 0, 0));
    const buckets = buildHourBuckets(5, now);
    expect(buckets[0].toISOString()).toBe('2026-12-31T21:00:00.000Z');
    expect(buckets[buckets.length - 1].toISOString()).toBe('2027-01-01T02:00:00.000Z');
  });
});
