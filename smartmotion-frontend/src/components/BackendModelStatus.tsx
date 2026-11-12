import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Server } from 'lucide-react';

type Status = {
  status: string;
  model_loaded: boolean;
  features_required: number;
};

type ModelInfo = {
  model?: string;
  features_required?: number;
  measurement_source?: string;
  feature_version?: string;
  warning?: string;
};

const API_URL = (import.meta.env.VITE_SMARTMOTION_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export function BackendModelStatus() {
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [healthRes, infoRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/`),
      ]);
      if (!healthRes.ok || !infoRes.ok) throw new Error('API request failed');
      setStatus(await healthRes.json());
      setInfo(await infoRes.json());
    } catch {
      setStatus(null);
      setInfo(null);
      setError('Backend is not reachable. Start FastAPI at http://127.0.0.1:8000.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  return (
    <section className="card mb-5 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Server size={17} /></span>
          <div>
            <h3 className="text-sm font-bold text-navy-900">Movement-quality model</h3>
            <p className="text-xs text-navy-400">FastAPI backend connection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${busy ? 'bg-navy-50 text-navy-600' : status?.model_loaded ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-800'}`}>
            {busy ? 'Checking…' : status?.model_loaded ? 'Model loaded' : 'Disconnected'}
          </span>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => void check()} disabled={busy}>
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Check
          </button>
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
      {status?.model_loaded && (
        <>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-navy-600">
            <span>Model: {info?.model || 'Random Forest'}</span>
            <span>Required input: {info?.features_required ?? status.features_required} features</span>
            <span>Source: {info?.measurement_source || 'Kinect Angles'}</span>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <p>
              Backend is reachable, but live webcam quality scoring is deliberately disabled. This model was trained on 66 Kinect angle channels (726 summary features), while this app receives MediaPipe landmarks. Do not treat these inputs as interchangeable. A validated conversion or a MediaPipe-trained model is required first.
            </p>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-teal-700"><CheckCircle2 size={13} /> API connection verified; no camera frames are sent to the backend.</p>
        </>
      )}
    </section>
  );
}
