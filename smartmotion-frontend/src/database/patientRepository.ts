import { getDB } from './indexedDB';
import type { Patient, PatientInput } from '@/types/patient';

export async function listPatients(): Promise<Patient[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('patients', 'by-createdAt');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const db = await getDB();
  return db.get('patients', id);
}

export async function createPatient(input: PatientInput): Promise<Patient> {
  const db = await getDB();
  const patient: Patient = {
    id: `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    ...input,
  };
  await db.put('patients', patient);
  return patient;
}

export async function updatePatient(id: string, patch: Partial<PatientInput>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('patients', id);
  if (!existing) return;
  await db.put('patients', { ...existing, ...patch });
}

export async function deletePatient(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('patients', id);
  // Cascade: delete the patient's sessions + measurements.
  const sessions = await db.getAllFromIndex('sessions', 'by-patient', id);
  for (const s of sessions) {
    await db.delete('sessions', s.id);
    const measures = await db.getAllFromIndex('measurements', 'by-session', s.id);
    for (const m of measures) await db.delete('measurements', m.id);
  }
}
