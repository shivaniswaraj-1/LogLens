import { useRef, useState } from 'react';
import { ingestLogFile, ingestPastedLogs } from '../api/endpoints';
import { ApiClientError } from '../api/client';
import type { IngestSummary } from '../api/types';

export function IngestPanel({ onIngested }: { onIngested: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSubmit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a .log or .txt file first');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await ingestLogFile(file);
      setSummary(result);
      onIngested();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasteSubmit() {
    if (!pasteContent.trim()) {
      setError('Paste some log lines first');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await ingestPastedLogs(pasteContent);
      setSummary(result);
      setPasteContent('');
      onIngested();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Ingest failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Ingest logs
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-slate-800 p-1">
          <button
            onClick={() => setMode('file')}
            className={`rounded px-3 py-1 text-sm ${mode === 'file' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Upload file
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`rounded px-3 py-1 text-sm ${mode === 'paste' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Paste text
          </button>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-sm text-slate-500 hover:text-slate-300">
          Close
        </button>
      </div>

      <div className="mt-4">
        {mode === 'file' ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".log,.txt"
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-200 hover:file:bg-slate-700"
            />
            <p className="text-xs text-slate-500">Max size 5 MB. Only .log and .txt files are accepted.</p>
            <button
              onClick={handleFileSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              rows={8}
              placeholder="2026-09-23 10:01:21 ERROR payment-service Connection timeout for user 123"
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Ingesting…' : 'Ingest'}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {summary && (
          <div className="mt-4 rounded-md border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-200">
            <p>
              Parsed {summary.parsedCount} of {summary.totalLines} lines
              {summary.skippedCount > 0 && `, skipped ${summary.skippedCount} malformed`}.
            </p>
            <p className="mt-1 text-xs text-emerald-300/80">
              {summary.newErrorPatterns} new error patterns, {summary.updatedErrorPatterns} updated.
            </p>
            {summary.sampleFailures.length > 0 && (
              <details className="mt-2 text-xs text-amber-300/80">
                <summary className="cursor-pointer">View skipped lines</summary>
                <ul className="mt-1 space-y-1 font-mono">
                  {summary.sampleFailures.map((f) => (
                    <li key={f.lineNumber}>
                      Line {f.lineNumber}: {f.rawLine}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
