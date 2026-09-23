/**
 * Deterministic error message normalization used to group similar errors
 * into a single ErrorPattern. This is NOT machine learning / AI — it is a
 * fixed sequence of regex substitutions that replaces variable parts of a
 * message (numbers, ids, ip addresses, emails) with placeholder tokens so
 * that structurally identical messages collapse to the same signature.
 *
 * Example:
 *   "Connection timeout for user 123"  -> "connection timeout for user <NUM>"
 *   "Connection timeout for user 456"  -> "connection timeout for user <NUM>"
 * Both normalize to the same signature and are therefore grouped together.
 *
 * Limitations (documented, not hidden):
 *   - Purely syntactic: two messages with the same shape but different
 *     meaning (e.g. different static words) will NOT be grouped.
 *   - Free-text portions that vary in wording won't collapse (e.g.
 *     "failed to connect" vs "could not connect" are different patterns).
 *   - Numeric IDs embedded without whitespace/word boundaries (e.g.
 *     "user123") are not replaced, by design, to avoid over-collapsing
 *     legitimate distinct words.
 */

const EMAIL_PATTERN = /\b[\w.-]+@[\w.-]+\.\w+\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const IPV4_PATTERN = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const LONG_HEX_PATTERN = /\b[0-9a-f]{12,}\b/gi;
const NUMBER_PATTERN = /\b\d+\b/g;
const QUOTED_PATTERN = /"[^"]*"|'[^']*'/g;
const WHITESPACE_PATTERN = /\s+/g;

export function normalizeMessage(message: string): string {
  let normalized = message.toLowerCase();
  normalized = normalized.replace(EMAIL_PATTERN, '<email>');
  normalized = normalized.replace(UUID_PATTERN, '<uuid>');
  normalized = normalized.replace(IPV4_PATTERN, '<ip>');
  normalized = normalized.replace(LONG_HEX_PATTERN, '<hex>');
  normalized = normalized.replace(QUOTED_PATTERN, '<value>');
  normalized = normalized.replace(NUMBER_PATTERN, '<num>');
  normalized = normalized.replace(WHITESPACE_PATTERN, ' ').trim();
  return normalized;
}

/**
 * The unique key used to look up / create an ErrorPattern. Scoped per
 * service, because the same message shape in two different services
 * usually represents unrelated incidents with different owners.
 */
export function buildPatternSignature(service: string, message: string): string {
  return `${service}::${normalizeMessage(message)}`;
}

/** Human-readable label derived from a normalized signature, for display. */
export function signatureToLabel(signature: string): string {
  const normalized = signature.includes('::') ? signature.split('::').slice(1).join('::') : signature;
  return normalized.replace(/<num>/g, 'N').replace(/<[a-z]+>/g, '*');
}
