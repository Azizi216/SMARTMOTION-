import type { ArmSide, ExerciseType } from '@/types/movement';
import { DEFAULT_THRESHOLDS } from '@/types/movement';

export interface DisplaySettings {
  showSkeleton: boolean;
  showLandmarks: boolean;
  showAngleLabels: boolean;
  showMovementGraph: boolean;
}

export interface ApplicationSettings {
  selectedCamera?: string;
  preferredArm: ArmSide;
  processingQuality: 'low' | 'medium' | 'high';
  targetFps: number;
  display: DisplaySettings;
  thresholds: Record<ExerciseType, ReturnType<typeof getDefaultThresholds>>;
}

export function getDefaultThresholds() {
  return { ...DEFAULT_THRESHOLDS.shoulder_flexion };
}

export const DEFAULT_SETTINGS: ApplicationSettings = {
  preferredArm: 'right',
  processingQuality: 'medium',
  targetFps: 15,
  display: {
    showSkeleton: true,
    showLandmarks: true,
    showAngleLabels: true,
    showMovementGraph: true,
  },
  thresholds: {
    shoulder_flexion: { ...DEFAULT_THRESHOLDS.shoulder_flexion },
    shoulder_abduction: { ...DEFAULT_THRESHOLDS.shoulder_abduction },
    elbow_flexion: { ...DEFAULT_THRESHOLDS.elbow_flexion },
    walking_analysis: { ...DEFAULT_THRESHOLDS.walking_analysis },
    m01: { ...DEFAULT_THRESHOLDS.m01 },
    m02: { ...DEFAULT_THRESHOLDS.m02 },
    m03: { ...DEFAULT_THRESHOLDS.m03 },
    m04: { ...DEFAULT_THRESHOLDS.m04 },
    m05: { ...DEFAULT_THRESHOLDS.m05 },
    m06: { ...DEFAULT_THRESHOLDS.m06 },
    m07: { ...DEFAULT_THRESHOLDS.m07 },
    m08: { ...DEFAULT_THRESHOLDS.m08 },
    m09: { ...DEFAULT_THRESHOLDS.m09 },
    m10: { ...DEFAULT_THRESHOLDS.m10 },
  },
};

const KEY = 'smartmotion-settings';

export function loadSettings(): ApplicationSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ApplicationSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      display: { ...DEFAULT_SETTINGS.display, ...(parsed.display ?? {}) },
      thresholds: {
        ...DEFAULT_SETTINGS.thresholds,
        ...(parsed.thresholds ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ApplicationSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function resetSettings(): ApplicationSettings {
  const fresh = { ...DEFAULT_SETTINGS };
  saveSettings(fresh);
  return fresh;
}
