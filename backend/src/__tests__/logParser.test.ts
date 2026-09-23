import { parseLine, parseLogText } from '../parsers/logParser';

describe('parseLine', () => {
  it('parses a well-formed log line', () => {
    const entry = parseLine('2026-09-23 10:01:21 ERROR payment-service Connection timeout for user 123', 1);
    expect(entry).not.toBeNull();
    expect(entry?.level).toBe('ERROR');
    expect(entry?.service).toBe('payment-service');
    expect(entry?.message).toBe('Connection timeout for user 123');
    expect(entry?.timestamp.getUTCFullYear()).toBe(2026);
  });

  it('interprets the timestamp as UTC regardless of the process timezone', () => {
    // Regression test: an earlier version passed the timestamp straight to
    // `new Date(...)` with no timezone marker, which JS interprets as the
    // process's LOCAL time. On a machine set to IST (UTC+5:30) that silently
    // shifted every stored timestamp by 5.5 hours relative to a UTC server.
    const entry = parseLine('2026-09-23 10:01:21 ERROR payment-service Connection timeout for user 123', 1);
    expect(entry?.timestamp.toISOString()).toBe('2026-09-23T10:01:21.000Z');
  });

  it('rejects calendar dates that do not exist instead of silently rolling over', () => {
    // JS's Date constructor normalizes an out-of-range day-of-month instead
    // of failing (e.g. "2026-02-30" silently becomes March 2nd), which would
    // corrupt the stored date without any indication of a parse failure.
    expect(parseLine('2026-02-30 10:00:00 ERROR svc Feb 30 does not exist', 1)).toBeNull();
    expect(parseLine('2026-04-31 10:00:00 ERROR svc April has only 30 days', 1)).toBeNull();
    expect(parseLine('2025-02-29 10:00:00 ERROR svc 2025 is not a leap year', 1)).toBeNull();
  });

  it('accepts Feb 29 in a leap year', () => {
    const entry = parseLine('2024-02-29 10:00:00 ERROR svc 2024 is a leap year', 1);
    expect(entry).not.toBeNull();
    expect(entry?.timestamp.toISOString()).toBe('2024-02-29T10:00:00.000Z');
  });

  it('normalizes WARNING to WARN and lowercase levels to uppercase', () => {
    const entry = parseLine('2026-09-23 10:01:21 warning auth-service Token about to expire', 1);
    expect(entry?.level).toBe('WARN');
  });

  it('accepts a T separator and milliseconds', () => {
    const entry = parseLine('2026-09-23T10:01:21.123 INFO api-gateway Request handled', 1);
    expect(entry).not.toBeNull();
    expect(entry?.message).toBe('Request handled');
  });

  it('extracts requestId and traceId from the message', () => {
    const entry = parseLine(
      '2026-09-23 10:01:21 ERROR checkout-service Payment failed requestId=abc-123 traceId=trace-456',
      1,
    );
    expect(entry?.requestId).toBe('abc-123');
    expect(entry?.traceId).toBe('trace-456');
  });

  it('returns null for a line with an unrecognized level', () => {
    const entry = parseLine('2026-09-23 10:01:21 VERBOSE payment-service Something happened', 1);
    expect(entry).toBeNull();
  });

  it('returns null for a line with a malformed timestamp', () => {
    const entry = parseLine('23-09-2026 ERROR payment-service Bad date format', 1);
    expect(entry).toBeNull();
  });

  it('returns null for a completely unstructured line', () => {
    const entry = parseLine('this is not a log line at all', 1);
    expect(entry).toBeNull();
  });
});

describe('parseLogText', () => {
  it('parses multiple valid lines and reports counts', () => {
    const text = [
      '2026-09-23 10:00:00 INFO api-gateway Request received',
      '2026-09-23 10:00:01 ERROR payment-service Connection timeout for user 123',
      '2026-09-23 10:00:02 ERROR payment-service Connection timeout for user 456',
    ].join('\n');

    const result = parseLogText(text);
    expect(result.totalLines).toBe(3);
    expect(result.entries).toHaveLength(3);
    expect(result.failures).toHaveLength(0);
  });

  it('skips blank lines without counting them as failures', () => {
    const text = '2026-09-23 10:00:00 INFO api-gateway Request received\n\n\n';
    const result = parseLogText(text);
    expect(result.totalLines).toBe(1);
    expect(result.failures).toHaveLength(0);
  });

  it('safely captures malformed lines as failures instead of throwing', () => {
    const text = [
      '2026-09-23 10:00:00 INFO api-gateway Request received',
      'garbage line that does not match the format',
      '2026-09-23 10:00:02 ERROR payment-service Timeout',
    ].join('\n');

    const result = parseLogText(text);
    expect(result.totalLines).toBe(3);
    expect(result.entries).toHaveLength(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].lineNumber).toBe(2);
    expect(result.failures[0].reason).toContain('does not match');
  });

  it('handles CRLF line endings', () => {
    const text = '2026-09-23 10:00:00 INFO api-gateway Line one\r\n2026-09-23 10:00:01 INFO api-gateway Line two\r\n';
    const result = parseLogText(text);
    expect(result.entries).toHaveLength(2);
  });
});
