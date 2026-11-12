import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Dashboard,
  Exercises,
  LiveMonitoring,
  WalkingAnalysis,
  Patients,
  PatientDetails,
  SessionHistory,
  ProgressReports,
  Settings,
} from '@/pages/Pages';
import type { ExerciseType } from '@/types/movement';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AcceptInvitePage, LoginPage, PatientPortal } from '@/auth/AuthPages';
import { DoctorPatientsPage } from '@/auth/DoctorPatientsPage';

const supportedExercises: ExerciseType[] = [
  'm01', 'm02', 'm03', 'm04', 'm05',
  'm06', 'm07', 'm08', 'm09', 'm10',
  'shoulder_flexion', 'shoulder_abduction', 'elbow_flexion', 'walking_analysis',
];

function LiveMonitoringRoute() {
  const [searchParams] = useSearchParams();
  const requestedExercise = searchParams.get('exercise');
  const forcedExercise = supportedExercises.includes(requestedExercise as ExerciseType)
    ? (requestedExercise as ExerciseType)
    : undefined;

  return <LiveMonitoring forcedExercise={forcedExercise} />;
}

function ProtectedLayout({ role }: { role: 'doctor' | 'patient' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-navy-500">Loading secure session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'patient' ? '/patient-portal' : '/'} replace />;
  return <AppLayout />;
}
function ProtectedPatientPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-navy-500">Loading secure session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'patient') return <Navigate to="/" replace />;
  return <PatientPortal />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/patient-portal" element={<ProtectedPatientPage />} />
      <Route element={<ProtectedLayout role="doctor" />}>

        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveMonitoringRoute />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="walking" element={<WalkingAnalysis />} />
        <Route path="patients" element={<DoctorPatientsPage />} />
        <Route path="patients/:id" element={<PatientDetails />} />
        <Route path="reports" element={<ProgressReports />} />
        <Route path="sessions" element={<SessionHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
