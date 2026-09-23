/**
 * Deterministic, explainable error-spike detection.
 *
 * Approach: bucket error counts into fixed time windows (e.g. hourly).
 * The most recent, complete bucket is the "observed" value; the average of
 * the preceding N buckets is the "baseline". A spike is flagged when the
 * observed count is at least `multiplier` times the baseline AND the
 * observed count clears an absolute minimum (so 2 errors vs a baseline of 0
 * isn't reported as an infinite/meaningless spike).
 *
 * Documented limitations:
 *   - Purely reactive to volume; it has no concept of seasonality (e.g. a
 *     service that is always busier on Monday mornings will look like a
 *     "spike" every Monday).
 *   - Needs a minimum amount of history (`minBaselineBuckets`) to produce a
 *     meaningful baseline; with too little history it reports
 *     'insufficient_history' rather than guessing.
 *   - A single extreme historical outlier can inflate the baseline average
 *     and mask a real spike (no outlier trimming / median is used, by
 *     design, to keep the algorithm simple and explainable).
 */

export interface Bucket {
  start: Date;
  count: number;
}

export interface SpikeDetectionOptions {
  /** Observed must be at least this many times the baseline average. */
  multiplier?: number;
  /** Observed count below this is never flagged, regardless of ratio. */
  minObservedCount?: number;
  /** Minimum number of historical buckets required to trust the baseline. */
  minBaselineBuckets?: number;
}

export type SpikeReason = 'spike' | 'normal' | 'insufficient_history' | 'below_minimum_volume';

export interface SpikeAnalysis {
  isSpike: boolean;
  observedCount: number;
  baselineAverage: number;
  /** current / baseline; null when baseline is 0 (division not meaningful). */
  ratio: number | null;
  reason: SpikeReason;
}

const DEFAULT_OPTIONS: Required<SpikeDetectionOptions> = {
  multiplier: 3,
  minObservedCount: 10,
  minBaselineBuckets: 3,
};

/**
 * `history` must be sorted ascending by time, with the bucket being
 * evaluated as the LAST element and preceding buckets used as baseline.
 */
export function analyzeSpike(history: Bucket[], options: SpikeDetectionOptions = {}): SpikeAnalysis {
  if (history.length === 0) {
    throw new Error('analyzeSpike requires at least one bucket');
  }
  const { multiplier, minObservedCount, minBaselineBuckets } = { ...DEFAULT_OPTIONS, ...options };

  const current = history[history.length - 1];
  const baselineBuckets = history.slice(0, -1);

  if (baselineBuckets.length < minBaselineBuckets) {
    return {
      isSpike: false,
      observedCount: current.count,
      baselineAverage: 0,
      ratio: null,
      reason: 'insufficient_history',
    };
  }

  const baselineAverage =
    baselineBuckets.reduce((sum, bucket) => sum + bucket.count, 0) / baselineBuckets.length;

  const ratio = baselineAverage > 0 ? current.count / baselineAverage : null;

  if (current.count < minObservedCount) {
    return {
      isSpike: false,
      observedCount: current.count,
      baselineAverage,
      ratio,
      reason: 'below_minimum_volume',
    };
  }

  const isSpike =
    baselineAverage === 0 ? current.count >= minObservedCount : (ratio as number) >= multiplier;

  return {
    isSpike,
    observedCount: current.count,
    baselineAverage,
    ratio,
    reason: isSpike ? 'spike' : 'normal',
  };
}
