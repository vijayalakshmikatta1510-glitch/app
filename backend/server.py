from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import hashlib
import logging
import os
import secrets
import uuid

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "pulse")
JWT_SECRET = os.environ.get("PULSE_JWT_SECRET", "development-only-change-me")
JWT_ALGORITHM = "HS256"
SESSION_DAYS = 14
PRIVATE_UPLOAD_DIR = Path(os.environ.get("PULSE_PRIVATE_UPLOAD_DIR", str(ROOT_DIR / "private_uploads")))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
app = FastAPI(title="Pulse API", version="1.0.0")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("pulse")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "age": user["age"],
        "gender": user["gender"],
        "state": user["state"],
        "city": user["city"],
        "phone": user["phone"],
        "email": user.get("email"),
        "email_verified": user.get("email_verified", False),
        "phone_verified": user.get("phone_verified", False),
        "created_at": user["created_at"],
    }


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=1, le=110)
    gender: str = Field(min_length=1, max_length=40)
    state: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name", "state", "city", "phone")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class VerifyOtpRequest(BaseModel):
    user_id: str
    otp: str = Field(min_length=6, max_length=6)


class ResetRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    age: Optional[int] = Field(default=None, ge=1, le=110)
    gender: Optional[str] = Field(default=None, min_length=1, max_length=40)
    state: Optional[str] = Field(default=None, min_length=2, max_length=80)
    city: Optional[str] = Field(default=None, min_length=2, max_length=80)


class AssessmentSubmit(BaseModel):
    answers: Dict[str, Any]
    timezone: str = Field(default="UTC", min_length=1, max_length=80)


class CheckInRequest(BaseModel):
    check_in_date: str
    movement: str = Field(min_length=1, max_length=30)
    nourishment: str = Field(min_length=1, max_length=30)
    wellbeing: str = Field(min_length=1, max_length=30)
    reflection: Optional[str] = Field(default=None, max_length=500)
    timezone: str = Field(default="UTC", min_length=1, max_length=80)


class AppointmentRequest(BaseModel):
    doctor_id: str
    requested_date: str
    consultation_mode: str = Field(min_length=1, max_length=30)


class ConsentUpdate(BaseModel):
    consent_type: str = Field(min_length=2, max_length=80)
    granted: bool


class CommunityPostRequest(BaseModel):
    group_id: str
    body: str = Field(min_length=1, max_length=1000)


ASSESSMENT_QUESTIONS = [
    {"id": "q1", "prompt": "How often do you check in with how you feel?", "type": "single", "options": ["Daily", "Weekly", "Rarely"]},
    {"id": "q2", "prompt": "How would you describe your recent movement?", "type": "single", "options": ["Consistent", "Some days", "Not yet"]},
    {"id": "q3", "prompt": "Have you noticed any changes you want to track?", "type": "multi", "options": ["Energy", "Sleep", "Mood", "Cycle", "None"]},
    {"id": "q4", "prompt": "How is your sleep lately?", "type": "single", "options": ["Restful", "Mixed", "Difficult"]},
    {"id": "q5", "prompt": "Which areas would you like more awareness around?", "type": "multi", "options": ["Nutrition", "Movement", "Stress", "Sleep", "Appointments"]},
    {"id": "q6", "prompt": "How supported do you feel in your health journey?", "type": "single", "options": ["Supported", "Sometimes", "Not sure"]},
    {"id": "q7", "prompt": "How often do you make time for a pause or reset?", "type": "single", "options": ["Often", "Sometimes", "Rarely"]},
    {"id": "q8", "prompt": "How confident are you reading your health information?", "type": "single", "options": ["Confident", "Learning", "Need support"]},
    {"id": "q9", "prompt": "What would make your next week feel more manageable?", "type": "multi", "options": ["A simple plan", "More rest", "A conversation", "Small reminders"]},
    {"id": "q10", "prompt": "What is your intention for using Pulse?", "type": "single", "options": ["Build awareness", "Track patterns", "Prepare for care"]},
]


