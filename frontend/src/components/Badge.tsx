import type { IncidentSeverity, IncidentStatus, LogLevel } from '../api/types';

const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'bg-slate-700 text-slate-200',
  INFO: 'bg-sky-900 text-sky-200',
  WARN: 'bg-amber-900 text-amber-200',
  ERROR: 'bg-red-900 text-red-200',
  FATAL: 'bg-red-950 text-red-100 ring-1 ring-red-500',
};

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  LOW: 'bg-slate-700 text-slate-200',
  MEDIUM: 'bg-amber-900 text-amber-200',
  HIGH: 'bg-orange-900 text-orange-200',
  CRITICAL: 'bg-red-900 text-red-100 ring-1 ring-red-500',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-900 text-red-200',
  INVESTIGATING: 'bg-amber-900 text-amber-200',
  MITIGATED: 'bg-sky-900 text-sky-200',
  RESOLVED: 'bg-emerald-900 text-emerald-200',
};

function BaseBadge({ className, children }: { className: string; children: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: LogLevel }) {
  return <BaseBadge className={LEVEL_STYLES[level]}>{level}</BaseBadge>;
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return <BaseBadge className={SEVERITY_STYLES[severity]}>{severity}</BaseBadge>;
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <BaseBadge className={STATUS_STYLES[status]}>{status}</BaseBadge>;
}
