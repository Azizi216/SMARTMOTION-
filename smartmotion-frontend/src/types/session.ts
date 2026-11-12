import type { ExerciseType } from './movement';
import type { RepetitionAssessment } from '@/analysis/exerciseQuality';

export type SessionStatus = 'in_progress' | 'completed' | 'incomplete';

export interface QualityMetrics {
  averageConfidence: number;
  minConfidence: number;
  trackingReliability: number; // fraction of frames with usable landmarks
  dataQuality: 'good' | 'fair' | 'poor';
}

export interface ExerciseSession {
  id: string;
  patientId: string;
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;
  duration: number; // seconds
  repetitions: number;
  maxAngle: number;
  minAngle: number;
  averageAngle: number;
  qualityMetrics: QualityMetrics;
  cameraPosition: string;
  isDemo: boolean;
  repetitionAssessments?: RepetitionAssessment[];
  // Walking-specific summary (undefined for arm exercises)
  walkingSummary?: WalkingSummary;
}

export interface WalkingSummary {
  totalSteps: number;
  leftSteps: number;
  rightSteps: number;
  cadence: number; // steps/min
  duration: number;
  kneeAngleRange: number;
  walkingSpeed?: number;
  consistency: number; // 0..1
}

export interface SessionInput {
  patientId: string;
  exerciseType: ExerciseType;
  cameraPosition: string;
  isDemo?: boolean;
}
