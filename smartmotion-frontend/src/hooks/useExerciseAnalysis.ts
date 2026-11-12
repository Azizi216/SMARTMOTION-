
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ExerciseType,
  ArmSide,
  LiveSample,
  FeedbackMessage,
  MovementPhase,
  Landmarks,
  StepEvent,
} from '@/types/movement';

import {
  shoulderFlexionAngle,
  shoulderAbductionAngle,
  elbowFlexionAngle,
  kneeFlexionAngle,
} from '@/biomechanics/shoulderAnalysis';

import {
  calculateAngle,
  getLandmark,
  POSE_INDEX,
  averageConfidence,
} from '@/biomechanics/angleCalculator';

import {
  createRepDetectorState,
  updateRepDetector,
  type RepDetectorState,
} from '@/analysis/repetitionDetector';

import {
  evaluateFeedback,
  makeFeedback,
} from '@/analysis/feedbackEngine';

import {
  createWalkingAnalyzerState,
  updateWalking,
  walkingConsistency,
  type WalkingAnalyzerState,
} from '@/analysis/walkingAnalyzer';

import type { ApplicationSettings } from '@/database/settingsStore';

import { generateDemoLandmarks } from '@/vision/demoData';

import {
  assessCompletedRepetition,
  type RepetitionAssessment,
} from '@/analysis/exerciseQuality';

interface StartOpts {
  video: HTMLVideoElement | null;
  detectFn?: (
    video: HTMLVideoElement,
    ts: number
  ) => {
    landmarks: Landmarks | null;
  };
}

export interface UseExerciseAnalysisResult {
  angle: number;
  confidence: number;
  valid: boolean;
  phase: MovementPhase;
  reps: number;
  maxAngle: number;
  minAngle: number;
  averageAngle: number;
  durationMs: number;
  samples: LiveSample[];
  feedback: FeedbackMessage[];
  repetitionAssessments: RepetitionAssessment[];

  // Walking
  walking: {
    totalSteps: number;
    leftSteps: number;
    rightSteps: number;
    cadence: number;
    kneeAngle: number;
    steps: StepEvent[];
  } | null;

  fps: number;
  running: boolean;

  start: () => void;
  stop: () => void;

  setArmSide: (s: ArmSide) => void;
  armSide: ArmSide;

  setExercise: (e: ExerciseType) => void;
  exercise: ExerciseType;

  setDemo: (d: boolean) => void;
  demo: boolean;

  // Latest landmarks for the canvas overlay.
  latestLandmarks: Landmarks | null;

  // Attach video and pose detection sources.
  attach: (
    video: HTMLVideoElement,
    detectFn?: StartOpts['detectFn']
  ) => void;
}

