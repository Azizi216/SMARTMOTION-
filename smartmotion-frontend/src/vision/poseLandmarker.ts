import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { Landmarks } from '@/types/movement';

let landmarkerPromise: Promise<PoseLandmarker | null> | null = null;

/**
 * Loads the MediaPipe Pose Landmarker. The WASM + model assets are fetched
 * from the Google CDN (free). Cached so callers can await repeatedly.
 *
 * Returns null if loading fails (e.g. offline) — callers should surface
 * a clear error to the user in that case.
 */
export async function getPoseLandmarker(): Promise<PoseLandmarker | null> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      return landmarker;
    } catch (err) {
      console.error('[SmartMotion] Failed to load MediaPipe Pose Landmarker', err);
      landmarkerPromise = null;
      return null;
    }
  })();
  return landmarkerPromise;
}

export interface PoseResult {
  landmarks: Landmarks | null;
  worldLandmarks: Landmarks | null;
  timestampMs: number;
}

/**
 * Run pose detection for a single video frame.
 */
export function detectPose(landmarker: PoseLandmarker, video: HTMLVideoElement, timestampMs: number): PoseResult {
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks = result.landmarks && result.landmarks.length > 0 ? (result.landmarks[0] as Landmarks) : null;
  const worldLandmarks =
    result.worldLandmarks && result.worldLandmarks.length > 0 ? (result.worldLandmarks[0] as Landmarks) : null;
  return { landmarks, worldLandmarks, timestampMs };
}
