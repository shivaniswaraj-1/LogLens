export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type IncidentEventType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'STATUS_CHANGED'
  | 'SEVERITY_CHANGED'
  | 'NOTE_ADDED';
export type UserRole = 'ADMIN' | 'ENGINEER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  rawLine: string;
  requestId: string | null;
  traceId: string | null;
  lineNumber: number | null;
  uploadBatchId: string | null;
  errorPatternId: string | null;
  createdAt: string;
}

export interface ErrorPattern {
  id: string;
  signature: string;
  sampleMessage: string;
  service: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: { logs?: number; incidents?: number };
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  type: IncidentEventType;
  message: string;
  actor: { id: string; name: string } | null;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  investigationNotes: string | null;
  resolutionNotes: string | null;
  errorPattern: ErrorPattern | null;
  errorPatternId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  assigneeId: string | null;
  createdBy: { id: string; name: string; email: string };
  createdById: string;
  createdAt: string;
  updatedAt: string;
  events?: IncidentEvent[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface IngestSummary {
  batchId: string;
  totalLines: number;
  parsedCount: number;
  skippedCount: number;
  newErrorPatterns: number;
  updatedErrorPatterns: number;
  sampleFailures: { lineNumber: number; rawLine: string; reason: string }[];
}

export interface ServiceSpike {
  service: string;
  windowStart: string;
  observedCount: number;
  baselineAverage: number;
  ratio: number | null;
}

export interface DashboardSummary {
  rangeHours: number;
  totalLogs: number;
  levelCounts: Record<LogLevel, number>;
  errorRate: number;
  topErrorPatterns: ErrorPattern[];
  errorTrend: { bucket: string; count: number }[];
  spikes: ServiceSpike[];
  activeIncidentCount: number;
  recentIncidents: Incident[];
}
