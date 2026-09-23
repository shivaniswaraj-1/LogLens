import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLogs, listServices } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import type { LogLevel } from '../api/types';
import { LevelBadge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Spinner } from '../components/StatusViews';
import { IngestPanel } from '../components/IngestPanel';

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

export function LogsPage() {
  const [service, setService] = useState('');
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [ingestNonce, setIngestNonce] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: services } = useAsync(() => listServices(), []);

  const { data, error, isLoading, reload } = useAsync(
    () =>
      listLogs({
        service: service || undefined,
        level: level || undefined,
        search: search || undefined,
        page,
        pageSize: 25,
      }),
    [service, level, search, page, ingestNonce],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Logs</h1>
        <IngestPanel onIngested={() => setIngestNonce((n) => n + 1)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by service"
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">All services</option>
          {services?.services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by level"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as LogLevel | '');
            setPage(1);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          aria-label="Search message text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search message text…"
          className="min-w-[240px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600"
        />
      </div>

      {isLoading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState title="No logs found" description="Try adjusting your filters or ingest some logs." />
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Timestamp</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Service</th>
                <th className="px-4 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <LevelBadge level={log.level} />
                  </td>
                  <td className="px-4 py-2 text-slate-300">{log.service}</td>
                  <td className="max-w-xl truncate px-4 py-2 text-slate-200">
                    {log.errorPatternId ? (
                      <Link to={`/error-patterns/${log.errorPatternId}`} className="hover:text-sky-400 hover:underline">
                        {log.message}
                      </Link>
                    ) : (
                      log.message
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
