import type { ExerciseThresholds, MovementPhase } from '@/types/movement';
import { clamp } from '@/biomechanics/vectorMath';

export interface RepDetectorState {
  phase: MovementPhase;
  reps: number;
  lastRepAt: number;
  maxAngleThisRep: number;
  minAngleThisRep: number;
  angleSum: number;
  angleCount: number;
  maxAngleEver: number;
  minAngleEver: number;
}

export function createRepDetectorState(): RepDetectorState {
  return {
    phase: 'RESTING',
    reps: 0,
    lastRepAt: 0,
    maxAngleThisRep: -Infinity,
    minAngleThisRep: Infinity,
    angleSum: 0,
    angleCount: 0,
    maxAngleEver: -Infinity,
    minAngleEver: Infinity,
  };
}

export interface CompletedRepMeasurement {
  repNumber: number;
  peakAngle: number;
  minimumAngle: number;
}

export interface RepDetectorResult {
  phase: MovementPhase;
  reps: number;
  repJustCompleted: boolean;
  completedRep: CompletedRepMeasurement | null;
  state: RepDetectorState;
}

/**
 * State machine for repetition detection.
 *
 * Phases: RESTING -> RAISING -> PEAK -> LOWERING -> (back to RESTING, rep++)
 *
 * Transitions driven by thresholds. A rep is only counted when the
 * movement clearly passed the activation angle AND clearly returned
 * below the return angle, with a cooldown between reps.
 *
 * Missing/invalid angle (NaN) values do not advance the state machine.
 */
export function updateRepDetector(
  prev: RepDetectorState,
  angle: number,
  nowMs: number,
  thresholds: ExerciseThresholds
): RepDetectorResult {
  const state: RepDetectorState = { ...prev };
  let repJustCompleted = false;
  let completedRep: CompletedRepMeasurement | null = null;

  if (!Number.isFinite(angle)) {
    return { phase: state.phase, reps: state.reps, repJustCompleted, completedRep, state };
  }

  // Track min/max
  state.maxAngleThisRep = Math.max(state.maxAngleThisRep, angle);
  state.minAngleThisRep = Math.min(state.minAngleThisRep, angle);
  state.angleSum += angle;
  state.angleCount += 1;
  state.maxAngleEver = Math.max(state.maxAngleEver, angle);
  state.minAngleEver = Math.min(state.minAngleEver, angle);

  switch (state.phase) {
    case 'RESTING':
      if (angle >= thresholds.activationAngle) {
        state.phase = 'RAISING';
        state.maxAngleThisRep = angle;
        state.minAngleThisRep = angle;
      }
      break;
    case 'RAISING':
      // Once past activation + a little more, consider at peak when it starts dropping.
      if (angle >= thresholds.activationAngle + 5) {
        state.phase = 'PEAK';
      }
      break;
    case 'PEAK':
      if (angle < state.maxAngleThisRep - 4) {
        state.phase = 'LOWERING';
      } else {
        state.maxAngleThisRep = Math.max(state.maxAngleThisRep, angle);
      }
      break;
    case 'LOWERING':
      if (angle <= thresholds.returnAngle) {
        // Cooldown check
        if (nowMs - state.lastRepAt >= thresholds.cooldownMs) {
          state.reps += 1;
          state.lastRepAt = nowMs;
          repJustCompleted = true;
          completedRep = {
            repNumber: state.reps,
            peakAngle: Number.isFinite(state.maxAngleThisRep) ? state.maxAngleThisRep : angle,
            minimumAngle: Number.isFinite(state.minAngleThisRep) ? state.minAngleThisRep : angle,
          };
          state.phase = 'COMPLETED';
        } else {
          state.phase = 'RESTING';
        }
        state.maxAngleThisRep = -Infinity;
        state.minAngleThisRep = Infinity;
      }
      break;
    case 'COMPLETED':
      // Briefly show completed, then settle to resting.
      state.phase = 'RESTING';
      break;
  }

  return { phase: state.phase, reps: state.reps, repJustCompleted, completedRep, state };
}

export function averageAngle(state: RepDetectorState): number {
  if (state.angleCount === 0) return 0;
  return clamp(state.angleSum / state.angleCount, 0, 180);
}

export function maxAngle(state: RepDetectorState): number {
  return Number.isFinite(state.maxAngleEver) ? state.maxAngleEver : 0;
}

export function minAngle(state: RepDetectorState): number {
  return Number.isFinite(state.minAngleEver) ? state.minAngleEver : 0;
}
