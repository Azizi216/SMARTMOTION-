export type ExerciseType =
  | 'shoulder_flexion'
  | 'shoulder_abduction'
  | 'elbow_flexion'
  | 'walking_analysis'
  | 'm01' | 'm02' | 'm03' | 'm04' | 'm05'
  | 'm06' | 'm07' | 'm08' | 'm09' | 'm10';

export type ArmSide = 'left' | 'right';

export type MovementPhase =
  | 'RESTING'
  | 'RAISING'
  | 'PEAK'
  | 'LOWERING'
  | 'COMPLETED';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type Landmarks = Landmark3D[];

// A single sampled measurement during a session.
export interface MovementMeasurement {
  id: string;
  sessionId: string;
  timestamp: number; // ms since session start
  jointAngle: number;
  landmarkConfidence: number;
  movementPhase: MovementPhase;
}

// A rolling buffer used by the live exercise view (not persisted).
export interface LiveSample {
  t: number; // ms since start
  angle: number;
  confidence: number;
  phase: MovementPhase;
}

export interface StepEvent {
  t: number; // ms since start
  side: ArmSide;
}

export interface WalkingLiveState {
  totalSteps: number;
  leftSteps: number;
  rightSteps: number;
  cadence: number; // steps/min
  kneeAngle: number;
  leftAnkleY: number;
  rightAnkleY: number;
  steps: StepEvent[];
  samples: LiveSample[];
}

export interface ExerciseThresholds {
  activationAngle: number; // angle at which a rep is considered "reached"
  returnAngle: number; // angle near rest at which the rep completes
  cooldownMs: number; // minimum time between reps
  minConfidence: number; // minimum landmark confidence to act on
  targetAngle: number; // target range of motion (display only)
}

export interface FeedbackMessage {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  text: string;
  timestamp: number;
}

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  shoulder_flexion: 'Shoulder Flexion',
  shoulder_abduction: 'Shoulder Abduction',
  elbow_flexion: 'Elbow Flexion',
  walking_analysis: 'Walking Analysis',
  m01: 'Deep Squat',
  m02: 'Hurdle Step',
  m03: 'Inline Lunge',
  m04: 'Side Lunge',
  m05: 'Sit to Stand',
  m06: 'Standing Leg Raise',
  m07: 'Shoulder Abduction',
  m08: 'Shoulder Extension',
  m09: 'Shoulder Internal External Rotation',
  m10: 'Shoulder Scaption',
};

export const EXERCISE_META: Record<
  ExerciseType,
  {
    label: string;
    short: string;
    description: string;
    cameraPosition: string;
    requiredLandmarks: string[];
    accent: string;
  }
