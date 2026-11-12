# SmartMotion frontend aligned to the supplied backend

## What was updated
- The exercise library now presents the 10 UI-PRMD exercise labels used in the dataset: m01–m10.
- Walking Analysis remains a separate feature, not one of the 10 UI-PRMD exercise classes.
- Exercise IDs and labels are available in the app routes and live-monitor selector.
- Added an API status panel to Live Monitoring. It checks `GET /health` and `GET /` on the supplied FastAPI backend.
- Added basic MediaPipe-derived angle/repetition estimates where a 2D landmark proxy is possible:
  - m01 Deep Squat: knee flexion proxy
  - m02 Hurdle Step: hip flexion proxy
  - m03 Inline Lunge: knee flexion proxy
  - m04 Side Lunge: knee flexion proxy
  - m05 Sit to Stand: knee flexion proxy
  - m06 Standing Leg Raise: hip flexion proxy
  - m07 Shoulder Abduction: existing shoulder abduction angle
  - m10 Shoulder Scaption: 2D shoulder-elevation proxy only
- For m08 Shoulder Extension and m09 Shoulder Internal/External Rotation, angle-based repetition scoring is intentionally disabled because the current single-view 2D landmarks cannot reliably measure those movements.

## Backend compatibility — important
The supplied backend is a binary movement-quality classifier (`correct` / `incorrect`), not a 10-class exercise recognizer. It expects exactly 726 features: 11 statistical summaries for each of 66 Kinect angle channels.

The frontend's MediaPipe landmarks and the simple 2D proxies above are not equivalent to the Kinect input representation. Therefore:
- The frontend checks backend availability and displays the model's metadata.
- The frontend does **not** send MediaPipe data to `/predict`.
- The frontend does **not** display fabricated correct/incorrect predictions.
- To enable genuine live AI quality scoring, collect/derive matching 66-channel sequences from MediaPipe and validate them against reference labels, or train a new quality model on MediaPipe-derived features.

## Run the applications

### Backend (PowerShell)
In the backend folder, with its Python virtual environment activated:

```powershell
uvicorn main:app --reload
```

### Frontend
Copy `.env.example` to `.env` if you need to change the API address. The default is:

```env
VITE_SMARTMOTION_API_URL=http://127.0.0.1:8000
```

Then run:

```powershell
npm ci
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Validation status
The source changes were applied and the archive was created. A full TypeScript/build check could not be completed in this environment because `npm ci` did not finish before the execution timeout. Please run `npm ci`, then `npm run typecheck` and `npm run build` locally. If either reports errors, send the complete output for correction.

This remains a research prototype, not a clinically validated medical device. The angle thresholds are provisional and must be checked with real recordings before use with patients.
