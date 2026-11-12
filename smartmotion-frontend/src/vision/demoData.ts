import type { Landmark3D, Landmarks, ExerciseType, ArmSide } from '@/types/movement';
import { POSE_INDEX } from '@/biomechanics/angleCalculator';

/**
 * Build a full 33-landmark pose skeleton where the requested joint angle
 * varies over time as a smooth sine wave. Used by demo mode only.
 *
 * The skeleton is a generic anatomically-plausible standing pose with one
 * joint moving. Angles are computed in normalized image coordinates so the
 * live biomechanics pipeline sees realistic input.
 */
export function generateDemoLandmarks(
  exercise: ExerciseType,
  side: ArmSide,
  tMs: number,
  phaseProgress = 0
): Landmarks {
  // Base skeleton (normalized coords, x: 0..1, y: 0..1, z small depth).
  const landmarks: Landmark3D[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));

  // Base standing pose
  const head = { x: 0.5, y: 0.12, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.nose] = head;
  // Shoulders
  landmarks[POSE_INDEX.leftShoulder] = { x: 0.42, y: 0.28, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightShoulder] = { x: 0.58, y: 0.28, z: 0, visibility: 1 };
  // Hips
  landmarks[POSE_INDEX.leftHip] = { x: 0.44, y: 0.58, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightHip] = { x: 0.56, y: 0.58, z: 0, visibility: 1 };
  // Knees
  landmarks[POSE_INDEX.leftKnee] = { x: 0.44, y: 0.75, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightKnee] = { x: 0.56, y: 0.75, z: 0, visibility: 1 };
  // Ankles
  landmarks[POSE_INDEX.leftAnkle] = { x: 0.44, y: 0.92, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightAnkle] = { x: 0.56, y: 0.92, z: 0, visibility: 1 };
  // Heels
  landmarks[POSE_INDEX.leftHeel] = { x: 0.43, y: 0.94, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightHeel] = { x: 0.57, y: 0.94, z: 0, visibility: 1 };
  // Foot indices
  landmarks[POSE_INDEX.leftFootIndex] = { x: 0.45, y: 0.95, z: 0, visibility: 1 };
  landmarks[POSE_INDEX.rightFootIndex] = { x: 0.55, y: 0.95, z: 0, visibility: 1 };

  const s = side === 'left' ? -1 : 1; // sign for left/right
  const period = 2500; // ms for a single rep cycle
  const omega = (2 * Math.PI) / period;
  const phase = (tMs % period) * omega;
  // Movement amplitude 0..1 within the rep.
  const move = (1 - Math.cos(phase)) / 2; // 0 -> 1 -> 0

  const shoulderIdx = side === 'left' ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder;
  const elbowIdx = side === 'left' ? POSE_INDEX.leftElbow : POSE_INDEX.rightElbow;
  const wristIdx = side === 'left' ? POSE_INDEX.leftWrist : POSE_INDEX.rightWrist;
  const hipIdx = side === 'left' ? POSE_INDEX.leftHip : POSE_INDEX.rightHip;
  const shoulder = { ...landmarks[shoulderIdx] };
  const hip = { ...landmarks[hipIdx] };

  if (exercise === 'shoulder_flexion') {
    // Arm raises forward (in image plane, up and slightly toward camera side).
    // 0° = arm straight down, 180° = overhead. We map move [0..1] to [0..150°].
    const angle = (move * 150 * Math.PI) / 180;
    const armLen = 0.32;
    // Forward = up the image (y decreases) and toward the camera-side (x increases for right).
    const dx = Math.sin(angle) * armLen * s;
    const dy = -Math.cos(angle) * armLen;
    landmarks[shoulderIdx] = shoulder;
    landmarks[elbowIdx] = { x: shoulder.x + dx * 0.55, y: shoulder.y + dy * 0.55, z: 0, visibility: 1 };
    landmarks[wristIdx] = { x: shoulder.x + dx, y: shoulder.y + dy, z: 0, visibility: 1 };
  } else if (exercise === 'shoulder_abduction') {
    // Arm raises sideways (out from body in frontal plane). 0° down -> 150° overhead.
    const angle = (move * 150 * Math.PI) / 180;
    const armLen = 0.32;
    const dx = Math.sin(angle) * armLen * s;
    const dy = -Math.cos(angle) * armLen;
    landmarks[shoulderIdx] = shoulder;
    landmarks[elbowIdx] = { x: shoulder.x + dx * 0.55, y: shoulder.y + dy * 0.55, z: 0, visibility: 1 };
    landmarks[wristIdx] = { x: shoulder.x + dx, y: shoulder.y + dy, z: 0, visibility: 1 };
  } else if (exercise === 'elbow_flexion') {
    // Elbow stays at side; forearm swings up. Angle 0 (straight) -> 140 (flexed).
    const flex = (move * 140 * Math.PI) / 180;
    const elbow = { x: shoulder.x + s * 0.06, y: shoulder.y + 0.18, z: 0, visibility: 1 };
    landmarks[elbowIdx] = elbow;
    // Forearm up from elbow: angle measured from "down" (straight) axis.
    const forearmLen = 0.22;
    const dx = Math.sin(flex) * forearmLen * -s;
    const dy = -Math.cos(flex) * forearmLen;
    landmarks[wristIdx] = { x: elbow.x + dx, y: elbow.y + dy, z: 0, visibility: 1 };
  } else if (exercise === 'walking_analysis') {
    // Alternate ankle vertical positions to simulate stepping.
    const stepPhase = (tMs % 1200) / 1200; // 1.2s per step cycle
    const leftLift = Math.max(0, Math.sin(stepPhase * Math.PI)) * 0.06;
    const rightLift = Math.max(0, Math.sin((stepPhase + 0.5) * Math.PI)) * 0.06;
    landmarks[POSE_INDEX.leftAnkle] = { x: 0.44, y: 0.92 - leftLift, z: 0, visibility: 1 };
    landmarks[POSE_INDEX.rightAnkle] = { x: 0.56, y: 0.92 - rightLift, z: 0, visibility: 1 };
    // Knee flexion follows ankle lift
    const leftKneeFlex = leftLift * 4;
    const rightKneeFlex = rightLift * 4;
    landmarks[POSE_INDEX.leftKnee] = { x: 0.44, y: 0.75 + leftKneeFlex * 0.1, z: 0, visibility: 1 };
    landmarks[POSE_INDEX.rightKnee] = { x: 0.56, y: 0.75 + rightKneeFlex * 0.1, z: 0, visibility: 1 };
  }

  void hip;
  void phaseProgress;
  return landmarks;
}

/**
 * Deterministic "demo session" timeline for the dashboard demo data, so demo
 * charts have a believable shape without requiring a live camera.
 */
export function demoAngleSeries(exercise: ExerciseType, samples = 40): number[] {
  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 4;
    let base = 0;
    if (exercise === 'walking_analysis') base = 50 + Math.sin(t) * 20;
    else base = 90 + Math.sin(t) * 60;
    out.push(Math.max(0, Math.min(180, Math.round(base))));
  }
  return out;
}