def calculate_assessment(answers: Dict[str, Any]) -> tuple[int, Dict[str, int], List[Dict[str, str]]]:
    score_by_answer = {"Daily": 10, "Consistent": 10, "Restful": 10, "Supported": 10, "Often": 10, "Confident": 10, "Build awareness": 10, "Weekly": 7, "Some days": 7, "Mixed": 6, "Sometimes": 6, "Learning": 7, "Track patterns": 8, "Rarely": 3, "Not yet": 3, "Difficult": 3, "Not sure": 4, "Need support": 4, "Prepare for care": 8}
    question_scores: Dict[str, int] = {}
    flags: List[Dict[str, str]] = []
    for question in ASSESSMENT_QUESTIONS:
        value = answers.get(question["id"])
        values = value if isinstance(value, list) else [value]
        question_score = round(sum(score_by_answer.get(str(item), 5) for item in values) / max(len(values), 1))
        question_scores[question["id"]] = question_score
        if question["id"] == "q3" and "None" not in values:
            flags.append({"code": "track_changes", "label": "Worth tracking", "reason": "You noted changes you may want to observe over time."})
        if question["id"] == "q4" and value == "Difficult":
            flags.append({"code": "sleep_awareness", "label": "Sleep awareness", "reason": "Your sleep response may be useful to discuss with a qualified professional if it continues."})
        if question["id"] == "q6" and value == "Not sure":
            flags.append({"code": "support", "label": "Support check", "reason": "A trusted person or qualified professional may help you feel more supported."})
    total = round(sum(question_scores.values()) / len(question_scores) * 10)
    unique_flags = {flag["code"]: flag for flag in flags}
    return total, question_scores, list(unique_flags.values())


async def current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id, jti = payload.get("sub"), payload.get("jti")
        if not user_id or not jti:
            raise ValueError("Invalid session")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    session = await db.sessions.find_one({"jti": jti, "user_id": user_id, "revoked": False}, {"_id": 0})
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not session or not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user


async def issue_session(user_id: str) -> str:
    jti = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.sessions.insert_one({"jti": jti, "user_id": user_id, "revoked": False, "created_at": now_iso(), "expires_at": expires.isoformat()})
    return jwt.encode({"sub": user_id, "jti": jti, "exp": expires}, JWT_SECRET, algorithm=JWT_ALGORITHM)


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "Pulse API", "status": "ready"}


@api_router.get("/health")
async def health() -> Dict[str, str]:
    await db.command("ping")
    return {"status": "ok"}


@api_router.post("/auth/register")
async def register(payload: RegisterRequest) -> Dict[str, Any]:
    email = str(payload.email).lower() if payload.email else None
    if not email:
        raise HTTPException(status_code=422, detail="An email address is required for email/password authentication")
    duplicate = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
    if duplicate:
        raise HTTPException(status_code=409, detail="Unable to create this account. Check your details or log in.")
    user_id = str(uuid.uuid4())
    otp = str(secrets.randbelow(900000) + 100000)
    user = {
        "id": user_id,
        "full_name": payload.full_name,
        "age": payload.age,
        "gender": payload.gender,
        "state": payload.state,
        "city": payload.city,
        "phone": payload.phone,
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        "email_verified": False,
        "phone_verified": False,
        "otp_hash": hash_value(otp),
        "otp_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(user)
    response: Dict[str, Any] = {"user_id": user_id, "message": "Account created. Verify the development code to continue."}
    if os.environ.get("ENVIRONMENT", "development") != "production":
        response["dev_otp"] = otp
    return response


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtpRequest) -> Dict[str, Any]:
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user or user.get("otp_expires_at", "") < now_iso() or not secrets.compare_digest(user.get("otp_hash", ""), hash_value(payload.otp)):
        raise HTTPException(status_code=400, detail="That verification code is invalid or expired")
    await db.users.update_one({"id": payload.user_id}, {"$set": {"email_verified": True, "updated_at": now_iso()}, "$unset": {"otp_hash": "", "otp_expires_at": ""}})
    user["email_verified"] = True
    token = await issue_session(payload.user_id)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(payload: LoginRequest) -> Dict[str, Any]:
    user = await db.users.find_one({"email": str(payload.email).lower()}, {"_id": 0})
    if not user or not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Unable to sign in with those details")
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")
    token = await issue_session(user["id"])
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None), user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    await db.sessions.update_one({"jti": payload["jti"], "user_id": user["id"]}, {"$set": {"revoked": True, "revoked_at": now_iso()}})
    return {"message": "Signed out"}


