# SmartMotion Backend

FastAPI service for the research movement classifier plus doctor/patient authentication, invitations, and progress sharing.

## Setup (Windows PowerShell)

Use Python 3.10 in the existing environment:

```powershell
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`; docs at `/docs`. The SQLite database `smartmotion.db` is created automatically. Back it up securely.

## Frontend

In the frontend project, copy `.env.example` to `.env` and set `VITE_SMARTMOTION_API_URL=http://127.0.0.1:8000`. Then run `npm install` and `npm run dev`.

## Accounts and invitations

- A doctor can register from the login page. Doctor registration is open for this prototype; add verification/approval before public production use.
- A signed-in doctor invites a patient by email from **Patients**. The invitation expires after 7 days.
- To actually send invitation email, configure the backend environment variables below. If SMTP is not configured, the app creates an invitation link for the doctor to copy and share securely.
- Patients create their account only through the invitation link and then sign in with the invited email and their password.
- Doctors can see only patients invited by their account. Patients can see only their own progress.

### Optional SMTP environment variables (PowerShell example)

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-smtp-user"
$env:SMTP_PASSWORD = "your-smtp-password"
$env:SMTP_FROM = "SmartMotion <no-reply@example.com>"
$env:SMARTMOTION_FRONTEND_URL = "http://localhost:5173"
```

Set a strong secret before using real accounts: `$env:SMARTMOTION_JWT_SECRET = "a-long-random-secret"`. For production, use HTTPS, secure secret management, backups, rate limiting, account verification, doctor identity approval, audit logs, and privacy/legal review. Never commit `.env` files or SMTP credentials.

## Progress data

When a doctor saves a session assigned to an invited patient, the frontend keeps its local record and attempts to sync a summary to the backend. The patient portal displays shared session totals and warning/error feedback notes. These feedback notes are not yet AI-verified incorrect repetitions.

## Research model limitation

The Random Forest model expects 726 statistical features derived from 66 UI-PRMD Kinect angle channels. The webcam frontend produces MediaPipe landmarks, so the classifier is not used for live webcam quality scoring until a compatible feature pipeline is trained and validated. The app is not a certified medical device and must not be used for diagnosis or treatment decisions.


## Demo patient and reporting endpoints

For local development, copy `.env.example` to `.env` and keep `SMARTMOTION_ENABLE_DEMO_PATIENT=true`. The backend loads this `.env` file automatically. The feature defaults to disabled if the setting is absent. Sign in as a doctor and use **Patients & invitations → Create demo patient**. The fixed patient ID is `SM-DEMO-PATIENT-001`. Demo login: `demo.patient@smartmotion.local` / `SmartMotionDemo!2026`. These credentials and the demo endpoint are for local testing only; disable the feature and change secrets before deployment. The fixed demo ID can be assigned to only one doctor in a given database.

Reporting endpoints: `GET /patient/reports` for the authenticated patient and `GET /doctor/patients/{patient_id}/reports` for the assigned doctor. They return per-exercise measurement reports plus an aggregated session summary. Correct/incorrect repetition counts and correctness percentages intentionally remain null until a validated MediaPipe-compatible repetition classifier is trained; feedback flags are not treated as confirmed incorrect repetitions.