> = {
  shoulder_flexion: {
    label: 'Shoulder Flexion',
    short: 'Raise arm forward',
    description: 'Raise an arm forward in front of the body, then lower it back down.',
    cameraPosition: 'Side view',
    requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist', 'Hip'],
    accent: '#2787D9',
  },
  shoulder_abduction: {
    label: 'Shoulder Abduction',
    short: 'Raise arm sideways',
    description: 'Raise an arm sideways away from the body in the frontal plane, then lower it.',
    cameraPosition: 'Front view',
    requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist', 'Hip'],
    accent: '#20B89A',
  },
  elbow_flexion: {
    label: 'Elbow Flexion',
    short: 'Bend and straighten',
    description: 'Bend the elbow bringing the forearm up, then straighten the arm.',
    cameraPosition: 'Side view',
    requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist'],
    accent: '#173F70',
  },
  walking_analysis: {
    label: 'Walking Analysis',
    short: 'Gait & steps',
    description: 'Analyse walking cycles, step count, cadence and knee-angle trajectories.',
    cameraPosition: 'Side view (full body)',
    requiredLandmarks: ['Hips', 'Knees', 'Ankles', 'Heels', 'Shoulders'],
    accent: '#43CDA6',
  },
  m01: { label: 'Deep Squat', short: 'Squat down and stand', description: 'Lower your hips by bending both knees, then return to a standing position.', cameraPosition: 'Side view (full body)', requiredLandmarks: ['Shoulders', 'Hips', 'Knees', 'Ankles'], accent: '#2787D9' },
  m02: { label: 'Hurdle Step', short: 'Step over an imaginary hurdle', description: 'Lift one leg, move it forward over an imaginary hurdle, and return with control.', cameraPosition: 'Front view (full body)', requiredLandmarks: ['Hips', 'Knees', 'Ankles', 'Shoulders'], accent: '#20B89A' },
  m03: { label: 'Inline Lunge', short: 'Lunge in a narrow stance', description: 'Step into a narrow split stance, lower with control, and return to standing.', cameraPosition: 'Front view (full body)', requiredLandmarks: ['Hips', 'Knees', 'Ankles'], accent: '#173F70' },
  m04: { label: 'Side Lunge', short: 'Lunge sideways', description: 'Step to one side, bend the stepping knee while keeping the other leg longer, then return.', cameraPosition: 'Front view (full body)', requiredLandmarks: ['Hips', 'Knees', 'Ankles'], accent: '#43CDA6' },
  m05: { label: 'Sit to Stand', short: 'Stand up from a chair', description: 'Start seated, stand up without rushing, then sit down with control.', cameraPosition: 'Side view (full body)', requiredLandmarks: ['Shoulders', 'Hips', 'Knees', 'Ankles'], accent: '#2787D9' },
  m06: { label: 'Standing Leg Raise', short: 'Raise one leg', description: 'Stand upright, lift one leg in front of you, then lower it slowly.', cameraPosition: 'Side view (full body)', requiredLandmarks: ['Shoulders', 'Hips', 'Knees', 'Ankles'], accent: '#20B89A' },
  m07: { label: 'Shoulder Abduction', short: 'Raise arm sideways', description: 'Raise one arm sideways away from your body, then lower it with control.', cameraPosition: 'Front view', requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist', 'Hip'], accent: '#173F70' },
  m08: { label: 'Shoulder Extension', short: 'Move arm backward', description: 'With a side view, move your arm gently backward relative to your torso, then return.', cameraPosition: 'Side view', requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist', 'Hip'], accent: '#43CDA6' },
  m09: { label: 'Shoulder Internal External Rotation', short: 'Rotate shoulder', description: 'Keep your elbow near your side and rotate the forearm inward and outward.', cameraPosition: 'Front view', requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist'], accent: '#2787D9' },
  m10: { label: 'Shoulder Scaption', short: 'Raise arm in scapular plane', description: 'Raise your arm diagonally forward, between a front raise and a side raise, then lower it.', cameraPosition: 'Front-oblique view', requiredLandmarks: ['Shoulder', 'Elbow', 'Wrist', 'Hip'], accent: '#20B89A' },
};

export const DEFAULT_THRESHOLDS: Record<ExerciseType, ExerciseThresholds> = {
  shoulder_flexion: {
    activationAngle: 70,
    returnAngle: 30,
    cooldownMs: 400,
    minConfidence: 0.5,
    targetAngle: 120,
  },
  shoulder_abduction: {
    activationAngle: 70,
    returnAngle: 30,
    cooldownMs: 400,
    minConfidence: 0.5,
    targetAngle: 120,
  },
  elbow_flexion: {
    activationAngle: 90,
    returnAngle: 40,
    cooldownMs: 350,
    minConfidence: 0.5,
    targetAngle: 140,
  },
  walking_analysis: {
    activationAngle: 0,
    returnAngle: 0,
    cooldownMs: 250,
    minConfidence: 0.4,
    targetAngle: 0,
  },
  m01: { activationAngle: 55, returnAngle: 15, cooldownMs: 500, minConfidence: 0.5, targetAngle: 90 },
  m02: { activationAngle: 45, returnAngle: 15, cooldownMs: 500, minConfidence: 0.5, targetAngle: 70 },
  m03: { activationAngle: 55, returnAngle: 15, cooldownMs: 500, minConfidence: 0.5, targetAngle: 90 },
  m04: { activationAngle: 55, returnAngle: 15, cooldownMs: 500, minConfidence: 0.5, targetAngle: 90 },
  m05: { activationAngle: 45, returnAngle: 15, cooldownMs: 600, minConfidence: 0.5, targetAngle: 80 },
  m06: { activationAngle: 35, returnAngle: 10, cooldownMs: 500, minConfidence: 0.5, targetAngle: 60 },
  m07: { activationAngle: 70, returnAngle: 30, cooldownMs: 400, minConfidence: 0.5, targetAngle: 120 },
  m08: { activationAngle: 25, returnAngle: 5, cooldownMs: 500, minConfidence: 0.5, targetAngle: 40 },
  m09: { activationAngle: 45, returnAngle: 10, cooldownMs: 500, minConfidence: 0.5, targetAngle: 90 },
  m10: { activationAngle: 70, returnAngle: 30, cooldownMs: 400, minConfidence: 0.5, targetAngle: 120 },
};

export const PHASE_LABELS: Record<MovementPhase, string> = {
  RESTING: 'Resting',
  RAISING: 'Raising',
  PEAK: 'Peak',
  LOWERING: 'Lowering',
  COMPLETED: 'Completed',
};
