import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listIncidents } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import type { IncidentSeverity, IncidentStatus } from '../api/types';
import { SeverityBadge, StatusBadge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Spinner } from '../components/StatusViews';
import { CreateIncidentModal } from '../components/CreateIncidentModal';

const STATUSES: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'];
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function IncidentsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, error, isLoading, reload } = useAsync(
    () => listIncidents({ status: status || undefined, severity: severity || undefined, page, pageSize: 20 }),
    [status, severity, page],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Incidents</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          New incident
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as IncidentStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by severity"
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as IncidentSeverity | '');
            setPage(1);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState title="No incidents found" description="Create one from an error pattern or manually." />
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Assignee</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((incident) => (
                <tr key={incident.id} className="hover:bg-slate-900/40">
                  <td className="max-w-sm truncate px-4 py-2">
                    <Link to={`/incidents/${incident.id}`} className="text-slate-200 hover:text-sky-400 hover:underline">
                      {incident.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-400">{incident.assignee?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                    {new Date(incident.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </div>
      )}

      {showCreate && (
        <CreateIncidentModal
          onClose={() => setShowCreate(false)}
          onCreated={(incident) => navigate(`/incidents/${incident.id}`)}
        />
      )}
    </div>
  );
}
