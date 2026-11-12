import { useCallback, useEffect, useRef, useState } from 'react';
import { getPoseLandmarker, detectPose, type PoseResult } from '@/vision/poseLandmarker';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmarks } from '@/types/movement';

export type PoseStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UsePoseDetectionResult {
  status: PoseStatus;
  errorMessage: string;
  ensureLoaded: () => Promise<PoseLandmarker | null>;
  detect: (video: HTMLVideoElement, timestampMs: number) => PoseResult;
}

export function usePoseDetection(): UsePoseDetectionResult {
  const [status, setStatus] = useState<PoseStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  const ensureLoaded = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setStatus('loading');
    setErrorMessage('');
    const lm = await getPoseLandmarker();
    if (!lm) {
      setStatus('error');
      setErrorMessage('Could not load the pose detection model. Check your internet connection and try again.');
      return null;
    }
    landmarkerRef.current = lm;
    setStatus('ready');
    return lm;
  }, []);

  const detect = useCallback((video: HTMLVideoElement, timestampMs: number) => {
    if (!landmarkerRef.current) {
      return { landmarks: null as Landmarks | null, worldLandmarks: null as Landmarks | null, timestampMs };
    }
    return detectPose(landmarkerRef.current, video, timestampMs);
  }, []);

  useEffect(() => {
    return () => {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  return { status, errorMessage, ensureLoaded, detect };
}
