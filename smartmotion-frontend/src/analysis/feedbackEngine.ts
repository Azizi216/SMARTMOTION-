import type { ExerciseThresholds, FeedbackMessage, MovementPhase } from '@/types/movement';

let feedbackCounter = 0;
function nextId(): string {
  feedbackCounter += 1;
  return `fb-${feedbackCounter}-${Date.now()}`;
}

export function makeFeedback(level: FeedbackMessage['level'], text: string): FeedbackMessage {
  return { id: nextId(), level, text, timestamp: Date.now() };
}

/**
 * Rule-based feedback engine. Produces understandable, non-diagnostic messages.
 * Never claims medical correctness.
 */
export interface FeedbackContext {
  phase: MovementPhase;
  angle: number;
  confidence: number;
  valid: boolean;
  thresholds: ExerciseThresholds;
  repJustCompleted: boolean;
  frameVisible: boolean;
}

export function evaluateFeedback(ctx: FeedbackContext): FeedbackMessage | null {
  if (!ctx.frameVisible) {
    return makeFeedback('warning', 'Please move fully into the camera frame.');
  }
  if (!ctx.valid || Number.isNaN(ctx.angle)) {
    return makeFeedback('warning', 'A required body landmark is not visible. Adjust your position or camera.');
  }
  if (ctx.confidence < ctx.thresholds.minConfidence) {
    return makeFeedback('warning', 'The movement signal is unstable — landmark confidence is low.');
  }
  if (ctx.repJustCompleted) {
    return makeFeedback('success', 'Repetition completed. Nice work.');
  }
  if (ctx.phase === 'PEAK') {
    if (ctx.angle >= ctx.thresholds.targetAngle && ctx.thresholds.targetAngle > 0) {
      return makeFeedback('info', 'Target range reached. Lower slowly.');
    }
    return makeFeedback('info', 'Peak reached. Lower back to the starting position.');
  }
  if (ctx.phase === 'RAISING') {
    return makeFeedback('info', 'Movement detected. Keep going.');
  }
  if (ctx.phase === 'RESTING') {
    return makeFeedback('info', 'Ready. Begin when comfortable.');
  }
  return null;
}
