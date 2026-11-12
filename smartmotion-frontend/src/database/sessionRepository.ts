import { getDB } from './indexedDB';
import type { ExerciseSession } from '@/types/session';
import type { MovementMeasurement } from '@/types/movement';

export async function listSessions(): Promise<ExerciseSession[]> {
  const db = await getDB();
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.startTime - a.startTime);
}

export async function listSessionsForPatient(patientId: string): Promise<ExerciseSession[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'by-patient', patientId);
  return all.sort((a, b) => b.startTime - a.startTime);
}

export async function getSession(id: string): Promise<ExerciseSession | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function saveSession(session: ExerciseSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
  const measures = await db.getAllFromIndex('measurements', 'by-session', id);
  for (const m of measures) await db.delete('measurements', m.id);
}

export async function saveMeasurements(measurements: MovementMeasurement[]): Promise<void> {
  if (measurements.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('measurements', 'readwrite');
  await Promise.all(measurements.map((m) => tx.store.put(m)));
  await tx.done;
}

export async function listMeasurements(sessionId: string): Promise<MovementMeasurement[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('measurements', 'by-session', sessionId);
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export async function newSessionId(): Promise<string> {
  return `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
