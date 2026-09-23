import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDashboardSummary } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { StatCard } from '../components/StatCard';
import { ErrorState, Spinner, EmptyState } from '../components/StatusViews';
import { SeverityBadge, StatusBadge } from '../components/Badge';

const RANGE_OPTIONS = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
];

function formatHour(bucket: string): string {
  return new Date(bucket).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
}

export function DashboardPage() {
  const [hours, setHours] = useState(24);
  const { data, error, isLoading, reload } = useAsync(() => getDashboardSummary(hours), [hours]);

  if (isLoading && !data) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const errorRatePct = (data.errorRate * 100).toFixed(1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <div className="flex gap-1 rounded-md border border-slate-800 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              onClick={() => setHours(opt.hours)}
              className={`rounded px-3 py-1 text-sm ${
                hours === opt.hours ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Logs" value={data.totalLogs.toLocaleString()} />
        <StatCard label="Errors" value={data.levelCounts.ERROR + data.levelCounts.FATAL} tone="error" />
        <StatCard label="Warnings" value={data.levelCounts.WARN} tone="warn" />
        <StatCard label="Error Rate" value={`${errorRatePct}%`} tone={data.errorRate > 0.1 ? 'error' : 'ok'} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-4 text-sm font-medium text-slate-300">Error volume trend (ERROR + FATAL)</h2>
        {data.errorTrend.length === 0 ? (
          <EmptyState title="No error logs in this window" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.errorTrend}>
              <defs>
                <linearGradient id="errorFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bucket" tickFormatter={formatHour} stroke="#64748b" fontSize={12} minTickGap={40} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) => formatHour(value as string)}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="count" stroke="#f87171" fill="url(#errorFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Detected spikes</h2>
          {data.spikes.length === 0 ? (
            <EmptyState title="No spikes detected" description="Error volume is within normal range." />
          ) : (
            <ul className="space-y-2">
              {data.spikes.map((spike) => (
                <li key={spike.service} className="rounded-md border border-red-900/40 bg-red-950/20 p-3 text-sm">
                  <p className="font-medium text-red-300">{spike.service}</p>
                  <p className="text-xs text-slate-400">
                    {spike.observedCount} errors this hour vs baseline {spike.baselineAverage.toFixed(1)}
                    {spike.ratio ? ` (${spike.ratio.toFixed(1)}x)` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Top error patterns</h2>
          {data.topErrorPatterns.length === 0 ? (
            <EmptyState title="No error patterns yet" />
          ) : (
            <ul className="space-y-2">
              {data.topErrorPatterns.map((pattern) => (
                <li key={pattern.id}>
                  <Link
                    to={`/error-patterns/${pattern.id}`}
                    className="block rounded-md border border-slate-800 p-3 text-sm hover:border-sky-700 hover:bg-slate-800/50"
                  >
                    <p className="truncate font-medium text-slate-200">{pattern.sampleMessage}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {pattern.service} &middot; {pattern.occurrenceCount} occurrences
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Recent incidents</h2>
            <span className="text-xs text-slate-500">{data.activeIncidentCount} active</span>
          </div>
          {data.recentIncidents.length === 0 ? (
            <EmptyState title="No incidents yet" />
          ) : (
            <ul className="space-y-2">
              {data.recentIncidents.map((incident) => (
                <li key={incident.id}>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="block rounded-md border border-slate-800 p-3 text-sm hover:border-sky-700 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-slate-200">{incident.title}</p>
                      <StatusBadge status={incident.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <SeverityBadge severity={incident.severity} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