export function useExerciseAnalysis(
  settings: ApplicationSettings
): UseExerciseAnalysisResult {
  const [exercise, setExercise] =
    useState<ExerciseType>('shoulder_flexion');

  const [armSide, setArmSide] =
    useState<ArmSide>(settings.preferredArm);

  const [demo, setDemo] = useState(false);
  const [running, setRunning] = useState(false);

  const [angle, setAngle] = useState(NaN);
  const [confidence, setConfidence] = useState(0);
  const [valid, setValid] = useState(false);

  const [phase, setPhase] =
    useState<MovementPhase>('RESTING');

  const [reps, setReps] = useState(0);
  const [maxAngle, setMaxAngle] = useState(0);
  const [minAngle, setMinAngle] = useState(0);
  const [averageAngle, setAverageAngle] = useState(0);

  const [durationMs, setDurationMs] = useState(0);

  const [samples, setSamples] =
    useState<LiveSample[]>([]);

  const [feedback, setFeedback] =
    useState<FeedbackMessage[]>([]);

  const [repetitionAssessments, setRepetitionAssessments] =
    useState<RepetitionAssessment[]>([]);

  const [walking, setWalking] =
    useState<UseExerciseAnalysisResult['walking']>(null);

  const [fps, setFps] = useState(0);

  const [latestLandmarks, setLatestLandmarks] =
    useState<Landmarks | null>(null);

  const repStateRef =
    useRef<RepDetectorState>(createRepDetectorState());

  const walkStateRef =
    useRef<WalkingAnalyzerState>(createWalkingAnalyzerState());

  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const lastProcessRef = useRef<number>(0);

  const targetFpsRef =
    useRef<number>(settings.targetFps);

  const samplesRef = useRef<LiveSample[]>([]);
  const feedbackRef = useRef<FeedbackMessage[]>([]);
  const lastFeedbackRef = useRef<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const detectRef =
    useRef<StartOpts['detectFn'] | undefined>(undefined);

  const demoTimeRef = useRef<number>(0);

  // Update target FPS when settings change.
  useEffect(() => {
    targetFpsRef.current = settings.targetFps;
  }, [settings.targetFps]);

  // Add feedback and prevent consecutive duplicate messages.
  const pushFeedback = useCallback(
    (msg: FeedbackMessage | null) => {
      if (!msg) return;

      if (msg.text === lastFeedbackRef.current) {
        return;
      }

      lastFeedbackRef.current = msg.text;

      const list = [
        msg,
        ...feedbackRef.current,
      ].slice(0, 6);

      feedbackRef.current = list;
      setFeedback(list);
    },
    []
  );

  // Calculate the angle for the selected exercise.
  const computeAngle = useCallback(
    (
      landmarks: Landmarks | null
    ): {
      angle: number;
      confidence: number;
      valid: boolean;
    } => {
      switch (exercise) {
        case 'shoulder_flexion':
          return shoulderFlexionAngle(
            landmarks,
            armSide,
            settings.thresholds.shoulder_flexion.minConfidence
          );

        case 'shoulder_abduction':
          return shoulderAbductionAngle(
            landmarks,
            armSide,
            settings.thresholds.shoulder_abduction.minConfidence
          );

        case 'elbow_flexion':
          return elbowFlexionAngle(
            landmarks,
            armSide,
            settings.thresholds.elbow_flexion.minConfidence
          );

        case 'm01':
        case 'm03':
        case 'm04':
        case 'm05': {
          const knee = kneeFlexionAngle(
            landmarks,
            armSide,
            settings.thresholds[exercise].minConfidence
          );

          return {
            ...knee,
            angle: knee.valid ? 180 - knee.angle : NaN,
          };
        }

        case 'm02':
        case 'm06': {
          const shoulder = getLandmark(
            landmarks,
            armSide === 'left'
              ? POSE_INDEX.leftShoulder
              : POSE_INDEX.rightShoulder
          );

          const hip = getLandmark(
            landmarks,
            armSide === 'left'
              ? POSE_INDEX.leftHip
              : POSE_INDEX.rightHip
          );

          const knee = getLandmark(
            landmarks,
            armSide === 'left'
              ? POSE_INDEX.leftKnee
              : POSE_INDEX.rightKnee
          );

          const confidence = averageConfidence([
            shoulder,
            hip,
            knee,
          ]);

          const min =
            settings.thresholds[exercise].minConfidence;

          if (
            !shoulder ||
            !hip ||
            !knee ||
            confidence < min
          ) {
            return {
              angle: NaN,
              confidence,
              valid: false,
            };
          }

          const raw = calculateAngle(
            shoulder,
            hip,
            knee,
            false
          );

          return {
            angle: Number.isFinite(raw) ? 180 - raw : NaN,
            confidence,
            valid: Number.isFinite(raw),
          };
        }

        case 'm07':
          return shoulderAbductionAngle(
            landmarks,
            armSide,
            settings.thresholds[exercise].minConfidence
          );

        case 'm10':
          // 2D shoulder-elevation proxy only.
          // This is not a validated 3D scaption measurement.
          return shoulderAbductionAngle(
            landmarks,
            armSide,
            settings.thresholds[exercise].minConfidence
          );

        case 'm08':
        case 'm09':
          // A single RGB pose view cannot reliably determine
          // shoulder extension direction or axial rotation.
          return {
            angle: NaN,
            confidence: 0,
            valid: false,
          };

        default:
          return {
            angle: NaN,
            confidence: 0,
            valid: false,
          };
      }
    },
    [exercise, armSide, settings.thresholds]
  );

  // Main analysis loop.
  const tick = useCallback(() => {
    if (!running) return;

    const now = performance.now();

    const interval = 1000 / targetFpsRef.current;

    if (now - lastProcessRef.current < interval) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Calculate FPS.
    const dt = now - lastFrameRef.current;

    if (dt > 0) {
      const inst = 1000 / dt;

      setFps((prev) =>
        prev === 0
          ? inst
          : prev * 0.85 + inst * 0.15
      );
    }

    lastFrameRef.current = now;
    lastProcessRef.current = now;

    // Acquire landmarks from camera or demo mode.
    let landmarks: Landmarks | null = null;

    if (demo) {
      const elapsed =
        now - (startTimeRef.current || now);

      demoTimeRef.current = elapsed;

      landmarks = generateDemoLandmarks(
        exercise,
        armSide,
        elapsed
      );
    } else if (videoRef.current && detectRef.current) {
      const result = detectRef.current(
        videoRef.current,
        now
      );

      landmarks = result.landmarks;
    }

    setLatestLandmarks(landmarks);

    const elapsedMs = startTimeRef.current
      ? now - startTimeRef.current
      : 0;

    setDurationMs(elapsedMs);

    // Walking analysis.
    if (exercise === 'walking_analysis') {
      const { live } = updateWalking(
        walkStateRef.current,
        landmarks,
        elapsedMs
      );

      setWalking({
        totalSteps: live.totalSteps,
        leftSteps: live.leftSteps,
        rightSteps: live.rightSteps,
        cadence: live.cadence,
        kneeAngle: live.kneeAngle,
        steps: live.steps,
      });

      // Add knee angle sample for the graph.
      const knee = live.kneeAngle;

      const sample: LiveSample = {
        t: elapsedMs,
        angle: Number.isNaN(knee) ? 0 : knee,
        confidence: 1,
        phase: 'RESTING',
      };

      samplesRef.current = [
        ...samplesRef.current,
        sample,
      ].slice(-300);

      setSamples(samplesRef.current);

      setAngle(Number.isNaN(knee) ? NaN : knee);
      setValid(!Number.isNaN(knee));
      setConfidence(1);
    } else {
      // Normal exercise analysis.
      const {
        angle: a,
        confidence: c,
        valid: v,
      } = computeAngle(landmarks);

      setAngle(a);
      setConfidence(c);
      setValid(v);

      const thresholds = settings.thresholds[exercise];

      const {
        phase: ph,
        reps: r,
        repJustCompleted,
        completedRep,
        state,
      } = updateRepDetector(
        repStateRef.current,
        a,
        elapsedMs,
        thresholds
      );

      repStateRef.current = state;

      setPhase(ph);
      setReps(r);

      // Assess completed repetitions.
      if (completedRep) {
        const assessment = assessCompletedRepetition(
          exercise,
          completedRep.repNumber,
          completedRep.peakAngle,
          completedRep.minimumAngle,
          thresholds.targetAngle
        );

        setRepetitionAssessments((previous) => [
          ...previous,
          assessment,
        ]);
      }

      setMaxAngle(
        Number.isFinite(state.maxAngleEver)
          ? state.maxAngleEver
          : 0
      );

      setMinAngle(
        Number.isFinite(state.minAngleEver)
          ? state.minAngleEver
          : 0
      );

      const avg =
        state.angleCount > 0
          ? state.angleSum / state.angleCount
          : 0;

      setAverageAngle(avg);

      // Save sample.
      const sample: LiveSample = {
        t: elapsedMs,
        angle: Number.isNaN(a) ? 0 : a,
        confidence: c,
        phase: ph,
      };

      samplesRef.current = [
        ...samplesRef.current,
        sample,
      ].slice(-300);

      setSamples(samplesRef.current);

      // Evaluate feedback.
      const frameVisible =
        !!landmarks &&
        landmarks.some((l) => l.visibility > 0.4);

      const fb = evaluateFeedback({
        phase: ph,
        angle: a,
        confidence: c,
        valid: v,
        thresholds,
        repJustCompleted,
        frameVisible,
      });

      pushFeedback(fb);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [
    running,
    demo,
    exercise,
    armSide,
    computeAngle,
    settings.thresholds,
    pushFeedback,
  ]);

  // Start and stop the animation loop.
  useEffect(() => {
    if (running) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [running, tick]);

  // Start analysis.
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    lastFrameRef.current = performance.now();
    lastProcessRef.current = 0;

    repStateRef.current = createRepDetectorState();
    walkStateRef.current = createWalkingAnalyzerState();

    samplesRef.current = [];
    feedbackRef.current = [];
    lastFeedbackRef.current = '';

    setSamples([]);
    setFeedback([]);
    setRepetitionAssessments([]);

    setReps(0);
    setMaxAngle(0);
    setMinAngle(0);
    setAverageAngle(0);

    setDurationMs(0);
    setWalking(null);
    setFps(0);

    if (demo) {
      const message = makeFeedback(
        'info',
        'Demo mode is active. Values are simulated, not real measurements.'
      );

      setFeedback([message]);
      feedbackRef.current = [message];
    } else {
      const message = makeFeedback(
        'info',
        'Ready. Begin when comfortable.'
      );

      setFeedback([message]);
      feedbackRef.current = [message];
    }

    setRunning(true);
  }, [demo]);

  // Stop analysis.
  const stop = useCallback(() => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Attach video and pose detection sources.
  const attach = useCallback(
    (
      video: HTMLVideoElement,
      detectFn?: StartOpts['detectFn']
    ) => {
      videoRef.current = video;
      detectRef.current = detectFn;
    },
    []
  );

  // Calculate walking consistency.
  useEffect(() => {
    if (walking) {
      void walkingConsistency(walking.steps);
    }
  }, [walking]);

  // Reset analysis when the exercise changes.
  useEffect(() => {
    repStateRef.current = createRepDetectorState();
    walkStateRef.current = createWalkingAnalyzerState();

    samplesRef.current = [];

    setSamples([]);
    setRepetitionAssessments([]);
    setReps(0);
    setAngle(NaN);
    setPhase('RESTING');
  }, [exercise]);

  // Return analysis results and functions.
  return {
    angle,
    confidence,
    valid,
    phase,
    reps,
    maxAngle,
    minAngle,
    averageAngle,
    durationMs,
    samples,
    feedback,
    repetitionAssessments,
    walking,
    fps,
    running,
    start,
    stop,
    setArmSide,
    armSide,
    setExercise,
    exercise,
    setDemo,
    demo,
    latestLandmarks,
    attach,
  };
}
