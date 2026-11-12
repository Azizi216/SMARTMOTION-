# SmartMotion doctor and patient accounts

## Included in this update
- Doctor login and self-registration.
- Patient login and invitation-based registration.
- Doctor can invite a patient using their email address.
- Invitation tokens expire after 7 days and are stored hashed in the backend database.
- If SMTP is configured, the backend sends the invitation email. Without SMTP, the doctor gets a link to copy and share securely.
- Role-protected doctor workspace and patient portal.
- Doctor sees only patients invited by that doctor; patients see only their own progress.
- When a doctor saves a session assigned to a linked patient, the session summary is saved locally and synced to the backend.
- Patient portal shows session/repetition/time totals, session history, a progress trend chart, and warning/error feedback notes.

## Backend setup (PowerShell)
From the `smartmotion-backend` directory, activate your existing venv and install the updated requirements:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:SMARTMOTION_JWT_SECRET = "replace-this-with-a-long-random-secret"
$env:SMARTMOTION_FRONTEND_URL = "http://localhost:5173"
uvicorn main:app --reload
```

For automatic email invitations, configure SMTP variables shown in `smartmotion-backend/.env.example` in the same terminal before starting the server. Do not commit secrets.

The backend creates `smartmotion.db` automatically. Keep a secure backup; it contains account and progress data.

## Frontend setup
From `smartmotion-frontend`:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Ensure `.env` contains `VITE_SMARTMOTION_API_URL=http://127.0.0.1:8000`.

## First-use flow
1. Open the frontend and choose **Register as a doctor**.
2. Sign in as the doctor.
3. Open **Patients**, enter the patient's display name and email, and invite them.
4. If SMTP is not configured, copy the generated invitation URL and send it to the patient yourself.
5. Patient opens the invitation link, creates a password, and is linked to the inviting doctor.
6. Doctor selects the invited patient when saving a monitoring session. The frontend syncs a summary to the backend.
7. Patient signs in and opens their Patient Portal to see shared sessions and progress.

## Important limitations and security checklist
- Doctor self-registration is open in this prototype. Before public deployment, add clinician verification/approval, email verification, password reset, rate limiting, audit logging, HTTPS, secure secret management, database backups, and a privacy/legal review.
- The app currently records warning/error feedback notes as **feedback flags**. They are not verified incorrect repetitions. The trained Random Forest expects 726 Kinect-derived features and is not yet compatible with live MediaPipe landmarks. Do not label a repetition incorrect based on this model until a compatible input pipeline is validated.
- This is a research prototype, not a certified medical device. Do not use it to diagnose or make treatment decisions.
- Existing browser IndexedDB records are device-local. Only sessions saved after the patient has been invited and selected are synced to the backend; historical local sessions are not automatically uploaded.
