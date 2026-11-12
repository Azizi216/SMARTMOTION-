import type { MovementPhase } from '@/types/movement';

/**
 * Lightweight wrapper around the phase logic, kept separate from the
 * rep detector so it can be reused (e.g. for the live phase indicator).
 */
export function nextPhase(current: MovementPhase, angle: number, activation: number, returnAngle: number): MovementPhase {
  if (Number.isNaN(angle)) return current;
  if (current === 'RESTING' && angle >= activation) return 'RAISING';
  if (current === 'RAISING' && angle >= activation + 5) return 'PEAK';
  if (current === 'PEAK' && angle < activation) return 'LOWERING';
  if (current === 'LOWERING' && angle <= returnAngle) return 'RESTING';
  return current;
}

export function phaseColor(phase: MovementPhase): string {
  switch (phase) {
    case 'RESTING':
      return '#7E9AC0';
    case 'RAISING':
      return '#2787D9';
    case 'PEAK':
      return '#20B89A';
    case 'LOWERING':
      return '#F59E0B';
    case 'COMPLETED':
      return '#10B981';
  }
}
