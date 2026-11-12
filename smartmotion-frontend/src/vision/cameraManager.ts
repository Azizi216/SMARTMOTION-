/**
 * Browser camera manager — wraps MediaDevices.getUserMedia and enumerates
 * available cameras. Handles start/stop/switch and clean teardown.
 */

export interface CameraInfo {
  deviceId: string;
  label: string;
}

export type CameraStatus = 'disconnected' | 'requesting' | 'connected' | 'error' | 'denied' | 'unavailable';

export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  status: CameraStatus = 'disconnected';
  errorMessage: string = '';
  currentDeviceId: string | undefined;

  async listCameras(): Promise<CameraInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId || `cam-${i}`,
          label: d.label || `Camera ${i + 1}`,
        }));
    } catch {
      return [];
    }
  }

  async start(video: HTMLVideoElement, deviceId?: string): Promise<void> {
    this.stop();
    this.video = video;
    this.status = 'requesting';
    this.errorMessage = '';

    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = 'unavailable';
      this.errorMessage = 'Camera API not supported in this browser.';
      throw new Error(this.errorMessage);
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.currentDeviceId = deviceId;
      video.srcObject = stream;
      await video.play();
      this.status = 'connected';
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        this.status = 'denied';
        this.errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
        this.status = 'unavailable';
        this.errorMessage = 'No camera was found. Connect a webcam and try again.';
      } else if (e?.name === 'NotReadableError') {
        this.status = 'error';
        this.errorMessage = 'The camera is already in use by another application.';
      } else {
        this.status = 'error';
        this.errorMessage = e?.message || 'Could not start the camera.';
      }
      throw err;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.video = null;
    this.status = 'disconnected';
  }

  async switchCamera(deviceId: string): Promise<void> {
    if (!this.video) throw new Error('Camera not started.');
    await this.start(this.video, deviceId);
  }

  get isActive(): boolean {
    return !!this.stream && this.status === 'connected';
  }
}

export function isCameraSupported(): boolean {
  return !!navigator.mediaDevices?.getUserMedia;
}
