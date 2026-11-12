from pathlib import Path
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib, os, secrets, smtplib, ssl

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import create_engine, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session, relationship
from pwdlib import PasswordHash
import jwt
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
MODEL_PATH = BASE_DIR / "models" / "smartmotion_quality_random_forest.joblib"
DATABASE_URL = os.getenv("SMARTMOTION_DATABASE_URL", f"sqlite:///{BASE_DIR / 'smartmotion.db'}")
JWT_SECRET = os.getenv("SMARTMOTION_JWT_SECRET", "CHANGE_THIS_DEVELOPMENT_SECRET_BEFORE_DEPLOYMENT")
JWT_ALGORITHM = "HS256"
JWT_DAYS = int(os.getenv("SMARTMOTION_JWT_DAYS", "7"))
password_hash = PasswordHash.recommended()

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: secrets.token_urlsafe(16))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: secrets.token_urlsafe(16))
    doctor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, unique=True)
    invite_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    invite_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class SessionRecord(Base):
    __tablename__ = "exercise_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    exercise_type: Mapped[str] = mapped_column(String(60))
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration: Mapped[float] = mapped_column(Float, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    max_angle: Mapped[float] = mapped_column(Float, default=0)
    min_angle: Mapped[float] = mapped_column(Float, default=0)
    average_angle: Mapped[float] = mapped_column(Float, default=0)
    data_quality: Mapped[str] = mapped_column(String(20), default="unknown")
    mistake_events: Mapped[list] = mapped_column(JSON, default=list)
    repetition_assessments: Mapped[list] = mapped_column(JSON, default=list)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(engine)

# Backward-compatible SQLite migration for existing local installations.
if DATABASE_URL.startswith("sqlite"):
    with engine.begin() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(exercise_sessions)").fetchall()}
        if "repetition_assessments" not in columns:
            connection.exec_driver_sql("ALTER TABLE exercise_sessions ADD COLUMN repetition_assessments JSON")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def normalize_email(email: str) -> str: return email.strip().lower()
def token_hash(token: str) -> str: return hashlib.sha256(token.encode()).hexdigest()
def make_token(user: User) -> str:
    return jwt.encode({"sub": user.id, "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = db.get(User, payload.get("sub"))
    except Exception:
        user = None
    if not user: raise HTTPException(401, "Invalid or expired session")
    return user

def require_role(user: User, role: str):
    if user.role != role: raise HTTPException(403, f"{role.title()} access required")

def send_invite_email(to_email: str, patient_name: str, invite_url: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host: return False
    msg = EmailMessage()
    msg["Subject"] = "Invitation to SmartMotion patient portal"
    msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", ""))
    msg["To"] = to_email
    msg.set_content(f"Hello {patient_name},\n\nYour doctor invited you to SmartMotion. Create your patient account using this secure link:\n{invite_url}\n\nThis invitation expires in 7 days.")
    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls(context=ssl.create_default_context())
        user = os.getenv("SMTP_USER"); password = os.getenv("SMTP_PASSWORD")
        if user and password: server.login(user, password)
        server.send_message(msg)
    return True

app = FastAPI(title="SmartMotion API", version="2.0.0", description="Authentication, patient invitations, progress records, and research model API.")
allowed_origins = [origin.strip() for origin in os.getenv("SMARTMOTION_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class DoctorRegister(BaseModel): email: EmailStr; full_name: str = Field(min_length=2, max_length=120); password: str = Field(min_length=10, max_length=128)
class PatientRegister(BaseModel): email: EmailStr; full_name: str = Field(min_length=2, max_length=120); password: str = Field(min_length=10, max_length=128); invitation_token: str
class LoginInput(BaseModel): email: EmailStr; password: str
class InviteInput(BaseModel): email: EmailStr; display_name: str = Field(min_length=1, max_length=120); age: int | None = Field(default=None, ge=0, le=120)
class SessionInput(BaseModel): id: str; patient_id: str; exercise_type: str; start_time: datetime; duration: float = Field(ge=0); repetitions: int = Field(ge=0); max_angle: float = 0; min_angle: float = 0; average_angle: float = 0; data_quality: str = "unknown"; mistake_events: list[dict] = Field(default_factory=list); repetition_assessments: list[dict] = Field(default_factory=list); is_demo: bool = False

@app.get("/")
def home():
    return {"message":"SmartMotion API is running", "auth":"enabled", "model":"Random Forest", "features_required": int(bundle["input_features"]) if MODEL_PATH.exists() and "bundle" in globals() else 726, "warning":"Model requires Kinect-derived features; not raw MediaPipe landmarks."}

@app.get("/health")
def health(): return {"status":"healthy", "database":"connected", "auth":"enabled", "model_loaded": bool(MODEL_PATH.exists())}

@app.post("/auth/register-doctor")
def register_doctor(data: DoctorRegister, db: Session = Depends(get_db)):
    email = normalize_email(str(data.email))
    if db.scalar(select(User).where(User.email == email)): raise HTTPException(409, "An account with this email already exists")
    user = User(email=email, full_name=data.full_name.strip(), password_hash=password_hash.hash(data.password), role="doctor")
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": make_token(user), "token_type":"bearer", "user":{"id":user.id,"email":user.email,"full_name":user.full_name,"role":user.role}}

@app.post("/auth/register-patient")
def register_patient(data: PatientRegister, db: Session = Depends(get_db)):
    email = normalize_email(str(data.email))
    if db.scalar(select(User).where(User.email == email)): raise HTTPException(409, "An account with this email already exists")
    patient = db.scalar(select(Patient).where(Patient.email == email, Patient.invite_token_hash == token_hash(data.invitation_token)))
    if not patient or not patient.invite_expires or patient.invite_expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc): raise HTTPException(400, "Invitation is invalid or expired")
    user = User(email=email, full_name=data.full_name.strip(), password_hash=password_hash.hash(data.password), role="patient")
    db.add(user); db.flush(); patient.user_id = user.id; patient.invite_token_hash = None; patient.invite_expires = None
    db.commit(); db.refresh(user)
    return {"access_token":make_token(user),"token_type":"bearer","user":{"id":user.id,"email":user.email,"full_name":user.full_name,"role":user.role}}

@app.post("/auth/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == normalize_email(str(data.email))))
    if not user or not password_hash.verify(data.password, user.password_hash): raise HTTPException(401, "Email or password is incorrect")
    return {"access_token":make_token(user),"token_type":"bearer","user":{"id":user.id,"email":user.email,"full_name":user.full_name,"role":user.role}}

@app.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"id":user.id,"email":user.email,"full_name":user.full_name,"role":user.role}

@app.post("/doctor/patients/invite")
def invite_patient(data: InviteInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user,"doctor"); email=normalize_email(str(data.email))
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user: raise HTTPException(409,"This email already has a SmartMotion account")
    patient = db.scalar(select(Patient).where(Patient.doctor_id == user.id, Patient.email == email))
    if not patient:
        patient = Patient(doctor_id=user.id,email=email,display_name=data.display_name.strip(),age=data.age)
        db.add(patient)
    else:
        patient.display_name=data.display_name.strip(); patient.age=data.age
    raw_token=secrets.token_urlsafe(32)
    patient.invite_token_hash=token_hash(raw_token); patient.invite_expires=datetime.now(timezone.utc)+timedelta(days=7)
    db.commit(); db.refresh(patient)
    frontend_url=os.getenv("SMARTMOTION_FRONTEND_URL","http://localhost:5173")
    invite_url=f"{frontend_url.rstrip('/')}/accept-invite?token={raw_token}&email={email}"
    email_sent=False
    try: email_sent=send_invite_email(email,patient.display_name,invite_url)
    except Exception: email_sent=False
    return {"patient_id":patient.id,"email":email,"invite_url":invite_url,"email_sent":email_sent,"expires_in_days":7,"message":"Invitation email sent" if email_sent else "Invitation created. Configure SMTP to send email automatically; share the invitation link securely for now."}

@app.get("/doctor/patients")
def doctor_patients(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user,"doctor")
    rows=db.scalars(select(Patient).where(Patient.doctor_id==user.id).order_by(Patient.created_at.desc())).all()
    return [{"id":p.id,"email":p.email,"display_name":p.display_name,"age":p.age,"registered":p.user_id is not None,"created_at":p.created_at.isoformat()} for p in rows]

@app.get("/doctor/patients/{patient_id}/progress")
def doctor_patient_progress(patient_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user,"doctor")
    patient=db.scalar(select(Patient).where(Patient.id==patient_id,Patient.doctor_id==user.id))
    if not patient: raise HTTPException(404,"Patient not found")
    sessions=db.scalars(select(SessionRecord).where(SessionRecord.patient_id==patient.id).order_by(SessionRecord.start_time.desc())).all()
    return progress_payload(patient,sessions)

def progress_payload(patient, sessions):
    return {"patient":{"id":patient.id,"display_name":patient.display_name,"email":patient.email},"summary":{"sessions":len(sessions),"repetitions":sum(s.repetitions for s in sessions),"duration_seconds":round(sum(s.duration for s in sessions),1),"mistake_events":sum(len(s.mistake_events or []) for s in sessions)},"reporting":{"correctness_scoring":"single_angle_rom_screening","note":"Per-repetition results show only whether the configured single-angle range-of-motion target was reached; they are not a full form or clinical correctness assessment."},"sessions":[{"id":s.id,"exercise_type":s.exercise_type,"start_time":s.start_time.isoformat(),"duration":s.duration,"repetitions":s.repetitions,"max_angle":s.max_angle,"average_angle":s.average_angle,"data_quality":s.data_quality,"mistake_events":s.mistake_events or [],"repetition_assessments":s.repetition_assessments or [],"is_demo":s.is_demo} for s in sessions]}

@app.get("/patient/progress")
def patient_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user,"patient")
    patient=db.scalar(select(Patient).where(Patient.user_id==user.id))
    if not patient: raise HTTPException(404,"No doctor-linked patient profile was found")
    sessions=db.scalars(select(SessionRecord).where(SessionRecord.patient_id==patient.id).order_by(SessionRecord.start_time.desc())).all()
    return progress_payload(patient,sessions)

@app.post("/doctor/sessions")
def save_doctor_session(data: SessionInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user,"doctor")
    patient=db.scalar(select(Patient).where(Patient.id==data.patient_id,Patient.doctor_id==user.id))
    if not patient: raise HTTPException(404,"Patient is not assigned to this doctor")
    record=db.get(SessionRecord,data.id)
    if record and record.doctor_id != user.id: raise HTTPException(403,"Cannot modify this session")
    if not record: record=SessionRecord(id=data.id,patient_id=patient.id,doctor_id=user.id,exercise_type=data.exercise_type,start_time=data.start_time)
    record.patient_id=patient.id; record.exercise_type=data.exercise_type; record.start_time=data.start_time
    record.duration=data.duration; record.repetitions=data.repetitions; record.max_angle=data.max_angle; record.min_angle=data.min_angle; record.average_angle=data.average_angle
    record.data_quality=data.data_quality; record.mistake_events=data.mistake_events; record.repetition_assessments=data.repetition_assessments; record.is_demo=data.is_demo
    db.add(record); db.commit()
    return {"saved":True,"session_id":record.id}


DEMO_PATIENT_ID = "SM-DEMO-PATIENT-001"
DEMO_PATIENT_EMAIL = "demo.patient@smartmotion.local"
DEMO_PATIENT_PASSWORD = "SmartMotionDemo!2026"

@app.post("/doctor/demo-patient")
def ensure_demo_patient(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Create a fixed, clearly-labelled demo patient for local development checks."""
    require_role(user, "doctor")
    if os.getenv("SMARTMOTION_ENABLE_DEMO_PATIENT", "false").lower() not in {"1", "true", "yes"}:
        raise HTTPException(403, "Demo patient creation is disabled")
    patient = db.get(Patient, DEMO_PATIENT_ID)
    if patient and patient.doctor_id != user.id:
        raise HTTPException(409, "The fixed demo patient is already assigned to another doctor in this database")
    demo_user = db.scalar(select(User).where(User.email == DEMO_PATIENT_EMAIL))
    if demo_user and demo_user.role != "patient":
        raise HTTPException(409, "The demo email is already used by a non-patient account")
    if patient and patient.user_id and demo_user and patient.user_id != demo_user.id:
        raise HTTPException(409, "The demo patient is linked to a different account")
    if not patient:
        patient = Patient(id=DEMO_PATIENT_ID, doctor_id=user.id, email=DEMO_PATIENT_EMAIL,
                          display_name="SmartMotion Demo Patient", age=35)
        db.add(patient)
        db.flush()
    if not demo_user:
        demo_user = User(email=DEMO_PATIENT_EMAIL, full_name="SmartMotion Demo Patient",
                         password_hash=password_hash.hash(DEMO_PATIENT_PASSWORD), role="patient")
        db.add(demo_user)
        db.flush()
    patient.user_id = demo_user.id
    db.commit()
    # Add clearly-labelled sample sessions and repetition-level ROM examples.
    # These are synthetic demo records, never real patient assessments.
    demo_assessments = {
        "m01": [{"repNumber": i + 1, "peakAngle": 92.0 if i < 14 else 78.0, "minimumAngle": 8.0,
                  "targetAngle": 90, "status": "target_met" if i < 14 else "below_target",
                  "criterion": "deep_squat_knee_rom", "measurement": "Selected-side knee flexion range",
                  "note": "Illustrative demo-only ROM target result."} for i in range(18)],
        "m05": [{"repNumber": i + 1, "peakAngle": 83.0 if i < 13 else 68.0, "minimumAngle": 7.0,
                  "targetAngle": 80, "status": "target_met" if i < 13 else "below_target",
                  "criterion": "sit_to_stand_knee_rom", "measurement": "Selected-side knee flexion range",
                  "note": "Illustrative demo-only ROM target result."} for i in range(15)],
        "m07": [{"repNumber": i + 1, "peakAngle": 125.0 if i < 8 else 102.0, "minimumAngle": 10.0,
                  "targetAngle": 120, "status": "target_met" if i < 8 else "below_target",
                  "criterion": "shoulder_abduction_rom", "measurement": "Selected-side shoulder elevation/abduction proxy",
                  "note": "Illustrative demo-only ROM target result."} for i in range(12)],
    }
    existing = db.scalar(select(func.count()).select_from(SessionRecord).where(SessionRecord.patient_id == DEMO_PATIENT_ID)) or 0
    if existing == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        samples = [
            ("m01", 18, 115.0, 82.0, 98.0, [{"text":"Demo feedback: maintain knee alignment","level":"warning"}]),
            ("m05", 15, 105.0, 76.0, 91.0, []),
            ("m07", 12, 160.0, 45.0, 103.0, [{"text":"Demo feedback: avoid shoulder elevation compensation","level":"warning"}]),
        ]
        for idx, (exercise, reps, max_a, min_a, avg_a, flags) in enumerate(samples):
            db.add(SessionRecord(id=f"SM-DEMO-SESSION-{idx+1:03d}", patient_id=DEMO_PATIENT_ID,
                doctor_id=user.id, exercise_type=exercise, start_time=now-timedelta(days=7-idx*3),
                duration=150+idx*30, repetitions=reps, max_angle=max_a, min_angle=min_a,
                average_angle=avg_a, data_quality="demo", mistake_events=flags,
                repetition_assessments=demo_assessments[exercise], is_demo=True))
        db.commit()
    else:
        # Upgrade demo records created by earlier project versions with illustrative
        # repetition summaries so the updated report screen can be tested.
        demo_sessions = db.scalars(select(SessionRecord).where(SessionRecord.patient_id == DEMO_PATIENT_ID)).all()
        for demo_session in demo_sessions:
            if demo_session.is_demo and not (demo_session.repetition_assessments or []) and demo_session.exercise_type in demo_assessments:
                demo_session.repetition_assessments = demo_assessments[demo_session.exercise_type]
        db.commit()
    return {"patient_id": DEMO_PATIENT_ID, "email": DEMO_PATIENT_EMAIL,
            "password": DEMO_PATIENT_PASSWORD, "message": "Demo account ready. Credentials are for local development only."}


def build_patient_reports(patient: Patient, sessions: list[SessionRecord]):
    reports = []
    for session in sessions:
        # Existing model is recording-level Kinect-trained; it does not validate individual reps
        # from this MediaPipe application. Therefore correctness is intentionally not fabricated.
        rep_items = session.repetition_assessments or []
        assessable = [item for item in rep_items if item.get("status") in {"target_met", "below_target"}]
        target_met = sum(1 for item in assessable if item.get("status") == "target_met")
        below_target = sum(1 for item in assessable if item.get("status") == "below_target")
        not_assessable = len(rep_items) - len(assessable)
        target_met_rate = round((target_met / len(assessable)) * 100, 1) if assessable else None
        reports.append({"report_id": f"exercise-report-{session.id}", "session_id": session.id,
            "exercise_type": session.exercise_type, "performed_at": session.start_time.isoformat(),
            "duration_seconds": session.duration, "repetitions_detected": session.repetitions,
            "correct_repetitions": None,
            "incorrect_repetitions": None,
            "correctness_percentage": target_met_rate,
            "target_met_repetitions": target_met, "below_target_repetitions": below_target,
            "not_assessable_repetitions": not_assessable,
            "repetition_assessments": rep_items,
            "max_angle": session.max_angle, "min_angle": session.min_angle,
            "average_angle": session.average_angle, "tracking_quality": session.data_quality,
            "feedback_flags": session.mistake_events or [], "is_demo": session.is_demo,
            "assessment_status": "range_of_motion_screening" if assessable else ("not_assessable" if rep_items else "measurement_only"),
            "assessment_note": "Counts indicate only whether the measured single-angle proxy met the configured ROM target. They do not establish overall exercise correctness or clinical safety."})
    total_reps = sum(s.repetitions for s in sessions)
    total_duration = round(sum(s.duration for s in sessions), 1)
    all_assessments = [item for session in sessions for item in (session.repetition_assessments or [])]
    assessable_all = [item for item in all_assessments if item.get("status") in {"target_met", "below_target"}]
    total_target_met = sum(1 for item in assessable_all if item.get("status") == "target_met")
    total_below_target = sum(1 for item in assessable_all if item.get("status") == "below_target")
    overall_target_rate = round(total_target_met / len(assessable_all) * 100, 1) if assessable_all else None
    return {"patient": {"id": patient.id, "display_name": patient.display_name, "email": patient.email},
        "summary": {"exercise_reports": len(reports), "sessions": len(sessions), "repetitions_detected": total_reps,
            "duration_seconds": total_duration, "feedback_flags": sum(len(s.mistake_events or []) for s in sessions),
            "correct_repetitions": None,
            "incorrect_repetitions": None,
            "correctness_percentage": overall_target_rate,
            "not_assessable_repetitions": len(all_assessments) - len(assessable_all)},
        "exercise_reports": reports,
        "patient_summary": {"generated": bool(sessions), "scope": "all_saved_exercise_sessions", "exercise_count": len({s.exercise_type for s in sessions}),
            "total_repetitions_detected": total_reps, "total_duration_seconds": total_duration,
            "assessment_status": "range_of_motion_screening" if assessable_all else "measurement_only", "note": "Aggregated single-angle ROM target screening only; not a full form or clinical assessment."}}

@app.get("/patient/reports")
def patient_reports(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "patient")
    patient = db.scalar(select(Patient).where(Patient.user_id == user.id))
    if not patient: raise HTTPException(404, "No doctor-linked patient profile was found")
    sessions = db.scalars(select(SessionRecord).where(SessionRecord.patient_id == patient.id).order_by(SessionRecord.start_time.desc())).all()
    return build_patient_reports(patient, sessions)

@app.get("/doctor/patients/{patient_id}/reports")
def doctor_patient_reports(patient_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "doctor")
    patient = db.scalar(select(Patient).where(Patient.id == patient_id, Patient.doctor_id == user.id))
    if not patient: raise HTTPException(404, "Patient not found")
    sessions = db.scalars(select(SessionRecord).where(SessionRecord.patient_id == patient.id).order_by(SessionRecord.start_time.desc())).all()
    return build_patient_reports(patient, sessions)


# Existing research model inference endpoint. The model bundle is only loaded if present.
bundle = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
class PredictionRequest(BaseModel): features: list[float] = Field(..., min_length=int(bundle["input_features"]) if bundle else 726, max_length=int(bundle["input_features"]) if bundle else 726)
@app.post("/predict")
def predict(request: PredictionRequest):
    if bundle is None: raise HTTPException(503,"Research model is not installed")
    values=request.features
    if not all(np.isfinite(v) for v in values): raise HTTPException(422,"Features must be finite")
    frame=pd.DataFrame([values],columns=bundle["feature_names"])
    prediction=str(bundle["model"].predict(frame)[0]); probs=bundle["model"].predict_proba(frame)[0]
    return {"prediction":prediction,"confidence":round(float(np.max(probs)),4),"probabilities":{str(k):round(float(v),6) for k,v in zip(bundle["model"].classes_,probs)},"measurement_source":bundle.get("measurement_source","Kinect Angles"),"disclaimer":"Research prototype only; not a clinical assessment."}
