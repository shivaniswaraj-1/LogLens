# LogLens

**Application Log Analysis & Incident Tracking Platform.**

LogLens is a small internal engineering tool that automates a real production-support
workflow: instead of manually grepping through log files to find recurring errors,
noticing when error volume spikes, and tracking the resulting incidents in a
spreadsheet or chat thread, LogLens ingests raw logs, groups repeated errors into
patterns, flags abnormal error-rate spikes with a transparent statistical rule, and
gives you a lightweight incident tracker (status, assignee, notes, activity timeline)
tied directly to the error pattern that caused it.

There is no AI/ML anywhere in this project. Grouping and spike detection are both
deterministic, explainable algorithms — see below for exactly how they work and where
they fall short.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Recharts, React Router
- **Backend:** Node.js, TypeScript, Express
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** JWT (email/password, bcrypt-hashed passwords)
- **Testing:** Jest + Supertest (backend), `tsc`/ESLint/oxlint for type & lint checks

## Architecture

```
┌─────────────┐        REST/JSON, JWT bearer         ┌──────────────────┐
│   React SPA │ ───────────────────────────────────► │   Express API    │
│  (Vite dev  │ ◄─────────────────────────────────── │  (controllers →  │
│   server)   │                                       │  services → db)  │
└─────────────┘                                       └────────┬─────────┘
                                                                │ Prisma
                                                                ▼
                                                       ┌──────────────────┐
                                                       │   PostgreSQL     │
                                                       └──────────────────┘
```

Backend layering (`backend/src/`):

```
routes/       Express routers, one per resource, mounted under /api/*
controllers/  Parse+validate request, call a service, shape the HTTP response
services/     Business logic (ingestion, grouping, spike detection, incidents)
parsers/      Pure log-line parsing, no HTTP or DB knowledge
validators/   Zod schemas for request bodies/queries
middleware/   auth (JWT), upload (multer), centralized error handler
```

Every layer below `controllers/` is plain, dependency-injectable TypeScript with no
Express types in scope — `parsers/logParser.ts`, `services/errorGrouping.ts`, and
`services/spikeDetection.ts` are pure functions, which is what makes them unit
testable without a database (see `src/__tests__/`).

## Database schema

```
User ──< UploadBatch ──< Log >── ErrorPattern >── Incident ──< IncidentEvent
                                                      │
                                                   assignee, createdBy → User
```

- **User** — email/password (bcrypt) auth, `ADMIN` or `ENGINEER` role.
- **UploadBatch** — one row per ingest (file or pasted text), tracks line/parse/skip counts.
- **Log** — one row per parsed log line: timestamp, level, service, message, raw line,
  optional requestId/traceId, FK to the UploadBatch and (if ERROR/FATAL) the ErrorPattern.
- **ErrorPattern** — a normalized error signature (see below), with a running
  `occurrenceCount`, `firstSeenAt`/`lastSeenAt`.
- **Incident** — title, description, severity, status, investigation/resolution notes,
  optional link to an ErrorPattern, assignee and creator (both FKs to `User`).
- **IncidentEvent** — immutable activity-log rows (`CREATED`, `ASSIGNED`, `STATUS_CHANGED`,
  `SEVERITY_CHANGED`, `NOTE_ADDED`, `UNASSIGNED`) that back the incident timeline.

Indexes exist on every column used for filtering (`Log.timestamp`, `.level`, `.service`,
`.requestId`, `.traceId`, `.errorPatternId` and the composite `(service, level,
timestamp)`; `ErrorPattern.occurrenceCount`, `.lastSeenAt`; `Incident.status`,
`.severity`, `.createdAt`). See `backend/prisma/schema.prisma` for the full definition.

## The log format

LogLens parses a single documented plain-text format (`backend/src/parsers/logParser.ts`):

```
<timestamp> <LEVEL> <service> <message>
2026-09-23 10:01:21 ERROR payment-service Connection timeout for user 123
```

- `timestamp`: `YYYY-MM-DD HH:mm:ss`, optional `.SSS` milliseconds, `T` separator allowed.
- `LEVEL`: `DEBUG | INFO | WARN | WARNING | ERROR | FATAL` (case-insensitive, `WARNING` → `WARN`).
- `service`: one whitespace-free token.
- `message`: the rest of the line. A `requestId=` / `traceId=` (or `reqId=`,
  `request_id=`, `trace_id=`) token anywhere in the message is extracted automatically.

Lines that don't match are **never dropped silently and never crash the ingest** — each
one is recorded as a "failure" with its line number and a reason, and the ingest
response reports `totalLines` / `parsedCount` / `skippedCount` plus a sample of the
skipped lines so you can see exactly what didn't parse.

## Error pattern grouping (deterministic, not AI)

