import { prisma } from '../config/prisma';
import { detectServiceSpikes } from './spikeService';

interface HourlyErrorRow {
  bucket: Date;
  count: bigint;
}

export async function getDashboardSummary(hours = 24) {
  const rangeStart = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [levelGroups, activeIncidentCount, recentIncidents, topErrorPatterns, spikes, trendRows] =
    await Promise.all([
      prisma.log.groupBy({
        by: ['level'],
        where: { timestamp: { gte: rangeStart } },
        _count: { _all: true },
      }),
      prisma.incident.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.incident.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { errorPattern: true, assignee: { select: { id: true, name: true } } },
      }),
      prisma.errorPattern.findMany({
        where: { lastSeenAt: { gte: rangeStart } },
        orderBy: { occurrenceCount: 'desc' },
        take: 5,
      }),
      detectServiceSpikes(24),
      prisma.$queryRaw<HourlyErrorRow[]>`
        SELECT date_trunc('hour', "timestamp") as bucket, COUNT(*) as count
        FROM "Log"
        WHERE level IN ('ERROR', 'FATAL') AND "timestamp" >= ${rangeStart}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    ]);

  const levelCounts: Record<string, number> = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
  for (const group of levelGroups) {
    levelCounts[group.level] = group._count._all;
  }
  const totalLogs = Object.values(levelCounts).reduce((sum, n) => sum + n, 0);
  const errorCount = levelCounts.ERROR + levelCounts.FATAL;
  const errorRate = totalLogs > 0 ? errorCount / totalLogs : 0;

  return {
    rangeHours: hours,
    totalLogs,
    levelCounts,
    errorRate,
    topErrorPatterns,
    errorTrend: trendRows.map((row) => ({ bucket: row.bucket, count: Number(row.count) })),
    spikes,
    activeIncidentCount,
    recentIncidents,
  };
}