@api_router.post("/auth/request-reset")
async def request_reset(payload: ResetRequest) -> Dict[str, Any]:
    user = await db.users.find_one({"email": str(payload.email).lower()}, {"_id": 0, "id": 1})
    response: Dict[str, Any] = {"message": "If an account matches, recovery instructions will be available shortly."}
    if user and os.environ.get("ENVIRONMENT", "development") != "production":
        code = str(secrets.randbelow(900000) + 100000)
        await db.users.update_one({"id": user["id"]}, {"$set": {"reset_hash": hash_value(code), "reset_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}})
        response["dev_reset_code"] = code
    return response


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest) -> Dict[str, str]:
    user = await db.users.find_one({"email": str(payload.email).lower()}, {"_id": 0})
    if not user or user.get("reset_expires_at", "") < now_iso() or not secrets.compare_digest(user.get("reset_hash", ""), hash_value(payload.reset_code)):
        raise HTTPException(status_code=400, detail="That recovery code is invalid or expired")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode(), "updated_at": now_iso()}, "$unset": {"reset_hash": "", "reset_expires_at": ""}})
    await db.sessions.update_many({"user_id": user["id"]}, {"$set": {"revoked": True, "revoked_at": now_iso()}})
    return {"message": "Password updated. Please sign in again."}


@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return {"user": public_user(user)}


