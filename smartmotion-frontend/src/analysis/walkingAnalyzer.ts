import type { ArmSide, Landmark3D, Landmarks, StepEvent, WalkingLiveState } from '@/types/movement';
import { getLandmark, POSE_INDEX } from '@/biomechanics/angleCalculator';
import { kneeFlexionAngle } from '@/biomechanics/shoulderAnalysis';
import { exponentialSmoothing, findPeaks } from './signalSmoothing';

export interface WalkingAnalyzerOptions {
  minStepIntervalMs: number; // minimum time between consecutive steps on the same side
  minAnkleProminence: number; // minimum vertical ankle travel to count as a step (normalized coords)
  smoothing: number;
}

export const DEFAULT_WALKING_OPTIONS: WalkingAnalyzerOptions = {
  minStepIntervalMs: 250,
  minAnkleProminence: 0.015,
  smoothing: 0.4,
};

export interface WalkingAnalyzerState {
  leftAnkleHistory: number[];
  rightAnkleHistory: number[];
  timestamps: number[];
  steps: StepEvent[];
  leftSteps: number;
  rightSteps: number;
  startTime: number;
}

export function createWalkingAnalyzerState(): WalkingAnalyzerState {
  return {
    leftAnkleHistory: [],
    rightAnkleHistory: [],
    timestamps: [],
    steps: [],
    leftSteps: 0,
    rightSteps: 0,
    startTime: 0,
  };
}

function ankleY(l: Landmark3D | undefined): number {
  if (!l) return NaN;
  return l.y;
}

/**
 * Update the walking analyzer with one frame of landmarks.
 * Returns the live walking state and whether a new step was detected.
 */
export function updateWalking(
  prev: WalkingAnalyzerState,
  landmarks: Landmarks | null,
  nowMs: number,
  opts = DEFAULT_WALKING_OPTIONS
): { state: WalkingAnalyzerState; live: WalkingLiveState; newStep: StepEvent | null } {
  const state: WalkingAnalyzerState = { ...prev };
  state.leftAnkleHistory = [...prev.leftAnkleHistory];
  state.rightAnkleHistory = [...prev.rightAnkleHistory];
  state.timestamps = [...prev.timestamps];
  state.steps = [...prev.steps];

  if (state.startTime === 0) state.startTime = nowMs;

  const leftAnkle = getLandmark(landmarks, POSE_INDEX.leftAnkle);
  const rightAnkle = getLandmark(landmarks, POSE_INDEX.rightAnkle);
  const ly = ankleY(leftAnkle);
  const ry = ankleY(rightAnkle);

  state.leftAnkleHistory.push(ly);
  state.rightAnkleHistory.push(ry);
  state.timestamps.push(nowMs);

  // Keep a rolling window to limit memory.
  const MAX = 600;
  if (state.leftAnkleHistory.length > MAX) {
    state.leftAnkleHistory.shift();
    state.rightAnkleHistory.shift();
    state.timestamps.shift();
  }

  // Smooth the ankle trajectories
  const leftSmoothed = exponentialSmoothing(state.leftAnkleHistory, opts.smoothing);
  const rightSmoothed = exponentialSmoothing(state.rightAnkleHistory, opts.smoothing);

  // Detect peaks in each ankle. A peak (local max in y, i.e. the foot lifts up
  // because y grows downward, so we invert: we detect minima as lift events).
  const leftLifts = findLifts(leftSmoothed, state.timestamps, opts);
  const rightLifts = findLifts(rightSmoothed, state.timestamps, opts);

  // Merge new steps that weren't already counted (by timestamp).
  let newStep: StepEvent | null = null;
  const knownTimes = new Set(state.steps.map((s) => s.t));
  for (const t of leftLifts) {
    if (!knownTimes.has(t)) {
      state.steps.push({ t, side: 'left' });
      state.leftSteps += 1;
      if (!newStep) newStep = { t, side: 'left' };
    }
  }
  for (const t of rightLifts) {
    if (!knownTimes.has(t)) {
      state.steps.push({ t, side: 'right' });
      state.rightSteps += 1;
      if (!newStep) newStep = { t, side: 'right' };
    }
  }
  state.steps.sort((a, b) => a.t - b.t);

  const totalSteps = state.leftSteps + state.rightSteps;
  const durationMs = nowMs - state.startTime;
  const cadence = durationMs > 0 ? (totalSteps / durationMs) * 60000 : 0;

  // Knee angle (current sample)
  const leftKnee = kneeFlexionAngle(landmarks, 'left');
  const rightKnee = kneeFlexionAngle(landmarks, 'right');
  const kneeAngle = leftKnee.valid && !Number.isNaN(leftKnee.angle)
    ? leftKnee.angle
    : rightKnee.valid && !Number.isNaN(rightKnee.angle)
      ? rightKnee.angle
      : NaN;

  const live: WalkingLiveState = {
    totalSteps,
    leftSteps: state.leftSteps,
    rightSteps: state.rightSteps,
    cadence,
    kneeAngle,
    leftAnkleY: ly,
    rightAnkleY: ry,
    steps: state.steps.slice(-200),
    samples: state.timestamps.map((t, i) => ({
      t,
      angle: leftSmoothed[i] ?? 0,
      confidence: 1,
      phase: 'RESTING',
    })),
  };

  return { state, live, newStep };
}

function findLifts(values: number[], times: number[], opts: WalkingAnalyzerOptions): number[] {
  if (values.length < 5) return [];
  // Lifts = local minima (ankle moves up => y decreases).
  // Find minima by inverting the array and reusing findPeaks.
  const inverted = values.map((v) => (Number.isNaN(v) ? NaN : -v));
  const peakIdx = findPeaks(inverted, {
    minDistance: Math.max(1, Math.round(opts.minStepIntervalMs / 60)),
    minProminence: -opts.minAnkleProminence,
  });
  const lifts: number[] = [];
  for (const idx of peakIdx) {
    if (idx < 1 || idx >= values.length) continue;
    // Prominence: difference between the lift and the recent baseline.
    const recent = values.slice(Math.max(0, idx - 8), idx);
    const baseline = Math.max(...recent.filter((v) => !Number.isNaN(v)));
    const lift = values[idx];
    if (!Number.isNaN(lift) && !Number.isNaN(baseline) && baseline - lift >= opts.minAnkleProminence) {
      lifts.push(times[idx]);
    }
  }
  // Enforce min interval between consecutive lifts on the same side.
  const filtered: number[] = [];
  for (const t of lifts.sort((a, b) => a - b)) {
    if (filtered.length === 0 || t - filtered[filtered.length - 1] >= opts.minStepIntervalMs) {
      filtered.push(t);
    }
  }
  return filtered;
}

/**
 * Walking consistency: how even the step intervals are. 0..1.
 */
export function walkingConsistency(steps: StepEvent[]): number {
  if (steps.length < 3) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < steps.length; i++) {
    intervals.push(steps[i].t - steps[i - 1].t);
  }
  const m = intervals.reduce((s, n) => s + n, 0) / intervals.length;
  if (m === 0) return 0;
  const variance = intervals.reduce((s, n) => s + (n - m) ** 2, 0) / intervals.length;
  const sd = Math.sqrt(variance);
  const cv = sd / m; // coefficient of variation
  return Math.max(0, Math.min(1, 1 - cv));
}

/**
 * Knee-angle range over a sequence.
 */
export function kneeAngleRange(angles: number[]): number {
  const valid = angles.filter((a) => !Number.isNaN(a));
  if (valid.length === 0) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

export function sideLabel(side: ArmSide): string {
  return side === 'left' ? 'Left' : 'Right';
}
