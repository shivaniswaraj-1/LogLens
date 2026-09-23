import { LogLevel, ParseFailure, ParseResult, ParsedLogEntry } from '../types/log';

/**
 * LogLens Log Format v1
 * ----------------------
 * <timestamp> <LEVEL> <service> <message>
 *
 *   timestamp : YYYY-MM-DD HH:mm:ss  (optional .SSS milliseconds, 'T' separator allowed)
 *               always interpreted as UTC, regardless of the server's local
 *               timezone (the format has no offset marker, so treating it as
 *               anything server-dependent would make the same log file
 *               produce different stored instants on different deployments)
 *   LEVEL     : DEBUG | INFO | WARN | WARNING | ERROR | FATAL (case-insensitive)
 *   service   : single whitespace-free token, e.g. payment-service
 *   message   : free text, rest of the line
 *
 * Example:
 *   2026-09-23 10:01:21 ERROR payment-service Connection timeout for user 123
 *
 * A requestId / traceId embedded in the message as `requestId=<token>` or
 * `traceId=<token>` (also accepts reqId=, request_id=, trace_id=, case-insensitive)
 * is extracted automatically; the message text itself is left untouched.
 */

const LINE_PATTERN =
  /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s+(DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+(\S+)\s+(.*)$/i;

const TIMESTAMP_COMPONENT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;

const REQUEST_ID_PATTERN = /\b(?:requestId|reqId|request_id)[=:]\s*([A-Za-z0-9._-]+)/i;
const TRACE_ID_PATTERN = /\b(?:traceId|trace_id)[=:]\s*([A-Za-z0-9._-]+)/i;

const MAX_MESSAGE_LENGTH = 4000;

function normalizeLevel(raw: string): LogLevel {
  const upper = raw.toUpperCase();
  return upper === 'WARNING' ? 'WARN' : (upper as LogLevel);
}

function extractToken(message: string, pattern: RegExp): string | null {
  const match = message.match(pattern);
  return match ? match[1] : null;
}

/**
 * Parses a timestamp as UTC and rejects calendar dates that don't actually
 * exist (e.g. "2026-02-30"). JS's Date constructor silently *rolls over*
 * an out-of-range day-of-month into the next month instead of failing
 * (e.g. "2026-02-30" becomes March 2nd) — without this round-trip check, a
 * corrupted timestamp would be silently ingested under the wrong date
 * rather than being reported as a parse failure.
 */
function parseTimestamp(raw: string): Date | null {
  const match = raw.match(TIMESTAMP_COMPONENT_PATTERN);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, millis] = match;

  const isoUtc = `${year}-${month}-${day}T${hour}:${minute}:${second}.${(millis ?? '0').padEnd(3, '0')}Z`;
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return null;

  const rolledOver =
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day);
  if (rolledOver) return null;

  return date;
}

/**
 * Parses a single log line. Returns null if the line does not match the
 * documented format (caller records this as a parse failure).
 */
export function parseLine(rawLine: string, lineNumber: number): ParsedLogEntry | null {
  const trimmed = rawLine.trimEnd();
  const match = trimmed.match(LINE_PATTERN);
  if (!match) return null;

  const [, timestampRaw, levelRaw, service, messageRaw] = match;
  const timestamp = parseTimestamp(timestampRaw);
  if (!timestamp) return null;

  const message = messageRaw.slice(0, MAX_MESSAGE_LENGTH).trim();
  if (message.length === 0) return null;

  return {
    timestamp,
    level: normalizeLevel(levelRaw),
    service,
    message,
    rawLine: trimmed.slice(0, MAX_MESSAGE_LENGTH),
    requestId: extractToken(message, REQUEST_ID_PATTERN),
    traceId: extractToken(message, TRACE_ID_PATTERN),
    lineNumber,
  };
}

/**
 * Parses a full log payload (file contents or pasted text) line by line.
 * Blank lines are silently skipped (not counted as failures). Any line that
 * doesn't match the documented format is safely captured as a failure with
 * a reason instead of throwing or corrupting the batch.
 */
export function parseLogText(text: string): ParseResult {
  const lines = text.split(/\r\n|\r|\n/);
  const entries: ParsedLogEntry[] = [];
  const failures: ParseFailure[] = [];
  let totalLines = 0;

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;
    totalLines += 1;
    const lineNumber = index + 1;
    const entry = parseLine(rawLine, lineNumber);
    if (entry) {
      entries.push(entry);
    } else {
      failures.push({
        lineNumber,
        rawLine: rawLine.slice(0, MAX_MESSAGE_LENGTH),
        reason: 'Line does not match expected format: "YYYY-MM-DD HH:mm:ss LEVEL service message"',
      });
    }
  });

  return { entries, failures, totalLines };
}
