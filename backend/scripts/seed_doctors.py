"""Idempotent seed of sample care-directory doctor records.

These are SAMPLE records so the care directory and appointment booking can be
tested end-to-end. Replace them with real verified professional records
through an admin workflow before production use.

Run: python3 scripts/seed_doctors.py
"""
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

SAMPLE_DOCTORS = [
    {"id": "doc-meera-krishnan", "name": "Dr. Meera Krishnan", "designation": "MBBS, MD", "speciality": "General Medicine", "city": "Bengaluru", "service_area": "Indiranagar", "languages": ["English", "Kannada", "Hindi"], "verification_status": "Verified directory profile", "availability_status": "available"},
    {"id": "doc-arjun-nair", "name": "Dr. Arjun Nair", "designation": "MBBS, DNB", "speciality": "Cardiology", "city": "Kochi", "service_area": "Kadavanthra", "languages": ["English", "Malayalam"], "verification_status": "Verified directory profile", "availability_status": "available"},
    {"id": "doc-sana-qureshi", "name": "Dr. Sana Qureshi", "designation": "MBBS, MS", "speciality": "Gynaecology", "city": "Mumbai", "service_area": "Bandra West", "languages": ["English", "Hindi", "Urdu"], "verification_status": "Verified directory profile", "availability_status": "unavailable"},
    {"id": "doc-vikram-rao", "name": "Dr. Vikram Rao", "designation": "MBBS, MD", "speciality": "Endocrinology", "city": "Hyderabad", "service_area": "Banjara Hills", "languages": ["English", "Telugu", "Hindi"], "verification_status": "Verified directory profile", "availability_status": "available"},
    {"id": "doc-anjali-deshpande", "name": "Dr. Anjali Deshpande", "designation": "MBBS, DPM", "speciality": "Psychiatry", "city": "Pune", "service_area": "Koregaon Park", "languages": ["English", "Marathi", "Hindi"], "verification_status": "Verified directory profile", "availability_status": "available"},
    {"id": "doc-rohit-menon", "name": "Dr. Rohit Menon", "designation": "MBBS, MS", "speciality": "Orthopaedics", "city": "Chennai", "service_area": "Adyar", "languages": ["English", "Tamil"], "verification_status": "Verified directory profile", "availability_status": "unavailable"},
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "pulse")]
    now = datetime.now(timezone.utc).isoformat()
    for doctor in SAMPLE_DOCTORS:
        await db.doctors.update_one(
            {"id": doctor["id"]},
            {
                "$set": {**doctor, "data_source": "sample_seed", "availability_note": "Availability is indicative, not real-time", "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    count = await db.doctors.count_documents({})
    print(f"Seeded {len(SAMPLE_DOCTORS)} sample doctors; directory now holds {count} records.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
