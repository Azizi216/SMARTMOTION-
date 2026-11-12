import type { ArmSide, Landmark3D, Landmarks } from '@/types/movement';
import {
  calculateAngle,
  elevationAngle2D,
  frontalElevationAngle2D,
  getLandmark,
  INVALID_ANGLE,
  POSE_INDEX,
  averageConfidence,
  isLandmarkValid,
} from './angleCalculator';
import { type Vec2, sub2, len2, normalize2 } from './vectorMath';

/**
 * Shoulder flexion — raising the arm forward in the sagittal plane.
 * Side view. The arm elevation is measured relative to the torso
 * (hip -> shoulder) axis, projected in the 2D image.
 *
 * Returns the elevation in degrees where:
 *   0°  = arm hanging down at the side
 *   90° = arm horizontal (forward)
 *   180° = arm overhead
 */
export function shoulderFlexionAngle(
  landmarks: Landmarks | null,
  side: ArmSide,
  minConfidence = 0.4
): { angle: number; confidence: number; valid: boolean } {
  const shoulder = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder);
  const wrist = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftWrist : POSE_INDEX.rightWrist);
  const hip = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftHip : POSE_INDEX.rightHip);

  const valid =
    isLandmarkValid(shoulder, minConfidence) &&
    isLandmarkValid(wrist, minConfidence) &&
    isLandmarkValid(hip, minConfidence);

  const confidence = averageConfidence([shoulder, wrist, hip]);

  if (!valid || !shoulder || !wrist || !hip) {
    return { angle: INVALID_ANGLE, confidence, valid: false };
  }

  const torso = sub2({ x: shoulder.x, y: shoulder.y }, { x: hip.x, y: hip.y }); // hip -> shoulder
  const arm = sub2({ x: wrist.x, y: wrist.y }, { x: shoulder.x, y: shoulder.y }); // shoulder -> wrist
  const denom = len2(torso) * len2(arm);
  if (denom < 1e-9) return { angle: INVALID_ANGLE, confidence, valid: false };

  // Angle between torso (upward) and arm (forward/up). 0° = arm down, 180° = overhead.
  const tt = normalize2(torso);
  const ta = normalize2(arm);
  const cos = Math.max(-1, Math.min(1, tt.x * ta.x + tt.y * ta.y));
  const raw = (Math.acos(cos) * 180) / Math.PI;

  // Clamp to anatomically sensible [0, 180].
  const angle = Math.max(0, Math.min(180, raw));
  return { angle, confidence, valid: true };
}

/**
 * Shoulder abduction — raising the arm sideways in the frontal plane.
 * Front view. Uses the torso axis (shoulder-hip) and the shoulder-wrist arm vector.
 * The abduction is the angle between the arm and the downward torso direction
 * (so 0° = arm down, 90° = arm horizontal, 180° = overhead).
 */
export function shoulderAbductionAngle(
  landmarks: Landmarks | null,
  side: ArmSide,
  minConfidence = 0.4
): { angle: number; confidence: number; valid: boolean } {
  const shoulder = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder);
  const wrist = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftWrist : POSE_INDEX.rightWrist);
  const hip = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftHip : POSE_INDEX.rightHip);

  const valid =
    isLandmarkValid(shoulder, minConfidence) &&
    isLandmarkValid(wrist, minConfidence) &&
    isLandmarkValid(hip, minConfidence);
  const confidence = averageConfidence([shoulder, wrist, hip]);

  if (!valid || !shoulder || !wrist || !hip) {
    return { angle: INVALID_ANGLE, confidence, valid: false };
  }

  const shoulderV: Vec2 = { x: shoulder.x, y: shoulder.y };
  const wristV: Vec2 = { x: wrist.x, y: wrist.y };
  const hipV: Vec2 = { x: hip.x, y: hip.y };

  // Angle between the upward torso axis and the arm vector.
  const angle = frontalElevationAngle2D(shoulderV, wristV, hipV);
  if (Number.isNaN(angle)) return { angle: INVALID_ANGLE, confidence, valid: false };
  return { angle: Math.max(0, Math.min(180, angle)), confidence, valid: true };
}

/**
 * Elbow flexion — angle between shoulder->elbow and wrist->elbow.
 * Side view. 0° = fully extended, ~150° = fully flexed.
 */
export function elbowFlexionAngle(
  landmarks: Landmarks | null,
  side: ArmSide,
  minConfidence = 0.4
): { angle: number; confidence: number; valid: boolean } {
  const shoulder = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftShoulder : POSE_INDEX.rightShoulder);
  const elbow = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftElbow : POSE_INDEX.rightElbow);
  const wrist = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftWrist : POSE_INDEX.rightWrist);

  const valid =
    isLandmarkValid(shoulder, minConfidence) &&
    isLandmarkValid(elbow, minConfidence) &&
    isLandmarkValid(wrist, minConfidence);
  const confidence = averageConfidence([shoulder, elbow, wrist]);

  if (!valid || !shoulder || !elbow || !wrist) {
    return { angle: INVALID_ANGLE, confidence, valid: false };
  }
  const angle = calculateAngle(shoulder, elbow, wrist, false);
  return { angle, confidence, valid: !Number.isNaN(angle) };
}

/**
 * Knee flexion angle (used by walking analysis).
 */
export function kneeFlexionAngle(
  landmarks: Landmarks | null,
  side: ArmSide,
  minConfidence = 0.3
): { angle: number; confidence: number; valid: boolean } {
  const hip = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftHip : POSE_INDEX.rightHip);
  const knee = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftKnee : POSE_INDEX.rightKnee);
  const ankle = getLandmark(landmarks, side === 'left' ? POSE_INDEX.leftAnkle : POSE_INDEX.rightAnkle);

  const valid =
    isLandmarkValid(hip, minConfidence) &&
    isLandmarkValid(knee, minConfidence) &&
    isLandmarkValid(ankle, minConfidence);
  const confidence = averageConfidence([hip, knee, ankle]);

  if (!valid || !hip || !knee || !ankle) {
    return { angle: INVALID_ANGLE, confidence, valid: false };
  }
  const angle = calculateAngle(hip, knee, ankle, false);
  return { angle, confidence, valid: !Number.isNaN(angle) };
}

export function landmarkSummary(landmarks: Landmarks | null): {
  shoulder: Landmark3D | undefined;
  elbow: Landmark3D | undefined;
  wrist: Landmark3D | undefined;
  hip: Landmark3D | undefined;
} {
  // Returns right-side landmarks by default (most common demo side).
  return {
    shoulder: getLandmark(landmarks, POSE_INDEX.rightShoulder),
    elbow: getLandmark(landmarks, POSE_INDEX.rightElbow),
    wrist: getLandmark(landmarks, POSE_INDEX.rightWrist),
    hip: getLandmark(landmarks, POSE_INDEX.rightHip),
  };
}
