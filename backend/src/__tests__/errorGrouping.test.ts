import { buildPatternSignature, normalizeMessage, signatureToLabel } from '../services/errorGrouping';

describe('normalizeMessage', () => {
  it('collapses numeric ids into a single placeholder', () => {
    const a = normalizeMessage('Connection timeout for user 123');
    const b = normalizeMessage('Connection timeout for user 456');
    expect(a).toBe(b);
    expect(a).toBe('connection timeout for user <num>');
  });

  it('collapses email addresses', () => {
    const a = normalizeMessage('Failed to send email to alice@example.com');
    const b = normalizeMessage('Failed to send email to bob@example.org');
    expect(a).toBe(b);
  });

  it('collapses UUIDs', () => {
    const a = normalizeMessage('Order 550e8400-e29b-41d4-a716-446655440000 failed');
    const b = normalizeMessage('Order 550e8400-e29b-41d4-a716-446655440001 failed');
    expect(a).toBe(b);
  });

  it('collapses IPv4 addresses', () => {
    const a = normalizeMessage('Rejected connection from 192.168.1.10');
    const b = normalizeMessage('Rejected connection from 10.0.0.5');
    expect(a).toBe(b);
  });

  it('does not collapse messages with different static wording', () => {
    const a = normalizeMessage('Connection timeout for user 123');
    const b = normalizeMessage('Connection refused for user 123');
    expect(a).not.toBe(b);
  });

  it('is case-insensitive', () => {
    expect(normalizeMessage('Connection Timeout')).toBe(normalizeMessage('connection timeout'));
  });
});

describe('buildPatternSignature', () => {
  it('scopes the same message shape separately per service', () => {
    const a = buildPatternSignature('payment-service', 'Connection timeout for user 123');
    const b = buildPatternSignature('auth-service', 'Connection timeout for user 456');
    expect(a).not.toBe(b);
  });

  it('groups the same message shape within the same service', () => {
    const a = buildPatternSignature('payment-service', 'Connection timeout for user 123');
    const b = buildPatternSignature('payment-service', 'Connection timeout for user 456');
    expect(a).toBe(b);
  });
});

describe('signatureToLabel', () => {
  it('produces a readable label from a normalized signature', () => {
    const signature = buildPatternSignature('payment-service', 'Connection timeout for user 123');
    expect(signatureToLabel(signature)).toBe('connection timeout for user N');
  });
});
