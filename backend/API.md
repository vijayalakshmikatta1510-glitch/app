# Pulse API

Base path: `/api`. Private routes require `Authorization: Bearer <session-token>`. All timestamps are ISO-8601 UTC strings unless a user-provided date is explicitly named.

## Authentication

- `POST /auth/register` — body: `full_name`, `age`, `gender`, `state`, `city`, `phone`, `email`, `password`. Creates an unverified account. Development responses include a randomly generated `dev_otp`; production responses never include an OTP.
- `POST /auth/verify-otp` — body: `user_id`, `otp`; activates the account and returns `{ token, user }`.
- `POST /auth/login` — body: `email`, `password`; returns `{ token, user }` for verified users.
- `POST /auth/logout` — revokes the current server-side session.
- `POST /auth/request-reset` and `POST /auth/reset-password` — password recovery flow; development reset codes are returned only in development.
- `GET /auth/me` — restores the authenticated profile.

## Health awareness

- `GET /assessment/questions` — versioned, non-diagnostic awareness questions.
- `POST /assessment` — body `{ answers, timezone }`; validates all ten answers, stores individual scores, total score, scoring version, and independent attention flags.
- `GET /assessment/latest` and `GET /assessment/history` — user-owned score history.
- `GET /pulse60` — server-calculated streak, seven-day progress, and today’s check-in.
- `POST /pulse60` — body `{ check_in_date, movement, nourishment, wellbeing, reflection?, timezone }`; upserts the user’s date-specific check-in and recalculates progress server-side.
- `GET /timeline` — user-owned assessment, check-in, and upload events.

## Private files

- `POST /uploads` — multipart `file`, `purpose`, optional `confirmed_date`; accepts validated JPEG, PNG, or PDF files up to 10 MB and stores them outside public web directories.
- `GET /uploads` — metadata only.
- `GET /uploads/{id}/download` — owner-authorized download.
- `DELETE /uploads/{id}` — owner-authorized deletion.

## Care, community, and privacy

- `GET /doctors` — stored doctor records with optional city, area, speciality, language, and availability filters.
- `GET/POST /appointments`, `DELETE /appointments/{id}` — user-owned appointment requests. New requests are `pending_confirmation` until a real scheduling source confirms them.
- `GET /community/groups`, `POST/DELETE /community/groups/{id}/join` — opt-in group membership.
- `GET/POST /community/posts` — member-only community posts; private health fields are not exposed.
- `GET/PUT /consents` — explicit, timestamped sharing grants and revocations.
- `PATCH /profile` and `DELETE /account` — profile updates and deletion of the user’s private records/files.

All private queries include the authenticated owner relationship. Error responses use FastAPI’s `{ "detail": "..." }` shape; failed writes are never reported as successful.