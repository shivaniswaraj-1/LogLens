export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ParsedLogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  rawLine: string;
  requestId: string | null;
  traceId: string | null;
  lineNumber: number;
}

export interface ParseFailure {
  lineNumber: number;
  rawLine: string;
  reason: string;
}

export interface ParseResult {
  entries: ParsedLogEntry[];
  failures: ParseFailure[];
  totalLines: number;
}
