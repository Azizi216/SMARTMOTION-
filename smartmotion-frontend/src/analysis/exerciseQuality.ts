import type { ExerciseType } from '@/types/movement';

export type RepQualityStatus = 'target_met' | 'below_target' | 'not_assessable';

const EXERCISE_ROM_CRITERIA: Partial<Record<ExerciseType, { criterion: string; measurement: string }>> = {
  m01: { criterion: 'deep_squat_knee_rom', measurement: 'Selected-side knee flexion range' },
  m02: { criterion: 'hurdle_step_hip_rom', measurement: 'Selected-side hip flexion proxy' },
  m03: { criterion: 'inline_lunge_knee_rom', measurement: 'Selected-side knee flexion range' },
  m04: { criterion: 'side_lunge_knee_rom', measurement: 'Selected-side knee flexion range' },
  m05: { criterion: 'sit_to_stand_knee_rom', measurement: 'Selected-side knee flexion range' },
  m06: { criterion: 'standing_leg_raise_hip_rom', measurement: 'Selected-side hip flexion proxy' },
  m07: { criterion: 'shoulder_abduction_rom', measurement: 'Selected-side shoulder elevation/abduction proxy' },
};

export interface RepetitionAssessment {
  repNumber: number;
  peakAngle: number;
  minimumAngle: number;
  targetAngle: number | null;
  status: RepQualityStatus;
  criterion: string;
  measurement: string;
  note: string;
}

/**
 * Conservative first-stage assessment. This checks only whether the measured
 * single-angle proxy reached the app's configured ROM target. It does NOT
 * determine overall exercise correctness, pain, safety, or clinical quality.
 */
export function assessCompletedRepetition(
  exercise: ExerciseType,
  repNumber: number,
  peakAngle: number,
  minimumAngle: number,
  targetAngle: number,
): RepetitionAssessment {
  const roundedPeak = Math.round(peakAngle * 10) / 10;
  const roundedMin = Math.round(minimumAngle * 10) / 10;

  if (exercise === 'm08' || exercise === 'm09') {
    return {
      repNumber, peakAngle: roundedPeak, minimumAngle: roundedMin, targetAngle: null,
      status: 'not_assessable', criterion: 'unavailable_2d_measurement', measurement: 'No reliable single-view measurement',
      note: exercise === 'm08'
        ? 'The current single-view 2D pose pipeline cannot reliably measure shoulder extension direction.'
        : 'The current single-view 2D pose pipeline cannot reliably measure axial shoulder rotation.',
    };
  }

  if (exercise === 'm10') {
    return {
      repNumber, peakAngle: roundedPeak, minimumAngle: roundedMin, targetAngle: null,
      status: 'not_assessable', criterion: 'experimental_2d_proxy', measurement: '2D shoulder-elevation proxy only',
      note: 'The current value is a 2D shoulder-elevation proxy, not a validated scaption-plane measurement.',
    };
  }

  if (!Number.isFinite(peakAngle) || !Number.isFinite(targetAngle) || targetAngle <= 0) {
    return {
      repNumber, peakAngle: roundedPeak, minimumAngle: roundedMin, targetAngle: null,
      status: 'not_assessable', criterion: 'invalid_measurement', measurement: 'Insufficient valid angle samples',
      note: 'There was not enough valid angle data to assess this repetition.',
    };
  }

  const rule = EXERCISE_ROM_CRITERIA[exercise];
  if (!rule) {
    return { repNumber, peakAngle: roundedPeak, minimumAngle: roundedMin, targetAngle: null,
      status: 'not_assessable', criterion: 'no_exercise_rule', measurement: 'No configured measurement',
      note: 'No exercise-specific range-of-motion rule is configured for this movement.' };
  }
  const met = peakAngle >= targetAngle;
  return {
    repNumber, peakAngle: roundedPeak, minimumAngle: roundedMin, targetAngle,
    status: met ? 'target_met' : 'below_target',
    criterion: rule.criterion,
    measurement: rule.measurement,
    note: met
      ? 'The measured angle reached the configured range-of-motion target. Other aspects of form were not assessed.'
      : `The measured peak angle was below the configured ${targetAngle}° range-of-motion target. Review the movement and camera view.`,
  };
}

export function summarizeRepetitionAssessments(items: RepetitionAssessment[]) {
  const assessed = items.filter((item) => item.status !== 'not_assessable');
  const targetMet = assessed.filter((item) => item.status === 'target_met').length;
  const belowTarget = assessed.filter((item) => item.status === 'below_target').length;
  return {
    total: items.length,
    targetMet,
    belowTarget,
    notAssessable: items.length - assessed.length,
    assessed: assessed.length,
    targetMetPercentage: assessed.length ? Math.round((targetMet / assessed.length) * 1000) / 10 : null,
  };
}
