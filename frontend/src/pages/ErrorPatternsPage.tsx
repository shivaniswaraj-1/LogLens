import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listErrorPatterns } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Spinner } from '../components/StatusViews';

export function ErrorPatternsPage() {
  const [sort, setSort] = useState<'frequent' | 'recent'>('frequent');
  const [page, setPage] = useState(1);

  const { data, error, isLoading, reload } = useAsync(
    () => listErrorPatterns({ sort, page, pageSize: 20 }),
    [sort, page],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Error Patterns</h1>
        <div className="flex gap-1 rounded-md border border-slate-800 p-1">
          <button
            onClick={() => setSort('frequent')}
            className={`rounded px-3 py-1 text-sm ${sort === 'frequent' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Most frequent
          </button>
          <button
            onClick={() => setSort('recent')}
            className={`rounded px-3 py-1 text-sm ${sort === 'recent' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Most recent
          </button>
        </div>
      </div>

      {isLoading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState title="No error patterns yet" description="Ingest some ERROR/FATAL logs to see patterns here." />
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Pattern</th>
                <th className="px-4 py-2 font-medium">Service</th>
                <th className="px-4 py-2 font-medium">Occurrences</th>
                <th className="px-4 py-2 font-medium">Last seen</th>
                <th className="px-4 py-2 font-medium">Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((pattern) => (
                <tr key={pattern.id} className="hover:bg-slate-900/40">
                  <td className="max-w-md truncate px-4 py-2">
                    <Link to={`/error-patterns/${pattern.id}`} className="text-slate-200 hover:text-sky-400 hover:underline">
                      {pattern.sampleMessage}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{pattern.service}</td>
                  <td className="px-4 py-2 font-medium text-slate-200">{pattern.occurrenceCount}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                    {new Date(pattern.lastSeenAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-400">{pattern._count?.incidents ?? 0}</td>
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
