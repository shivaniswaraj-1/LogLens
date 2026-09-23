import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addIncidentNote,
  assignIncident,
  getIncident,
  listUsers,
  updateIncidentStatus,
} from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, Spinner } from '../components/StatusViews';
import { SeverityBadge, StatusBadge } from '../components/Badge';
import { ApiClientError } from '../api/client';
import type { IncidentStatus } from '../api/types';

const STATUSES: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'];

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Incident created',
  ASSIGNED: 'Assigned',
  UNASSIGNED: 'Unassigned',
  STATUS_CHANGED: 'Status changed',
  SEVERITY_CHANGED: 'Severity changed',
  NOTE_ADDED: 'Note added',
};

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'investigation' | 'resolution'>('investigation');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const { data, error, isLoading, reload } = useAsync(() => getIncident(id!), [id]);
  const { data: usersData } = useAsync(() => listUsers(), []);

  if (isLoading && !data) return <Spinner label="Loading incident…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const incident = data.incident;

  async function handleStatusChange(status: IncidentStatus) {
    setActionError(null);
    try {
      await updateIncidentStatus(id!, status);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to update status');
    }
  }

  async function handleAssign(assigneeId: string) {
    setActionError(null);
    try {
      await assignIncident(id!, assigneeId || null);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to assign incident');
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    setActionError(null);
    try {
      await addIncidentNote(id!, noteText, noteType);
      setNoteText('');
      reload();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to add note');
    } finally {
      setIsSubmittingNote(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/incidents" className="text-sm text-slate-500 hover:text-slate-300">
        &larr; Back to incidents
      </Link>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">{incident.title}</h1>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{incident.description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {incident.errorPattern && (
          <p className="mt-4 text-sm text-slate-500">
            Related pattern:{' '}
            <Link to={`/error-patterns/${incident.errorPattern.id}`} className="text-sky-400 hover:underline">
              {incident.errorPattern.sampleMessage}
            </Link>
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="incident-status" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              id="incident-status"
              value={incident.status}
              onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="incident-detail-assignee" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Assignee
            </label>
            <select
              id="incident-detail-assignee"
              value={incident.assigneeId ?? ''}
              onChange={(e) => handleAssign(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Unassigned</option>
              {usersData?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

        {(incident.investigationNotes || incident.resolutionNotes) && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {incident.investigationNotes && (
              <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Investigation notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{incident.investigationNotes}</p>
              </div>
            )}
            {incident.resolutionNotes && (
              <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resolution notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{incident.resolutionNotes}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAddNote} className="mt-6 space-y-2">
          <label htmlFor="incident-note-text" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Add note
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Note type"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as 'investigation' | 'resolution')}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="investigation">Investigation</option>
              <option value="resolution">Resolution</option>
            </select>
            <input
              id="incident-note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={isSubmittingNote}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-300">Activity timeline</h2>
        <ol className="space-y-3 border-l border-slate-800 pl-4">
          {incident.events?.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-sky-500" />
              <p className="text-sm text-slate-200">
                {EVENT_LABELS[event.type] ?? event.type}
                {event.actor && <span className="text-slate-500"> &middot; {event.actor.name}</span>}
              </p>
              <p className="text-xs text-slate-500">{event.message}</p>
              <p className="text-xs text-slate-600">{new Date(event.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
