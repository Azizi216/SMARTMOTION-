export interface Patient {
  id: string;
  displayName: string;
  age?: number;
  notes?: string;
  email?: string;
  remoteId?: string;
  createdAt: number;
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt'>;