`services/errorGrouping.ts` normalizes an ERROR/FATAL message by replacing the parts
that vary between otherwise-identical errors with placeholder tokens:

```
"Connection timeout for user 123"  →  "connection timeout for user <num>"
"Connection timeout for user 456"  →  "connection timeout for user <num>"   (same pattern)
```

It substitutes, in order: email addresses → `<email>`, UUIDs → `<uuid>`, IPv4 addresses
→ `<ip>`, long hex strings → `<hex>`, quoted strings → `<value>`, then standalone
numbers → `<num>`. The pattern key is `service::normalized-message`, so the same
message shape in two different services is tracked as two separate patterns (they
usually have different owners and different fixes).

**Documented limitations:** this is purely syntactic. `"failed to connect"` and
`"could not connect"` will never be grouped together, and `"user123"` (no word
boundary) is left untouched by design, to avoid over-collapsing distinct words.

## Error spike detection (deterministic, not AI)

`services/spikeDetection.ts` buckets ERROR+FATAL log counts into hourly windows per
service. The most recent hour is compared against the average of the preceding 24
hours (the baseline). A spike is flagged when the observed count is at least 3× the
baseline **and** clears an absolute minimum count (10, by default) — the second
condition exists so that "2 errors vs. a baseline of 0" isn't reported as an
infinite/meaningless spike.

```ts
analyzeSpike(hourlyBuckets, { multiplier: 3, minObservedCount: 10, minBaselineBuckets: 3 })
```

**Documented limitations** (see the docstring in `spikeDetection.ts` for the full
version):

- No concept of seasonality — a service that's always busier on Monday mornings will
  look like a "spike" every Monday.
- Needs at least `minBaselineBuckets` hours of history; with too little it reports
  `insufficient_history` rather than guessing.
- A single historical outlier inflates the baseline average (no median/trimming), by
  design, to keep the rule simple and explainable in an interview.
- The comparison always uses the *current wall-clock hour* as "observed" — a spike
  that happened an hour ago is baseline data now, not a live spike. The dashboard's
  "Detected spikes" panel reflects only what's happening right now.

## API

All endpoints below (except `/api/auth/register` and `/api/auth/login`) require
`Authorization: Bearer <jwt>`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Logs | `POST /api/logs/ingest` (multipart file **or** `{ content }` JSON paste), `GET /api/logs` (filters: `service`, `level`, `requestId`, `traceId`, `errorPatternId`, `search`, `from`, `to`, `page`, `pageSize`), `GET /api/logs/:id`, `GET /api/logs/services` |
| Error patterns | `GET /api/error-patterns` (`sort=frequent\|recent`), `GET /api/error-patterns/:id`, `GET /api/error-patterns/:id/logs` |
| Incidents | `POST /api/incidents`, `GET /api/incidents` (filters: `status`, `severity`, `assigneeId`, `errorPatternId`), `GET /api/incidents/:id`, `PATCH /api/incidents/:id`, `PATCH /api/incidents/:id/status`, `PATCH /api/incidents/:id/assign`, `POST /api/incidents/:id/notes`, `GET /api/incidents/:id/events` |
| Dashboard | `GET /api/dashboard/summary?hours=24` |
| Users | `GET /api/users` (for assignee dropdowns) |

All list endpoints are paginated server-side (`page`/`pageSize`) — the frontend never
loads an unbounded result set into React. Errors follow a consistent shape:
`{ "error": { "message": "...", "details"?: [...] } }`, with Zod validation errors,
Prisma constraint errors, and file-upload errors all normalized to it in
`middleware/errorHandler.ts`.

## Local setup (without Docker)

Requires Node 20+ and a running PostgreSQL instance.

```bash
npm install                       # installs both workspaces

createdb loglens                  # or your platform's equivalent
cp backend/.env.example backend/.env   # then edit DATABASE_URL / JWT_SECRET

npm run --workspace backend prisma:migrate   # applies migrations
npm run dev:backend                          # http://localhost:4000
npm run dev:frontend                         # http://localhost:5173 (proxies /api to :4000)
```

Register a user at `http://localhost:5173/register`, then use the "Ingest logs" panel
on the Logs page to paste or upload a `.log`/`.txt` file (5 MB limit).

## Local setup (Docker Compose)

```bash
docker compose up --build
# frontend: http://localhost:8080  (nginx proxies /api to the backend container)
# backend:  http://localhost:4000
```

> The Dockerfiles and compose file were written but **not build-tested** in this
> environment (no Docker available on the machine this was built on). Please run the
> above yourself and open an issue/fix forward if the build breaks.

## Testing

```bash
npm run --workspace backend test
```

74 tests across 8 suites:

