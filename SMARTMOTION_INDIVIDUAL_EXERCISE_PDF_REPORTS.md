# SmartMotion — Individual Exercise PDF Reports

## What changed

- Added an individual report action to every saved exercise session in **Session History**.
- Added a print-ready comprehensive report for each exercise session.
- Added PDF actions to the authenticated patient's **Automatic exercise reports** table.
- Added PDF actions to the doctor's selected patient's **Automatic exercise reports** table.
- Retained CSV export for raw sampled measurements.

## How to create a PDF

1. Start the backend and frontend as described in `SMARTMOTION_STAGE1_EXERCISE_QUALITY.md`.
2. Sign in as a doctor or patient.
3. Open Session History, or open a patient profile / patient portal report table.
4. Select the **PDF** or document icon beside the exercise report.
5. In the browser print window, choose **Save as PDF** as the destination and save the file.

The PDF contains patient and session identifiers, exercise and date, duration, repetitions, tracking quality, per-repetition ROM screening results (when recorded), joint-angle summary, sampled movement timeline (for local session reports), feedback observations, and interpretation/limitations.

## Important interpretation

The first-stage result is a single-angle range-of-motion target screening. "Target met" means only that the measured angle reached its configured target. It does not establish full movement correctness, absence of compensation, pain-free performance, clinical safety, or recovery. Exercises without a supported measurement remain not assessable. Demo records are synthetic and are clearly labelled.

The browser's print-to-PDF workflow is used to avoid adding a separate PDF library. Choose **Save as PDF** in the print dialog.
