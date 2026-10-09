# Pulse PRD

## Problem statement

Pulse is a mobile health-awareness application that helps people build a personal health profile, complete a ten-question awareness assessment, track daily Pulse 60 check-ins, keep a private timeline, find verified care-directory entries, request appointments, opt into community groups, and control sharing consent. It must not diagnose, prescribe, or expose private health data without authorization.

## Architecture

- Expo SDK 57 React Native client in `/app/frontend` with Expo Router entry, secure token storage, safe-area-aware screens, and a terracotta editorial light theme.
- FastAPI service in `/app/backend/server.py` with MongoDB via Motor, bcrypt passwords, JWT sessions backed by a revocable `sessions` collection, owner checks, validation, rate-safe generic auth errors, and local private upload storage.
- MongoDB collections are documented in `backend/migrations/001_initial_schema.md`; API details are in `backend/API.md`.
- No external provider integrations are active. OTP and reset codes are development-only server-generated values.

## Personas

- A health-aware user who wants an approachable, private way to notice patterns.
- A user preparing for a conversation with a qualified professional.
- A care-directory/community administrator who later supplies verified directory and group records.

## Static core requirements

1. Blank registration for every new user; no prototype person values are prefilled.
2. Secure email/password authentication with development-only OTP simulation and revocable sessions.
3. Persistent, versioned assessment answers, awareness score, independent attention flags, and history.
4. Server-calculated Pulse 60 check-ins, streaks, seven-day progress, and edits.
5. Private validated uploads and owner-authorized downloads/deletion.
6. Database-backed doctors, pending appointment requests, community membership, and consent controls.
7. Explicit loading, empty, retry/error, and non-diagnostic messaging.

## Implemented 2026-10-09 (remediation pass, verified)

- Acceptance remediation closed: every interactive element and key screen now exposes stable kebab-case `testID` selectors (auth fields/modes/OTP, home/assessment controls, Pulse 60 choices/save, care booking, consents, community join, tab nav, logout).
- Fixed the React Native web "Unexpected text node" warning; fresh-bundle logs are clean through the full register → OTP → home → all-tabs flow.
- `src/api.ts` now consumes the canonical `EXPO_PUBLIC_BACKEND_URL` contract (no dead variable, no hardcoded URLs).
- Appointment booking failures now surface a visible `care-booking-error` message instead of silently resetting; backend 404/409 error shapes verified.
- Backend verified end-to-end (25 checks): register, wrong-OTP rejection, OTP verify, login, 401 without token, assessment scoring (85) with attention flags, Pulse 60 same-day upsert, timeline, invalid-doctor 404, unknown-cancel 404, consent grant/revoke, cross-user isolation on assessments/appointments, logout invalidation (post-logout 401).
- `tests/test_smoke.py` hardened to load `EXPO_PUBLIC_BACKEND_URL` from `frontend/.env`; 3/3 passing. JS lint clean.

- Replaced the starter API with authenticated registration, OTP verification, login, logout, recovery, profile, account deletion, and private authorization endpoints.
- Added assessment questions/scoring version, independent awareness flags, score history, Pulse 60 persistence/streak calculation, timeline, uploads, doctor/appointment, community, and consent APIs.
- Rebuilt the Expo shell around the prototype’s registration-first visual language and connected Home, Assessment, Pulse 60, Care Directory, Profile, Community, and privacy states to real APIs.
- Confirmed no legitimate existing dataset was available; database starts empty and no demo seed was created.
- Smoke-tested registration, OTP verification, authenticated profile retrieval, assessment submission, and Pulse 60 persistence; Expo preview rendered the blank form.

## Prioritized backlog

### P0 — remaining before production use

- Connect a real verified OTP delivery provider and disable development code responses in production.
- Replace local private file storage with encrypted private object storage and short-lived signed access.
- Add administrator workflows for verified doctor, community, moderation, and availability records.
- Add automated pytest coverage for cross-user authorization, expired sessions, duplicate check-ins, upload validation, and account deletion.

### P1

- Add report/block/moderation UI, appointment cancellation UI, profile editing, and upload picker UI.
- Add timezone-aware local-date calculation and a documented rest-day shield policy if product rules are finalized.
- Add richer community post feed and filter controls for the care directory.

### P2

- Add push notification preferences and reminders.
- Add consent-scoped doctor sharing views and audit event browsing.
- Add accessibility review, native iconography, and end-to-end device coverage.

## Next tasks

1. Run the full Expo acceptance suite against registration, login, assessment, Pulse 60, privacy, and empty states.
2. Fix all blocking issues from that suite.
3. Add the real OTP/storage integrations only after credentials and provider behavior are agreed.