- **Unit** (no database): `logParser`, `errorGrouping`, `spikeDetection` — pure-function
  tests covering the documented format, malformed-line handling, grouping equivalence
  classes, and spike/no-spike/insufficient-history/below-minimum-volume cases.
- **Integration** (Supertest against a real Postgres test database,
  `loglens_test`): auth (register/login/me, duplicate email, bad password), log
  ingestion (parses + groups + reports skipped lines), log listing/filtering, error
  pattern listing/detail/related-logs, and the full incident lifecycle (create → assign
  → status transition → note → resolve → activity timeline ordering).

Frontend: `npx tsc -b`, `npx oxlint`, `npm run build` inside `frontend/` — no frontend
test framework was added since there's no meaningful business logic on the client side
to unit test beyond what integration/E2E would cover, and the request was to avoid
adding tooling without a genuine need.

## Security notes

- Passwords hashed with bcrypt (10 rounds); JWTs signed with `JWT_SECRET` from the
  environment, never committed.
- All mutating endpoints require a valid JWT; there's no reuse of `.env.example`
  secrets in source control.
- File uploads are capped (`MAX_UPLOAD_SIZE_BYTES`, default 5 MB), restricted to
  `.log`/`.txt` extensions, and streamed into memory only long enough to parse (no
  arbitrary file execution surface).
- All database access goes through Prisma's parameterized queries — no raw string
  interpolation of user input (the one `$queryRaw` in `spikeService.ts` interpolates
  only a server-computed `Date`, never user input).
