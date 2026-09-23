import { prisma } from '../config/prisma';
import { analyzeSpike, Bucket, SpikeDetectionOptions } from './spikeDetection';

interface RawBucketRow {
  bucket: Date;
  service: string;
  count: bigint;
}

export interface ServiceSpike {
  service: string;
  windowStart: Date;
  observedCount: number;
  baselineAverage: number;
  ratio: number | null;
}

/**
 * Truncates to the start of the UTC hour. Must use UTC (not local time)
 * because Postgres' date_trunc('hour', ...) operates on the stored literal
 * value with no timezone shifting; using local-time truncation here would
 * silently misalign every bucket on any machine whose timezone offset isn't
 * a whole number of hours (e.g. IST, UTC+5:30), causing every lookup to
 * miss and spikes to never be detected.
 */
export function truncateToHour(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCMinutes(0, 0, 0);
  return truncated;
}

export function buildHourBuckets(hoursBack: number, now: Date): Date[] {
  const currentHour = truncateToHour(now);
  const buckets: Date[] = [];
  for (let i = hoursBack; i >= 0; i -= 1) {
    buckets.push(new Date(currentHour.getTime() - i * 60 * 60 * 1000));
  }
  return buckets;
}

/**
 * Detects services whose most recent hour of ERROR/FATAL logs is
 * significantly above their own recent baseline. See spikeDetection.ts for
 * the algorithm and its documented limitations.
 */
export async function detectServiceSpikes(
  hoursBack = 24,
  options: SpikeDetectionOptions = {},
): Promise<ServiceSpike[]> {
  const now = new Date();
  const rangeStart = new Date(truncateToHour(now).getTime() - hoursBack * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawBucketRow[]>`
    SELECT date_trunc('hour', "timestamp") as bucket, service, COUNT(*) as count
    FROM "Log"
    WHERE level IN ('ERROR', 'FATAL') AND "timestamp" >= ${rangeStart}
    GROUP BY bucket, service
  `;

  const countsByServiceAndBucket = new Map<string, number>();
  const services = new Set<string>();
  for (const row of rows) {
    services.add(row.service);
    countsByServiceAndBucket.set(`${row.service}|${row.bucket.getTime()}`, Number(row.count));
  }

  const hourBuckets = buildHourBuckets(hoursBack, now);
  const spikes: ServiceSpike[] = [];

  for (const service of services) {
    const buckets: Bucket[] = hourBuckets.map((start) => ({
      start,
      count: countsByServiceAndBucket.get(`${service}|${start.getTime()}`) ?? 0,
    }));

    const analysis = analyzeSpike(buckets, options);
    if (analysis.isSpike) {
      spikes.push({
        service,
        windowStart: hourBuckets[hourBuckets.length - 1],
        observedCount: analysis.observedCount,
        baselineAverage: analysis.baselineAverage,
        ratio: analysis.ratio,
      });
    }
  }

  return spikes.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
}
