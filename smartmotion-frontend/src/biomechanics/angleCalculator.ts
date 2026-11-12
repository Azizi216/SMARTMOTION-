import type { Landmark3D, Landmarks } from '@/types/movement';
import { type Vec2, type Vec3, sub2, sub3, dot2, dot3, len2, len3, deg, clamp, toVec2, toVec3 } from './vectorMath';

export const INVALID_ANGLE = NaN;

/**
 * Calculate the angle at point B using three 2D or 3D coordinates.
 *
 * Uses vector mathematics:
 *   BA = A - B
 *   BC = C - B
 *   angle = arccos( dot(BA, BC) / (|BA| * |BC|) )
 *
 * Returns the angle in degrees in range [0, 180].
 * Returns INVALID_ANGLE (NaN) when vectors are zero-length or landmarks missing.
 */
export function calculateAngle2D(a: Vec2, b: Vec2, c: Vec2): number {
  const ba = sub2(a, b);
  const bc = sub2(c, b);
  const denom = len2(ba) * len2(bc);
  if (denom < 1e-9) return INVALID_ANGLE;
  const cos = clamp(dot2(ba, bc) / denom, -1, 1);
  return deg(Math.acos(cos));
}

export function calculateAngle3D(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = sub3(a, b);
  const bc = sub3(c, b);
  const denom = len3(ba) * len3(bc);
  if (denom < 1e-9) return INVALID_ANGLE;
  const cos = clamp(dot3(ba, bc) / denom, -1, 1);
  return deg(Math.acos(cos));
}

export function calculateAngle(
  a: Landmark3D | undefined,
  b: Landmark3D | undefined,
  c: Landmark3D | undefined,
  use3D = false
): number {
  if (!a || !b || !c) return INVALID_ANGLE;
  if (
    a.visibility < 0.3 ||
    b.visibility < 0.3 ||
    c.visibility < 0.3
  ) {
    return INVALID_ANGLE;
  }
  return use3D
    ? calculateAngle3D(toVec3(a), toVec3(b), toVec3(c))
    : calculateAngle2D(toVec2(a), toVec2(b), toVec2(c));
}

/**
 * The signed angle of a vector relative to the downward vertical (gravity-like),
 * measured clockwise in image coordinates (y grows downward).
 *
 * This is used for arm elevation relative to the torso. Returns degrees [0, 360).
 * A straight-down arm pointing toward the hip is ~0°.
 */
export function elevationAngle2D(origin: Vec2, point: Vec2): number {
  const v = sub2(point, origin);
  // Angle from downward (+y) axis, measured counter-clockwise toward -x in image coords.
  // atan2(-v.x, -v.y): returns angle measured from downward direction, positive when arm is raised forward/upward.
  let a = Math.atan2(-v.x, -v.y);
  let d = deg(a);
  if (d < 0) d += 360;
  return d;
}

/**
 * The angle of the arm in the frontal plane (abduction): measured from the vertical
 * hip-to-shoulder torso axis out toward the wrist. 0° = arm down at side, 90° = arm horizontal, 180° = overhead.
 */
export function frontalElevationAngle2D(shoulder: Vec2, wrist: Vec2, hip: Vec2): number {
  // Torso axis (hip -> shoulder), pointing upward.
  const torso = normalizeTorsoAxis(shoulder, hip);
  // Arm vector (shoulder -> wrist)
  const arm = sub2(wrist, shoulder);
  const denom = len2(torso) * len2(arm);
  if (denom < 1e-9) return INVALID_ANGLE;
  const cos = clamp(dot2(torso, arm) / denom, -1, 1);
  return deg(Math.acos(cos));
}

export function normalizeTorsoAxis(shoulder: Vec2, hip: Vec2): Vec2 {
  // Unit vector pointing up the torso from hip to shoulder
  const v = sub2(shoulder, hip);
  const l = len2(v);
  if (l < 1e-9) return { x: 0, y: -1 };
  return { x: v.x / l, y: v.y / l };
}

/**
 * Returns true if the landmark is present and reasonably visible.
 */
export function isLandmarkValid(l: Landmark3D | undefined, min = 0.3): boolean {
  return !!l && l.visibility >= min;
}

/**
 * Average visibility of a set of landmarks (0..1).
 */
export function averageConfidence(landmarks: (Landmark3D | undefined)[]): number {
  const valid = landmarks.filter(Boolean) as Landmark3D[];
  if (valid.length === 0) return 0;
  return valid.reduce((s, l) => s + l.visibility, 0) / valid.length;
}

// Convenience: pick a side's landmark by index pair.
export const POSE_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export function getLandmark(landmarks: Landmarks | null, idx: number): Landmark3D | undefined {
  if (!landmarks || idx < 0 || idx >= landmarks.length) return undefined;
  return landmarks[idx];
}
