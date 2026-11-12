import type { ExerciseSession } from '@/types/session';
import type { MovementMeasurement } from '@/types/movement';
import { EXERCISE_LABELS } from '@/types/movement';
import type { Patient } from '@/types/patient';
import { formatDateTime } from './dateUtils';

export function sessionToCsv(
  session: ExerciseSession,
  patient: Patient | undefined,
  measurements: MovementMeasurement[]
): string {
  const lines: string[] = [];
  lines.push('SmartMotion Session Report');
  lines.push(`Session ID,${session.id}`);
  lines.push(`Patient,${patient?.displayName ?? session.patientId}`);
  lines.push(`Exercise,${EXERCISE_LABELS[session.exerciseType]}`);
  lines.push(`Start,${formatDateTime(session.startTime)}`);
  lines.push(`End,${session.endTime ? formatDateTime(session.endTime) : ''}`);
  lines.push(`Duration (s),${session.duration.toFixed(1)}`);
  lines.push(`Repetitions,${session.repetitions}`);
  lines.push(`Max Angle,${session.maxAngle.toFixed(1)}`);
  lines.push(`Min Angle,${session.minAngle.toFixed(1)}`);
  lines.push(`Average Angle,${session.averageAngle.toFixed(1)}`);
  lines.push(`Confidence,${(session.qualityMetrics.averageConfidence * 100).toFixed(0)}%`);
  lines.push(`Data Quality,${session.qualityMetrics.dataQuality}`);
  if (session.walkingSummary) {
    lines.push(`Steps,${session.walkingSummary.totalSteps}`);
    lines.push(`Cadence (spm),${session.walkingSummary.cadence.toFixed(1)}`);
    lines.push(`Consistency,${(session.walkingSummary.consistency * 100).toFixed(0)}%`);
  }
  lines.push('');
  lines.push('timestamp_ms,joint_angle,confidence,phase');
  for (const m of measurements) {
    lines.push(`${m.timestamp},${m.jointAngle.toFixed(2)},${m.landmarkConfidence.toFixed(3)},${m.movementPhase}`);
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSessionReport(
  session: ExerciseSession,
  patient: Patient | undefined,
  measurements: MovementMeasurement[]
): void {
  const csv = sessionToCsv(session, patient, measurements);
  const slug = EXERCISE_LABELS[session.exerciseType].toLowerCase().replace(/\s+/g, '-');
  downloadText(`smartmotion-${slug}-${session.id}.csv`, csv, 'text/csv');
}


function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens a print-ready, comprehensive report for one exercise session.
 * In the browser print dialog choose "Save as PDF".
 */
export function openExerciseReportPdf(
  session: ExerciseSession,
  patient: Patient | undefined,
  measurements: MovementMeasurement[],
): void {
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) {
    window.alert('The report window was blocked. Allow pop-ups for SmartMotion and try again.');
    return;
  }

  const exercise = EXERCISE_LABELS[session.exerciseType] ?? session.exerciseType;
  const assessments = session.repetitionAssessments ?? [];
  const assessable = assessments.filter((item) => item.status !== 'not_assessable');
  const targetMet = assessable.filter((item) => item.status === 'target_met').length;
  const belowTarget = assessable.filter((item) => item.status === 'below_target').length;
  const notAssessable = assessments.length - assessable.length;
  const targetRate = assessable.length ? (targetMet / assessable.length * 100).toFixed(1) : null;
  const date = formatDateTime(session.startTime);
  const endDate = session.endTime ? formatDateTime(session.endTime) : 'Not recorded';
  const duration = `${Math.floor(session.duration / 60)} min ${Math.round(session.duration % 60)} sec`;
  const flags = (session as ExerciseSession & { mistakeEvents?: Array<{ text?: string; message?: string; level?: string }> }).mistakeEvents ?? [];
  const sampleMeasurements = measurements.filter((_, i) =>
    measurements.length <= 30 || i % Math.ceil(measurements.length / 30) === 0
  ).slice(0, 30);

  const assessmentRows = assessments.length
    ? assessments.map((item) => {
        const status = item.status === 'target_met' ? 'Target met'
          : item.status === 'below_target' ? 'Below target' : 'Not assessable';
        return `<tr><td>${item.repNumber}</td><td>${Number(item.peakAngle).toFixed(1)}°</td><td>${Number(item.minimumAngle).toFixed(1)}°</td><td>${item.targetAngle == null ? '—' : `${item.targetAngle}°`}</td><td>${escapeHtml(status)}</td><td>${escapeHtml(item.note)}</td></tr>`;
      }).join('')
    : '<tr><td colspan="6">No repetition-level assessments were saved for this session.</td></tr>';

  const measurementRows = sampleMeasurements.length
    ? sampleMeasurements.map((m) => `<tr><td>${new Date(m.timestamp).toLocaleTimeString()}</td><td>${m.jointAngle.toFixed(1)}°</td><td>${(m.landmarkConfidence * 100).toFixed(0)}%</td><td>${escapeHtml(m.movementPhase)}</td></tr>`).join('')
    : '<tr><td colspan="4">No frame-level measurements were saved.</td></tr>';

  const flagContent = flags.length
    ? `<ul>${flags.map((flag) => `<li>${escapeHtml(flag.text ?? flag.message ?? 'Movement feedback recorded')} ${flag.level ? `(${escapeHtml(flag.level)})` : ''}</li>`).join('')}</ul>`
    : '<p>No feedback flags were recorded.</p>';

  const reportStatus = targetRate === null
    ? 'Measurement report only — repetition quality was not assessable.'
    : 'Single-angle range-of-motion screening only. Reaching a target does not establish that the complete repetition was correct or clinically safe.';

  popup.document.open();
  popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>SmartMotion - ${escapeHtml(exercise)} Report</title>
<style>
  *{box-sizing:border-box} body{font:13px Arial,sans-serif;color:#17243b;margin:28px;line-height:1.45}
  h1{font-size:25px;margin:0 0 4px;color:#142d50} h2{font-size:16px;margin:24px 0 8px;color:#142d50}
  .muted{color:#64748b}.header{border-bottom:3px solid #1aa68b;padding-bottom:14px}
  .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 20px;margin-top:14px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
  .stat{border:1px solid #dbe4ef;border-radius:8px;padding:10px}.stat b{display:block;font-size:21px;color:#142d50}
  .stat span{font-size:11px;color:#64748b}
  table{width:100%;border-collapse:collapse;font-size:11px} th{background:#edf3f8;text-align:left}
  th,td{border:1px solid #dbe4ef;padding:7px;vertical-align:top}
  .notice{background:#fff8e8;border-left:4px solid #d69a24;padding:10px;margin-top:12px}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #dbe4ef;color:#64748b;font-size:10px}
  .toolbar{margin-bottom:16px}.toolbar button{padding:9px 14px;background:#142d50;color:white;border:0;border-radius:6px;cursor:pointer}
  @media print{body{margin:12mm}.toolbar{display:none}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid} }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button> <span class="muted">Choose “Save as PDF” in the print destination.</span></div>
<div class="header"><div class="muted">SMARTMOTION · INDIVIDUAL EXERCISE REPORT</div><h1>${escapeHtml(exercise)}</h1><div class="muted">Report ID: ${escapeHtml(`exercise-report-${session.id}`)}</div>
<div class="meta"><div><b>Patient:</b> ${escapeHtml(patient?.displayName ?? session.patientId)}</div><div><b>Patient ID:</b> ${escapeHtml(session.patientId)}</div><div><b>Session ID:</b> ${escapeHtml(session.id)}</div><div><b>Session date:</b> ${escapeHtml(date)}</div><div><b>Start:</b> ${escapeHtml(date)}</div><div><b>End:</b> ${escapeHtml(endDate)}</div><div><b>Camera position:</b> ${escapeHtml(session.cameraPosition)}</div><div><b>Record type:</b> ${session.isDemo ? 'Synthetic demo record' : 'Recorded session'}</div></div></div>
<h2>1. Session summary</h2><div class="stats">
<div class="stat"><b>${session.repetitions}</b><span>Repetitions detected</span></div>
<div class="stat"><b>${duration}</b><span>Exercise duration</span></div>
<div class="stat"><b>${session.qualityMetrics.trackingReliability == null ? '—' : `${Math.round(session.qualityMetrics.trackingReliability * 100)}%`}</b><span>Tracking reliability</span></div>
<div class="stat"><b>${session.qualityMetrics.dataQuality.toUpperCase()}</b><span>Tracking data quality</span></div>
</div>
<h2>2. Repetition-level screening results</h2><div class="stats">
<div class="stat"><b>${targetMet}</b><span>Reached configured ROM target</span></div>
<div class="stat"><b>${belowTarget}</b><span>Below configured ROM target</span></div>
<div class="stat"><b>${notAssessable}</b><span>Not assessable</span></div>
<div class="stat"><b>${targetRate === null ? 'N/A' : `${targetRate}%`}</b><span>Target attainment among assessable reps</span></div>
</div>
<table><thead><tr><th>Rep</th><th>Peak angle</th><th>Minimum angle</th><th>Configured target</th><th>Result</th><th>Observation</th></tr></thead><tbody>${assessmentRows}</tbody></table>
<div class="notice"><b>Interpretation:</b> ${escapeHtml(reportStatus)} These results are movement-screening measurements from the current camera pipeline, not validated overall correctness scores or a diagnosis.</div>
<h2>3. Joint-angle measurements</h2><div class="meta"><div><b>Maximum recorded angle:</b> ${session.maxAngle.toFixed(1)}°</div><div><b>Minimum recorded angle:</b> ${session.minAngle.toFixed(1)}°</div><div><b>Average recorded angle:</b> ${session.averageAngle.toFixed(1)}°</div><div><b>Average landmark confidence:</b> ${(session.qualityMetrics.averageConfidence * 100).toFixed(1)}%</div></div>
<h2>4. Sampled movement timeline</h2><p class="muted">Up to 30 evenly sampled measurements are shown from the saved session. This is a summary, not every camera frame.</p>
<table><thead><tr><th>Time</th><th>Joint angle</th><th>Landmark confidence</th><th>Movement phase</th></tr></thead><tbody>${measurementRows}</tbody></table>
<h2>5. Recorded feedback and observations</h2>${flagContent}
<h2>6. Data quality and limitations</h2><ul>
<li>Tracking quality: ${escapeHtml(session.qualityMetrics.dataQuality)}.</li>
<li>Tracking reliability: ${session.qualityMetrics.trackingReliability == null ? 'Not available' : `${(session.qualityMetrics.trackingReliability * 100).toFixed(1)}%`} of frames had usable landmarks.</li>
<li>Camera-based joint angles are estimates and can be affected by camera position, occlusion, clothing, lighting and landmark detection.</li>
<li>“Target met” means only that the measured angle reached the configured single-angle target. It does not confirm alignment, balance, pain-free movement, compensation-free technique or clinical safety.</li>
<li>This report is intended to support supervised monitoring. It is not a substitute for assessment by a qualified healthcare professional.</li>
</ul>
<div class="footer">Generated by SmartMotion · ${escapeHtml(new Date().toLocaleString())} · ${session.isDemo ? 'SYNTHETIC DEMO DATA — NOT A REAL PATIENT ASSESSMENT' : 'Research prototype; not a certified medical device.'}</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script>
</body></html>`);
  popup.document.close();
}


export interface ApiExerciseReport {
  report_id: string;
  session_id: string;
  exercise_type: string;
  performed_at: string;
  duration_seconds: number;
  repetitions_detected: number;
  correct_repetitions: number | null;
  incorrect_repetitions: number | null;
  correctness_percentage: number | null;
  target_met_repetitions: number;
  below_target_repetitions: number;
  not_assessable_repetitions: number;
  repetition_assessments?: Array<{
    repNumber: number; peakAngle: number; minimumAngle: number;
    targetAngle: number | null; status: string; measurement?: string; note?: string;
  }>;
  max_angle: number;
  min_angle: number;
  average_angle: number;
  tracking_quality: string;
  feedback_flags?: Array<{ text?: string; message?: string; level?: string }>;
  is_demo: boolean;
  assessment_status: string;
  assessment_note: string;
}

/** Print a server-saved individual exercise report; choose Save as PDF in the print dialog. */
export function openApiExerciseReportPdf(
  report: ApiExerciseReport,
  patient: { id: string; display_name: string; email?: string },
): void {
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) {
    window.alert('The report window was blocked. Allow pop-ups for SmartMotion and try again.');
    return;
  }
  const title = EXERCISE_LABELS[report.exercise_type as keyof typeof EXERCISE_LABELS] ?? report.exercise_type;
  const items = report.repetition_assessments ?? [];
  const rows = items.length ? items.map((r) => `<tr><td>${r.repNumber}</td><td>${Number(r.peakAngle).toFixed(1)}°</td><td>${Number(r.minimumAngle).toFixed(1)}°</td><td>${r.targetAngle == null ? '—' : `${r.targetAngle}°`}</td><td>${escapeHtml(r.status.replace(/_/g, ' '))}</td><td>${escapeHtml(r.note ?? '')}</td></tr>`).join('') : '<tr><td colspan="6">No repetition-level assessment records are available.</td></tr>';
  const flags = report.feedback_flags?.length ? `<ul>${report.feedback_flags.map((f) => `<li>${escapeHtml(f.text ?? f.message ?? 'Feedback recorded')} ${f.level ? `(${escapeHtml(f.level)})` : ''}</li>`).join('')}</ul>` : '<p>No feedback flags were recorded.</p>';
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SmartMotion - ${escapeHtml(title)} report</title><style>
  *{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#17243b;margin:28px;line-height:1.5}h1{color:#142d50;margin:4px 0}h2{font-size:16px;color:#142d50;margin:24px 0 8px}.muted{color:#64748b}.header{border-bottom:3px solid #1aa68b;padding-bottom:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:16px 0}.card{border:1px solid #dbe4ef;border-radius:8px;padding:10px}.card b{display:block;font-size:21px}.card span{font-size:11px;color:#64748b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #dbe4ef;padding:7px;text-align:left;vertical-align:top}th{background:#edf3f8}.notice{background:#fff8e8;border-left:4px solid #d69a24;padding:10px}.toolbar{margin-bottom:16px}.toolbar button{padding:9px 14px;background:#142d50;color:white;border:0;border-radius:6px}@media print{body{margin:12mm}.toolbar{display:none}tr{break-inside:avoid}}</style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button> <span class="muted">Select “Save as PDF” in the print destination.</span></div>
  <div class="header"><div class="muted">SMARTMOTION · INDIVIDUAL EXERCISE REPORT</div><h1>${escapeHtml(title)}</h1><div class="muted">${escapeHtml(report.report_id)} · ${report.is_demo ? 'SYNTHETIC DEMO DATA' : 'Patient session record'}</div><p><b>Patient:</b> ${escapeHtml(patient.display_name)} &nbsp; <b>Patient ID:</b> ${escapeHtml(patient.id)} &nbsp; <b>Email:</b> ${escapeHtml(patient.email ?? 'Not provided')}</p><p><b>Performed:</b> ${escapeHtml(new Date(report.performed_at).toLocaleString())} &nbsp; <b>Session ID:</b> ${escapeHtml(report.session_id)}</p></div>
  <h2>1. Exercise summary</h2><div class="grid"><div class="card"><b>${report.repetitions_detected}</b><span>Repetitions detected</span></div><div class="card"><b>${Math.round(report.duration_seconds)} sec</b><span>Duration</span></div><div class="card"><b>${report.tracking_quality.toUpperCase()}</b><span>Tracking quality</span></div><div class="card"><b>${report.assessment_status.replace(/_/g,' ')}</b><span>Assessment type</span></div></div>
  <h2>2. Repetition screening</h2><div class="grid"><div class="card"><b>${report.target_met_repetitions}</b><span>Configured ROM target met</span></div><div class="card"><b>${report.below_target_repetitions}</b><span>Below configured target</span></div><div class="card"><b>${report.not_assessable_repetitions}</b><span>Not assessable</span></div><div class="card"><b>${report.correctness_percentage == null ? 'N/A' : `${report.correctness_percentage}%`}</b><span>Target attainment rate</span></div></div>
  <table><thead><tr><th>Rep</th><th>Peak angle</th><th>Minimum angle</th><th>Target</th><th>Result</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="notice"><b>Important interpretation:</b> ${escapeHtml(report.assessment_note)} This is not a validated full-form correctness score or a clinical assessment.</div>
  <h2>3. Recorded joint-angle measurements</h2><p>Maximum: ${Number(report.max_angle).toFixed(1)}° · Minimum: ${Number(report.min_angle).toFixed(1)}° · Average: ${Number(report.average_angle).toFixed(1)}°</p>
  <h2>4. Feedback and observations</h2>${flags}
  <h2>5. Limitations and intended use</h2><ul><li>Camera-derived joint angles are estimates and depend on camera placement, visibility, lighting and pose detection.</li><li>Reaching a single-angle ROM target does not confirm alignment, balance, control, absence of compensation, pain-free movement or clinical safety.</li><li>This report supports supervised monitoring and is not a diagnosis or a substitute for assessment by a qualified healthcare professional.</li></ul>
  <p class="muted" style="border-top:1px solid #dbe4ef;padding-top:12px;font-size:10px">Generated by SmartMotion · ${escapeHtml(new Date().toLocaleString())} · ${report.is_demo ? 'SYNTHETIC DEMO DATA — NOT A REAL PATIENT ASSESSMENT' : 'Research prototype; not a certified medical device.'}</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`);
  popup.document.close();
}
