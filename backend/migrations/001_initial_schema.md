# Migration 001 — Pulse foundation

Date: 2026-10-09

Pulse uses MongoDB collections with string UUID primary keys so API responses never expose BSON `ObjectId` values. The backend startup creates the first required indexes and is safe to run repeatedly:

- `users.email` unique
- `sessions.jti` unique
- `checkins(user_id, check_in_date)` unique

Collections are created on first write: `users`, `sessions`, `assessments`, `checkins`, `uploads`, `doctors`, `appointments`, `community_groups`, `memberships`, `community_posts`, and `consents`.

No legitimate existing user or patient dataset was found in the starter repository or configured database, so there is no data migration to perform. Prototype values are not imported as patient records. Future schema changes should add a numbered migration document and update the startup/index routine without mutating historical assessment or check-in records.