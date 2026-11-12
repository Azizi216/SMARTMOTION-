import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraManager, type CameraInfo, type CameraStatus } from '@/vision/cameraManager';

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  errorMessage: string;
  cameras: CameraInfo[];
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  refreshCameras: () => Promise<void>;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const managerRef = useRef<CameraManager>(new CameraManager());
  const [status, setStatus] = useState<CameraStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);

  const sync = useCallback(() => {
    setStatus(managerRef.current.status);
    setErrorMessage(managerRef.current.errorMessage);
  }, []);

  const refreshCameras = useCallback(async () => {
    const list = await managerRef.current.listCameras();
    setCameras(list);
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      if (!videoRef.current) return;
      try {
        await managerRef.current.start(videoRef.current, deviceId);
        sync();
        await refreshCameras();
      } catch {
        sync();
      }
    },
    [sync, refreshCameras]
  );

  const stop = useCallback(() => {
    managerRef.current.stop();
    sync();
  }, [sync]);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      try {
        await managerRef.current.switchCamera(deviceId);
        sync();
      } catch {
        sync();
      }
    },
    [sync]
  );

  useEffect(() => {
    return () => {
      managerRef.current.stop();
    };
  }, []);

  return { videoRef, status, errorMessage, cameras, start, stop, switchCamera, refreshCameras };
}
