import type { Landmark3D } from '@/types/movement';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function toVec2(l: Landmark3D): Vec2 {
  return { x: l.x, y: l.y };
}

export function toVec3(l: Landmark3D): Vec3 {
  return { x: l.x, y: l.y, z: l.z };
}

export function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function len2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function len3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function scale2(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function normalize2(v: Vec2): Vec2 {
  const l = len2(v);
  if (l < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

export function normalize3(v: Vec3): Vec3 {
  const l = len3(v);
  if (l < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// 2D cross product magnitude (signed)
export function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Mean of an array (ignores NaN)
export function mean(arr: number[]): number {
  const valid = arr.filter((n) => !Number.isNaN(n));
  if (valid.length === 0) return 0;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((n) => (n - m) ** 2)));
}
