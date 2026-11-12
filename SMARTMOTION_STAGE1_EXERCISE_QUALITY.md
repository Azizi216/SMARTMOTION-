# SmartMotion Stage 1 — Exercise-specific ROM screening

## What changed

- Captures peak and minimum measured angle for each completed repetition.
- Applies an explicit exercise-specific single-angle range-of-motion (ROM) target for m01–m07.
- Stores repetition assessments with each saved session locally and in the FastAPI database.
- Exposes per-exercise target-met, below-target, and not-assessable counts in patient and doctor reports.
- Adds a backward-compatible SQLite column migration for `repetition_assessments`.
- Adds illustrative repetition-level results to the fixed demo patient. Demo records are clearly synthetic.

## Exercise criteria and limitations

| Exercise | Current measurement | Stage 1 result |
|---|---|---|
| m01 Deep Squat | Selected-side knee flexion range | Checks configured ROM target only |
| m02 Hurdle Step | Selected-side hip flexion proxy | Checks configured ROM target only |
| m03 Inline Lunge | Selected-side knee flexion range | Checks configured ROM target only |
| m04 Side Lunge | Selected-side knee flexion range | Checks configured ROM target only |
| m05 Sit to Stand | Selected-side knee flexion range | Checks configured ROM target only |
| m06 Standing Leg Raise | Selected-side hip flexion proxy | Checks configured ROM target only |
| m07 Shoulder Abduction | Selected-side shoulder elevation/abduction proxy | Checks configured ROM target only |
| m08 Shoulder Extension | Not reliably measured by current single-view 2D pipeline | Not assessable |
| m09 Shoulder Internal/External Rotation | Axial rotation not reliably measured by current single-view 2D pipeline | Not assessable |
| m10 Shoulder Scaption | Experimental 2D shoulder-elevation proxy, not a validated 3D plane measurement | Not assessable |

`target_met` means only that the measured proxy reached the app's configured target angle. `below_target` means it did not. Neither label means the entire repetition is clinically correct or incorrect. The assessment does not evaluate pain, safety, balance, compensations, bilateral symmetry, or clinician-prescribed restrictions.

The targets are the application's configurable `DEFAULT_THRESHOLDS` values. They are engineering defaults, not universal clinical norms. A qualified clinician should review and configure thresholds for the intended population and protocol before any real-world clinical use.

## Run the updated project

1. Back up your current project and `smartmotion.db`.
2. Extract this ZIP to a new folder, or copy the updated `smartmotion-frontend/src` and `smartmotion-backend/main.py` into your existing project while preserving `.env`, your database, and local configuration.
3. Backend: activate your existing Python virtual environment and run `pip install -r requirements.txt` if needed, then `uvicorn main:app --reload`.
4. Frontend: run `npm install` if needed, then `npm run dev`.
5. The backend automatically adds the `repetition_assessments` JSON column to an existing SQLite `exercise_sessions` table.
6. Log in as a doctor, open Patients & Invitations, and click Create demo patient. Existing demo sessions are upgraded with clearly labelled synthetic examples.
7. In Live Monitoring, choose an exercise, start the camera, complete repetitions, stop, choose a linked patient, and save. Open the doctor or patient report to review the results.

## Verification

- Backend source passed Python syntax compilation (`python -m py_compile`).
- Full backend runtime smoke test was not possible in the packaging environment because the `pwdlib` dependency was not installed there.
- Frontend typecheck/build was not completed because dependency installation timed out in the packaging environment. Run `npm install`, `npm run typecheck`, and `npm run build` on the development computer.

## Next stage

To assess full movement form, add multi-joint and temporal features (alignment, symmetry, stability, velocity, trunk compensation) and validate the criteria against labelled video data and clinician review. The existing Kinect-trained Random Forest is not interchangeable with MediaPipe features and is not used for these Stage 1 ROM results.
