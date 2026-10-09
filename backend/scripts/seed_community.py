"""Idempotent seed of sample community groups and welcome posts.

These are SAMPLE records so community joining and the post feed can be
experienced end-to-end. Posts are authored as "Pulse Community" (clearly
seeded content, not fake members). Replace with real moderated groups before
production use.

Run: python3 scripts/seed_community.py
"""
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

SAMPLE_GROUPS = [
    {"id": "grp-morning-walkers", "name": "Morning Walkers", "topic": "Daily walking habits and gentle motivation", "city": "Bengaluru"},
    {"id": "grp-heart-healthy-plate", "name": "The Heart-Healthy Plate", "topic": "Recipes and meal ideas for heart-conscious eating", "city": None},
    {"id": "grp-pcos-hormones", "name": "PCOS & hormones", "topic": "Living with PCOS and hormonal health", "city": "Bengaluru"},
    {"id": "grp-sleep-reset", "name": "Sleep reset", "topic": "Building a calmer night routine", "city": "Bengaluru"},
    {"id": "grp-desk-job-stress", "name": "Desk-job stress", "topic": "Unwinding from screen-heavy workdays", "city": "Bengaluru"},
    {"id": "grp-walk-30-club", "name": "Walk 30 club", "topic": "Thirty minutes of walking, most days", "city": "Bengaluru"},
]

SAMPLE_POSTS = [
    {"id": "post-walk-welcome", "group_id": "grp-morning-walkers", "author_user_id": "sample-seed", "author_name": "Pulse Community", "body": "Welcome! Share one small walking win from this week — even five minutes counts.", "created_at": "2026-10-05T07:30:00+00:00"},
    {"id": "post-walk-tip", "group_id": "grp-morning-walkers", "author_user_id": "sample-seed", "author_name": "Pulse Community", "body": "Gentle reminder: consistency beats intensity. A short daily walk supports mood, sleep, and heart health.", "created_at": "2026-10-06T07:30:00+00:00"},
    {"id": "post-plate-welcome", "group_id": "grp-heart-healthy-plate", "author_user_id": "sample-seed", "author_name": "Pulse Community", "body": "Welcome! Introduce yourself and share one heart-friendly swap you have made in your kitchen.", "created_at": "2026-10-05T09:00:00+00:00"},
    {"id": "post-plate-tip", "group_id": "grp-heart-healthy-plate", "author_user_id": "sample-seed", "author_name": "Pulse Community", "body": "Try swapping deep-fried snacks for roasted chana or a handful of nuts — small swaps add up over a season.", "created_at": "2026-10-06T09:00:00+00:00"},
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "pulse")]
    for group in SAMPLE_GROUPS:
        await db.community_groups.update_one({"id": group["id"]}, {"$set": {**group, "data_source": "sample_seed"}}, upsert=True)
    for post in SAMPLE_POSTS:
        await db.community_posts.update_one({"id": post["id"]}, {"$set": {**post, "data_source": "sample_seed"}}, upsert=True)
    groups = await db.community_groups.count_documents({})
    posts = await db.community_posts.count_documents({})
    print(f"Seeded {len(SAMPLE_GROUPS)} groups and {len(SAMPLE_POSTS)} posts; totals now {groups} groups, {posts} posts.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
