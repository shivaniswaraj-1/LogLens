import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorPattern, listLogsForPattern } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Spinner } from '../components/StatusViews';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/Badge';
import { CreateIncidentModal } from '../components/CreateIncidentModal';

export function ErrorPatternDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showCreateIncident, setShowCreateIncident] = useState(false);

  const { data, error, isLoading, reload } = useAsync(() => getErrorPattern(id!), [id]);
  const {
    data: logsData,
    error: logsError,
    isLoading: logsLoading,
    reload: reloadLogs,
  } = useAsync(() => listLogsForPattern(id!, page, 20), [id, page]);

  if (isLoading && !data) return <Spinner label="Loading error pattern…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const pattern = data.errorPattern;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/error-patterns" className="text-sm text-slate-500 hover:text-slate-300">
          &larr; Back to error patterns
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-lg font-semibold text-slate-100 [overflow-wrap:anywhere]">
              {pattern.sampleMessage}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {pattern.service} &middot; {pattern.occurrenceCount} occurrences &middot; first seen{' '}
              {new Date(pattern.firstSeenAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setShowCreateIncident(true)}
            className="shrink-0 self-start rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Create incident
          </button>
        </div>

        {pattern.incidents.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Related incidents</h2>
            <ul className="mt-2 space-y-1">
              {pattern.incidents.map((incident) => (
                <li key={incident.id}>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="flex items-start gap-2 text-sm text-slate-300 hover:text-sky-400"
                  >
                    <StatusBadge status={incident.status} />
                    <span className="min-w-0 break-words">{incident.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-300">Matching logs</h2>
        {logsLoading && !logsData && <Spinner label="Loading logs…" />}
        {logsError && <ErrorState message={logsError} onRetry={reloadLogs} />}
        {logsData && logsData.items.length === 0 && <EmptyState title="No logs on this page" />}
        {logsData && logsData.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Timestamp</th>
                  <th className="px-4 py-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logsData.items.map((log) => (
                  <tr key={log.id}>
                    <td className="hidden whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-400 sm:table-cell">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-slate-200">
                      {/* On phones the timestamp column is hidden and shown above the message instead. */}
                      <span className="block font-mono text-xs text-slate-500 sm:hidden">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className="break-words [overflow-wrap:anywhere]">{log.message}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={logsData.pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      {showCreateIncident && (
        <CreateIncidentModal
          errorPatternId={pattern.id}
          defaultTitle={pattern.sampleMessage}
          onClose={() => setShowCreateIncident(false)}
          onCreated={(incident) => navigate(`/incidents/${incident.id}`)}
        />
      )}
    </div>
  );
}
