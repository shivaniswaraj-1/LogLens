import { analyzeSpike, Bucket } from '../services/spikeDetection';

function makeBuckets(counts: number[]): Bucket[] {
  return counts.map((count, i) => ({ start: new Date(2026, 0, 1, i), count }));
}

describe('analyzeSpike', () => {
  it('flags a spike when observed count greatly exceeds the baseline average', () => {
    const history = makeBuckets([10, 9, 11, 10, 8, 10, 340]);
    const result = analyzeSpike(history);
    expect(result.isSpike).toBe(true);
    expect(result.reason).toBe('spike');
    expect(result.baselineAverage).toBeCloseTo(9.67, 1);
  });

  it('does not flag normal fluctuation within the multiplier', () => {
    const history = makeBuckets([10, 9, 11, 10, 8, 10, 15]);
    const result = analyzeSpike(history);
    expect(result.isSpike).toBe(false);
    expect(result.reason).toBe('normal');
  });

  it('reports insufficient_history when there are too few baseline buckets', () => {
    const history = makeBuckets([10, 340]);
    const result = analyzeSpike(history, { minBaselineBuckets: 3 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toBe('insufficient_history');
  });

  it('does not flag a spike below the minimum observed volume even with a high ratio', () => {
    const history = makeBuckets([0, 0, 0, 5]);
    const result = analyzeSpike(history, { minObservedCount: 10 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toBe('below_minimum_volume');
  });

  it('flags a spike from a zero baseline once the minimum volume is cleared', () => {
    const history = makeBuckets([0, 0, 0, 20]);
    const result = analyzeSpike(history, { minObservedCount: 10 });
    expect(result.isSpike).toBe(true);
    expect(result.ratio).toBeNull();
  });

  it('respects a custom multiplier', () => {
    const history = makeBuckets([10, 10, 10, 25]);
    expect(analyzeSpike(history, { multiplier: 3 }).isSpike).toBe(false);
    expect(analyzeSpike(history, { multiplier: 2 }).isSpike).toBe(true);
  });

  it('throws when given no history', () => {
    expect(() => analyzeSpike([])).toThrow();
  });

  it('treats observed exactly at (baseline * multiplier) as a spike (boundary is inclusive)', () => {
    // baseline average 10, multiplier 3 -> threshold is exactly 30.
    const history = makeBuckets([10, 10, 10, 30]);
    const result = analyzeSpike(history, { multiplier: 3, minObservedCount: 1 });
    expect(result.ratio).toBe(3);
    expect(result.isSpike).toBe(true);
  });

  it('treats observed exactly one below the threshold as normal', () => {
    const history = makeBuckets([10, 10, 10, 29]);
    const result = analyzeSpike(history, { multiplier: 3, minObservedCount: 1 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toBe('normal');
  });

  it('treats observed exactly at minObservedCount as clearing the volume floor', () => {
    const history = makeBuckets([0, 0, 0, 10]);
    const result = analyzeSpike(history, { minObservedCount: 10 });
    expect(result.reason).not.toBe('below_minimum_volume');
  });

  it('treats observed exactly one below minObservedCount as below the volume floor', () => {
    const history = makeBuckets([0, 0, 0, 9]);
    const result = analyzeSpike(history, { minObservedCount: 10 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toBe('below_minimum_volume');
  });

  it('treats exactly minBaselineBuckets of history as sufficient', () => {
    const history = makeBuckets([10, 10, 10, 340]);
    const result = analyzeSpike(history, { minBaselineBuckets: 3 });
    expect(result.reason).not.toBe('insufficient_history');
  });

  it('handles a very large spike without producing Infinity or NaN', () => {
    const history = makeBuckets([1, 1, 1, 1, 1, 100_000]);
    const result = analyzeSpike(history);
    expect(result.isSpike).toBe(true);
    expect(Number.isFinite(result.ratio)).toBe(true);
    expect(result.ratio).toBeCloseTo(100_000, 0);
  });
});
