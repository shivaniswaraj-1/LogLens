import { apiRequest } from './client';
import type {
  DashboardSummary,
  ErrorPattern,
  Incident,
  IncidentEvent,
  IncidentSeverity,
  IncidentStatus,
  IngestSummary,
  Log,
  LogLevel,
  PaginatedResult,
  User,
} from './types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export function login(input: LoginInput) {
  return apiRequest<{ user: User; token: string }>('/auth/login', { method: 'POST', body: input });
}

export function register(input: RegisterInput) {
  return apiRequest<{ user: User; token: string }>('/auth/register', { method: 'POST', body: input });
}

export function fetchMe() {
  return apiRequest<{ user: User }>('/auth/me');
}

export interface LogListParams {
  service?: string;
  level?: LogLevel;
  requestId?: string;
  traceId?: string;
  errorPatternId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listLogs(params: LogListParams) {
  return apiRequest<PaginatedResult<Log>>('/logs', { query: params as Record<string, string | number> });
}

export function getLog(id: string) {
  return apiRequest<{ log: Log }>(`/logs/${id}`);
}

export function listServices() {
  return apiRequest<{ services: string[] }>('/logs/services');
}

export function ingestPastedLogs(content: string, filename?: string) {
  return apiRequest<IngestSummary>('/logs/ingest', { method: 'POST', body: { content, filename } });
}

export function ingestLogFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<IngestSummary>('/logs/ingest', { method: 'POST', body: formData, isFormData: true });
}

export interface ErrorPatternListParams {
  service?: string;
  sort?: 'frequent' | 'recent';
  page?: number;
  pageSize?: number;
}

export function listErrorPatterns(params: ErrorPatternListParams) {
  return apiRequest<PaginatedResult<ErrorPattern>>('/error-patterns', {
    query: params as Record<string, string | number>,
  });
}

export function getErrorPattern(id: string) {
  return apiRequest<{ errorPattern: ErrorPattern & { incidents: Incident[] } }>(`/error-patterns/${id}`);
}

export function listLogsForPattern(id: string, page: number, pageSize: number) {
  return apiRequest<PaginatedResult<Log>>(`/error-patterns/${id}/logs`, { query: { page, pageSize } });
}

export function getDashboardSummary(hours: number) {
  return apiRequest<DashboardSummary>('/dashboard/summary', { query: { hours } });
}

export function listUsers() {
  return apiRequest<{ users: User[] }>('/users');
}

export interface IncidentListParams {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assigneeId?: string;
  errorPatternId?: string;
  page?: number;
  pageSize?: number;
}

export function listIncidents(params: IncidentListParams) {
  return apiRequest<PaginatedResult<Incident>>('/incidents', {
    query: params as Record<string, string | number>,
  });
}

export function getIncident(id: string) {
  return apiRequest<{ incident: Incident }>(`/incidents/${id}`);
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity: IncidentSeverity;
  errorPatternId?: string;
  assigneeId?: string;
}

export function createIncident(input: CreateIncidentInput) {
  return apiRequest<{ incident: Incident }>('/incidents', { method: 'POST', body: input });
}

export function updateIncidentStatus(id: string, status: IncidentStatus, note?: string) {
  return apiRequest<{ incident: Incident }>(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: { status, note },
  });
}

export function assignIncident(id: string, assigneeId: string | null) {
  return apiRequest<{ incident: Incident }>(`/incidents/${id}/assign`, {
    method: 'PATCH',
    body: { assigneeId },
  });
}

export function addIncidentNote(id: string, note: string, type: 'investigation' | 'resolution') {
  return apiRequest<{ incident: Incident }>(`/incidents/${id}/notes`, {
    method: 'POST',
    body: { note, type },
  });
}

export function listIncidentEvents(id: string) {
  return apiRequest<{ items: IncidentEvent[] }>(`/incidents/${id}/events`);
}