@api_router.get("/profile")
async def get_profile(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return {"user": public_user(user)}


@api_router.patch("/profile")
async def update_profile(payload: ProfileUpdate, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    changes = {key: value.strip() if isinstance(value, str) else value for key, value in payload.model_dump(exclude_none=True).items()}
    if changes:
        changes["updated_at"] = now_iso()
        await db.users.update_one({"id": user["id"]}, {"$set": changes})
        user.update(changes)
    return {"user": public_user(user)}


@api_router.get("/assessment/questions")
async def assessment_questions(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return {"version": "awareness-v1", "disclaimer": "Pulse is a health-awareness tool, not a diagnostic or treatment service.", "questions": ASSESSMENT_QUESTIONS}


@api_router.post("/assessment")
async def submit_assessment(payload: AssessmentSubmit, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    missing = [question["id"] for question in ASSESSMENT_QUESTIONS if not payload.answers.get(question["id"])]
    if missing:
        raise HTTPException(status_code=422, detail=f"Please answer all required questions: {', '.join(missing)}")
    total, question_scores, flags = calculate_assessment(payload.answers)
    record = {"id": str(uuid.uuid4()), "user_id": user["id"], "answers": payload.answers, "question_scores": question_scores, "total_score": total, "attention_flags": flags, "scoring_rule_version": "awareness-v1", "timezone": payload.timezone, "created_at": now_iso()}
    await db.assessments.insert_one(record)
    record.pop("_id", None)
    return record


@api_router.get("/assessment/latest")
async def latest_assessment(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    record = await db.assessments.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    return {"assessment": record}


@api_router.get("/assessment/history")
async def assessment_history(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    records = await db.assessments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"assessments": records}


async def pulse_summary(user_id: str) -> Dict[str, Any]:
    records = await db.checkins.find({"user_id": user_id}, {"_id": 0}).sort("check_in_date", -1).to_list(100)
    by_date = {record["check_in_date"]: record for record in records}
    today = date.today()
    streak = 0
    cursor = today
    while cursor.isoformat() in by_date:
        streak += 1
        cursor -= timedelta(days=1)
    days = []
    for offset in range(6, -1, -1):
        day = (today - timedelta(days=offset)).isoformat()
        days.append({"date": day, "complete": day in by_date})
    return {"streak": streak, "days": days, "today": by_date.get(today.isoformat()), "total_checkins": len(records)}


@api_router.get("/pulse60")
async def get_pulse60(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return await pulse_summary(user["id"])


@api_router.post("/pulse60")
async def save_pulse60(payload: CheckInRequest, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    try:
        date.fromisoformat(payload.check_in_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="check_in_date must use YYYY-MM-DD")
    existing = await db.checkins.find_one({"user_id": user["id"], "check_in_date": payload.check_in_date}, {"_id": 0})
    record = {"id": existing["id"] if existing else str(uuid.uuid4()), "user_id": user["id"], **payload.model_dump(), "updated_at": now_iso(), "created_at": existing.get("created_at", now_iso()) if existing else now_iso()}
    if existing:
        await db.checkins.replace_one({"id": existing["id"], "user_id": user["id"]}, record)
    else:
        await db.checkins.insert_one(record)
    record.pop("_id", None)
    return {"check_in": record, "summary": await pulse_summary(user["id"])}


@api_router.post("/uploads")
async def upload_private_file(file: UploadFile = File(...), purpose: str = Form("health_report"), confirmed_date: Optional[str] = Form(default=None), user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and PDF files are accepted")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB")
    if file.content_type == "image/jpeg" and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=415, detail="The file content does not match its type")
    if file.content_type == "image/png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=415, detail="The file content does not match its type")
    if file.content_type == "application/pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="The file content does not match its type")
    upload_id = str(uuid.uuid4())
    PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    storage_name = f"{upload_id}{allowed[file.content_type]}"
    (PRIVATE_UPLOAD_DIR / storage_name).write_bytes(content)
    record = {"id": upload_id, "user_id": user["id"], "purpose": purpose, "confirmed_date": confirmed_date, "original_name": file.filename or "upload", "content_type": file.content_type, "size": len(content), "storage_name": storage_name, "validation_status": "validated", "user_confirmed": bool(confirmed_date), "created_at": now_iso()}
    await db.uploads.insert_one(record)
    record.pop("_id", None)
    record.pop("storage_name", None)
    return record


@api_router.get("/uploads")
async def list_uploads(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    records = await db.uploads.find({"user_id": user["id"]}, {"_id": 0, "storage_name": 0}).sort("created_at", -1).to_list(100)
    return {"uploads": records}


@api_router.get("/uploads/{upload_id}/download")
async def download_upload(upload_id: str, user: Dict[str, Any] = Depends(current_user)) -> FileResponse:
    record = await db.uploads.find_one({"id": upload_id, "user_id": user["id"]}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    path = PRIVATE_UPLOAD_DIR / record["storage_name"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File is no longer available")
    return FileResponse(path, media_type=record["content_type"], filename=record["original_name"])


@api_router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: str, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    record = await db.uploads.find_one_and_delete({"id": upload_id, "user_id": user["id"]}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    path = PRIVATE_UPLOAD_DIR / record["storage_name"]
    if path.exists():
        path.unlink()
    return {"message": "File deleted"}


@api_router.get("/doctors")
async def list_doctors(city: Optional[str] = None, area: Optional[str] = None, speciality: Optional[str] = None, language: Optional[str] = None, available: Optional[bool] = None, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if area:
        query["service_area"] = {"$regex": area, "$options": "i"}
    if speciality:
        query["speciality"] = {"$regex": speciality, "$options": "i"}
    if language:
        query["languages"] = {"$regex": language, "$options": "i"}
    if available is not None:
        query["availability_status"] = "available" if available else {"$ne": "available"}
    doctors = await db.doctors.find(query, {"_id": 0}).to_list(100)
    return {"doctors": doctors}


@api_router.get("/appointments")
async def list_appointments(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    appointments = await db.appointments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"appointments": appointments}


@api_router.post("/appointments")
async def create_appointment(payload: AppointmentRequest, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    doctor = await db.doctors.find_one({"id": payload.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    duplicate = await db.appointments.find_one({"user_id": user["id"], "doctor_id": payload.doctor_id, "requested_date": payload.requested_date, "status": {"$in": ["pending_confirmation", "confirmed"]}}, {"_id": 0, "id": 1})
    if duplicate:
        raise HTTPException(status_code=409, detail="You already have an appointment request for this time")
    record = {"id": str(uuid.uuid4()), "user_id": user["id"], "doctor_id": doctor["id"], "doctor_name": doctor.get("name", "Doctor"), "requested_date": payload.requested_date, "consultation_mode": payload.consultation_mode, "status": "pending_confirmation", "created_at": now_iso(), "updated_at": now_iso()}
    await db.appointments.insert_one(record)
    record.pop("_id", None)
    return record


@api_router.delete("/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    result = await db.appointments.update_one({"id": appointment_id, "user_id": user["id"], "status": {"$in": ["pending_confirmation", "confirmed"]}}, {"$set": {"status": "cancelled", "updated_at": now_iso()}})
    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Appointment not found or already closed")
    return {"message": "Appointment request cancelled"}


@api_router.get("/community/groups")
async def community_groups(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    groups = await db.community_groups.find({}, {"_id": 0}).to_list(100)
    memberships = await db.memberships.find({"user_id": user["id"]}, {"_id": 0, "group_id": 1}).to_list(100)
    member_ids = {item["group_id"] for item in memberships}
    return {"groups": [{**group, "joined": group["id"] in member_ids} for group in groups]}


@api_router.post("/community/groups/{group_id}/join")
async def join_group(group_id: str, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    group = await db.community_groups.find_one({"id": group_id}, {"_id": 0, "id": 1})
    if not group:
        raise HTTPException(status_code=404, detail="Community group not found")
    await db.memberships.update_one({"group_id": group_id, "user_id": user["id"]}, {"$set": {"group_id": group_id, "user_id": user["id"], "created_at": now_iso()}}, upsert=True)
    return {"message": "Joined community"}


@api_router.delete("/community/groups/{group_id}/join")
async def leave_group(group_id: str, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    await db.memberships.delete_one({"group_id": group_id, "user_id": user["id"]})
    return {"message": "Left community"}


@api_router.get("/community/posts")
async def community_posts(group_id: Optional[str] = None, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    query = {"group_id": group_id} if group_id else {}
    posts = await db.community_posts.find(query, {"_id": 0, "author_user_id": 0}).sort("created_at", -1).to_list(100)
    return {"posts": posts}


@api_router.post("/community/posts")
async def create_community_post(payload: CommunityPostRequest, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    membership = await db.memberships.find_one({"group_id": payload.group_id, "user_id": user["id"]}, {"_id": 0})
    if not membership:
        raise HTTPException(status_code=403, detail="Join the group before posting")
    record = {"id": str(uuid.uuid4()), "group_id": payload.group_id, "author_user_id": user["id"], "author_name": user["full_name"], "body": payload.body.strip(), "created_at": now_iso()}
    await db.community_posts.insert_one(record)
    record.pop("_id", None)
    record.pop("author_user_id", None)
    return record


@api_router.get("/consents")
async def get_consents(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    consents = await db.consents.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(100)
    return {"consents": consents}


@api_router.put("/consents")
async def update_consent(payload: ConsentUpdate, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    record = {"user_id": user["id"], "consent_type": payload.consent_type, "granted": payload.granted, "updated_at": now_iso(), "granted_at": now_iso() if payload.granted else None}
    await db.consents.update_one({"user_id": user["id"], "consent_type": payload.consent_type}, {"$set": record}, upsert=True)
    record.pop("user_id", None)
    return record


@api_router.get("/timeline")
async def timeline(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    events: List[Dict[str, Any]] = []
    for item in await db.assessments.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "total_score": 1, "created_at": 1}).to_list(50):
        events.append({"id": item["id"], "type": "assessment", "title": "Pulse Score updated", "detail": f"Awareness score {item['total_score']}/100", "created_at": item["created_at"]})
    for item in await db.checkins.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "check_in_date": 1, "created_at": 1}).to_list(50):
        events.append({"id": item["id"], "type": "checkin", "title": "Pulse 60 check-in", "detail": item["check_in_date"], "created_at": item["created_at"]})
    for item in await db.uploads.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "purpose": 1, "created_at": 1}).to_list(50):
        events.append({"id": item["id"], "type": "upload", "title": "Private report uploaded", "detail": item["purpose"], "created_at": item["created_at"]})
    return {"events": sorted(events, key=lambda item: item["created_at"], reverse=True)}


@api_router.delete("/account")
async def delete_account(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, str]:
    user_id = user["id"]
    upload_cursor = db.uploads.find({"user_id": user_id}, {"_id": 0, "storage_name": 1})
    async for upload in upload_cursor:
        path = PRIVATE_UPLOAD_DIR / upload["storage_name"]
        if path.exists():
            path.unlink()
    for collection in ["sessions", "assessments", "checkins", "uploads", "appointments", "memberships", "community_posts", "consents"]:
        await db[collection].delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": "Account and private records deleted"}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=False, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup() -> None:
    await db.users.create_index("email", unique=True)
    await db.checkins.create_index([("user_id", 1), ("check_in_date", 1)], unique=True)
    await db.sessions.create_index("jti", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()