- CORS is restricted to `CORS_ORIGIN` (the frontend's origin), not `*`.
- This is a portfolio project's security posture, not an audited enterprise system —
  there's no rate limiting, no refresh-token rotation, and no RBAC beyond `ADMIN`/
  `ENGINEER` role storage (roles aren't currently enforced on any route).

## What you can honestly claim in an interview

Real, measurable things this project demonstrates:

- A relational schema with FKs, enums, and indexes chosen for the actual query
  patterns (filter logs by service+level+time, sort patterns by frequency/recency).
- Server-side pagination and filtering — verified by running the ingestion of a
  1,000+ line log file and confirming the log list, filters, and pagination totals via
  both automated tests and a live curl/browser smoke test (see the ingestion demo data
  in the running app).
- A deterministic spike detector that was verified end-to-end against a synthetic 24-hour
  baseline (10 errors/hour) followed by a 340-error hour, correctly flagging a 43× spike
  — and catching a real timezone bug in the process (see below).
- A full incident lifecycle (create → assign → status transitions → notes → resolve)
  with an append-only activity log, verified via both integration tests and a live
  browser walkthrough.

Do not claim user counts, production traffic, or accuracy percentages — none of that
was measured or is meaningful for a project that hasn't been deployed to real users.

### A bug worth mentioning in an interview

While smoke-testing spike detection, the hourly-bucket comparison silently failed
because it truncated timestamps using local time (`Date.setMinutes`) while Postgres's
`date_trunc('hour', ...)` truncates the stored literal value with no timezone
adjustment. On a machine set to IST (UTC+5:30 — a half-hour offset), the two never
aligned, so every bucket lookup missed and no spike was ever reported. The fix was to
truncate in UTC (`setUTCMinutes`) on the JS side, which now matches Postgres
regardless of the host machine's local timezone. It's a good example of why "works on
my machine" isn't enough for anything involving time bucketing.

## Performance sanity check

Not a benchmark — a one-time, single-machine sanity check run against the local dev
stack (Node 24, local Postgres, no load concurrency) to confirm nothing is
pathologically slow. Measured with `curl -w "%{time_total}"` (server-side wall time,
excludes shell/process overhead) against a synthetic 5,015-line log file generated to
match the documented format, with 15 deliberately malformed lines mixed in:

| Operation | Measured time |
|---|---|
| Ingest 5,015-line file (parse + normalize + group + DB writes), multipart upload | ~1.2 s (≈4,100 lines/sec) |
| `GET /api/logs` (paginated, 50/page) against ~11k stored logs | ~12 ms |
| `GET /api/logs` with `service`+`level` filters | ~13 ms |
| `GET /api/error-patterns?sort=frequent` | ~8 ms |
| `GET /api/dashboard/summary?hours=48` | ~18 ms |
| `POST /api/incidents`, status change, note, timeline fetch | ~15–27 ms each |
| `GET /api/health` | ~3 ms |

The ingest correctly reported `parsedCount: 5000, skippedCount: 15` and grouped the
synthetic errors into the expected pattern signature. The 15 malformed lines were each
recorded with a line number and reason, none silently dropped or crashing the ingest.
These numbers reflect one local run, not production load or concurrent-user behavior —
no connection pooling, caching, or index tuning beyond what's in the Prisma schema has
been done, and none of it has been tested under concurrent load.

## Limitations

- No rate limiting, no refresh-token rotation, no RBAC enforcement (roles are stored
  but not checked on any route — see "Security notes").
- Error grouping is purely syntactic (see "Error pattern grouping" above) — it doesn't
  understand semantically-equivalent messages worded differently.
- Spike detection has no seasonality awareness and only evaluates the current
  wall-clock hour (see "Error spike detection" above).
- No frontend automated tests — backend has 74 tests, but the client is only checked
  by `tsc` + lint + a manual smoke pass.
- Single Postgres instance, no read replicas, no caching layer — fine for a portfolio
  project's expected traffic, not validated at any real scale.
- File uploads are parsed synchronously in the request; a very large file blocks that
  request's event-loop turn rather than being processed in a background job/queue.
- Docker images are written but not build-verified (see "Docker" below).

## Future improvements

- Background job queue for ingestion so large files don't block the request thread.
- Role-based access control actually enforced on mutating routes (schema already has
  `ADMIN`/`ENGINEER`).
- Rate limiting on auth endpoints.
- Frontend integration/E2E tests (Playwright) covering the auth → ingest → incident flow.
- Configurable spike-detection windows/thresholds per service instead of one global rule.
- WebSocket or polling-based live updates instead of manual refresh.

## Screenshots

_Not included in this repo checkout — capture these from a running instance with demo
data (no real credentials) before publishing:_

1. Dashboard — summary stats + detected spikes panel
2. Logs page — filtered list with pagination
3. Error pattern detail — occurrence trend + related logs
4. Incident detail — status/severity/assignee
5. Incident timeline — activity log

## Deployment

Simplest realistic architecture for this project — no Kubernetes, no container
orchestration, no message queue:

```
Browser → Vercel (React SPA, static build)
             │  fetch() calls to VITE_API_BASE_URL
             ▼
          Render/Railway (Express API, Docker or native Node buildpack)
             │  Prisma
             ▼
          Managed PostgreSQL (Render/Railway/Neon/Supabase)
```

### Backend (Render or Railway)

1. Create a managed PostgreSQL instance; copy its connection string.
2. Create a new web service from this Git repo, root/build context = repo root.
3. Build command: `npm ci && npm run build --workspace backend`
   Start command: `npm run --workspace backend start` (runs `node dist/server.js`)
4. Set environment variables (see `backend/.env.example` for the full list):
   `DATABASE_URL` (from step 1), `JWT_SECRET` (generate a real random secret —
   don't reuse the dev value), `JWT_EXPIRES_IN`, `NODE_ENV=production`,
   `CORS_ORIGIN` (the frontend's deployed URL — set once you have it from the
   Vercel step below), `MAX_UPLOAD_SIZE_BYTES`.
5. Run migrations against the managed database — either as a one-off release command
   (`npm run --workspace backend prisma:deploy`) or manually from your machine with
   `DATABASE_URL` pointed at the managed instance before the first deploy.
6. After deploy, verify `GET https://<your-backend>/api/health` returns
   `{"status":"ok"}`.

### Frontend (Vercel)

1. Import the repo, framework preset "Vite", root directory `frontend`.
2. Build command: `npm run build` (equivalently `npm run build --workspace frontend`
   from the repo root). Output directory: `frontend/dist`.
3. Set `VITE_API_BASE_URL` in the Vercel project's environment variables to the
   backend's deployed origin (e.g. `https://loglens-api.onrender.com`, no trailing
   slash, no `/api`) — this is baked in at **build** time, so redeploy after changing it.
4. Deploy, then go back to the backend service and set `CORS_ORIGIN` to this
   frontend's exact deployed origin, and redeploy the backend.

### CORS

The backend allows exactly one origin (`cors({ origin: env.corsOrigin })` in
`backend/src/app.ts`) — not `*`. It must be set to the frontend's exact deployed
origin (scheme + host, no path, no trailing slash) or every browser request from the
deployed frontend will be blocked by the browser's CORS check even though the API
itself is reachable.

### Production checklist

- [ ] Managed PostgreSQL instance created, connection string in hand
- [ ] Backend environment variables configured (real `JWT_SECRET`, not the dev value)
- [ ] Migrations run against the managed database (`prisma migrate deploy`)
- [ ] Backend deployed; `GET /api/health` returns `{"status":"ok"}`
- [ ] Frontend `VITE_API_BASE_URL` set to the backend's deployed origin, frontend deployed
- [ ] Backend `CORS_ORIGIN` updated to the frontend's deployed origin, backend redeployed
- [ ] Register + log in through the deployed frontend
- [ ] Ingest a log file and confirm logs/error patterns appear
- [ ] Create an incident, change its status, confirm the timeline updates
- [ ] Check the browser console and Network tab for CORS/API errors
