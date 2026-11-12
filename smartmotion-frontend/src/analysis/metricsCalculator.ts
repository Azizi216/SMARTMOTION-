import type { QualityMetrics, SessionStatus } from '@/types/session';

export function summarizeQuality(
  confidences: number[],
  trackingRatio: number
): QualityMetrics {
  const valid = confidences.filter((c) => !Number.isNaN(c));
  const averageConfidence = valid.length ? valid.reduce((s, c) => s + c, 0) / valid.length : 0;
  const minConfidence = valid.length ? Math.min(...valid) : 0;
  let dataQuality: QualityMetrics['dataQuality'] = 'poor';
  if (averageConfidence >= 0.7 && trackingRatio >= 0.8) dataQuality = 'good';
  else if (averageConfidence >= 0.5 && trackingRatio >= 0.6) dataQuality = 'fair';
  return {
    averageConfidence,
    minConfidence,
    trackingReliability: trackingRatio,
    dataQuality,
  };
}

export function statusFromDuration(duration: number, ended: boolean): SessionStatus {
  if (!ended) return 'in_progress';
  return duration > 5 ? 'completed' : 'incomplete';
}
