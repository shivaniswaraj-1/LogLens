import { useState } from 'react';
import type { FormEvent } from 'react';
import { createIncident } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { listUsers } from '../api/endpoints';
import { ApiClientError } from '../api/client';
import type { Incident, IncidentSeverity } from '../api/types';

const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function CreateIncidentModal({
  errorPatternId,
  defaultTitle,
  onClose,
  onCreated,
}: {
  errorPatternId?: string;
  defaultTitle?: string;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}) {
  const [title, setTitle] = useState(defaultTitle ?? '');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: usersData } = useAsync(() => listUsers(), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createIncident({
        title,
        description,
        severity,
        errorPatternId,
        assigneeId: assigneeId || undefined,
      });
      onCreated(result.incident);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">New incident</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="incident-title" className="block text-xs font-medium text-slate-400">
              Title
            </label>
            <input
              id="incident-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="incident-description" className="block text-xs font-medium text-slate-400">
              Description
            </label>
            <textarea
              id="incident-description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="incident-severity" className="block text-xs font-medium text-slate-400">
                Severity
              </label>
              <select
                id="incident-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="incident-assignee" className="block text-xs font-medium text-slate-400">
                Assignee
              </label>
              <select
                id="incident-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
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
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
