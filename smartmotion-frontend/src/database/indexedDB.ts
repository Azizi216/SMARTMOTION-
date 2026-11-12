import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ExerciseSession } from '@/types/session';
import type { Patient } from '@/types/patient';
import type { MovementMeasurement } from '@/types/movement';

interface SmartMotionDB extends DBSchema {
  patients: {
    key: string;
    value: Patient;
    indexes: { 'by-createdAt': number };
  };
  sessions: {
    key: string;
    value: ExerciseSession;
    indexes: { 'by-patient': string; 'by-startTime': number };
  };
  measurements: {
    key: string;
    value: MovementMeasurement;
    indexes: { 'by-session': string };
  };
}

const DB_NAME = 'smartmotion-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SmartMotionDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SmartMotionDB>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<SmartMotionDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('patients')) {
        const store = db.createObjectStore('patients', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('by-patient', 'patientId');
        store.createIndex('by-startTime', 'startTime');
      }
      if (!db.objectStoreNames.contains('measurements')) {
        const store = db.createObjectStore('measurements', { keyPath: 'id' });
        store.createIndex('by-session', 'sessionId');
      }
    },
  });
  return dbPromise;
}

export async function wipeAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('patients');
  await db.clear('sessions');
  await db.clear('measurements');
}
