# Upang Delivers — Backend API

Express + **MongoDB Atlas** (Mongoose) REST API for the campus micro-gigs platform.

## Quick start

```bash
cd backend
cp .env.example .env          # paste your Atlas SRV string into MONGODB_URI
npm install
npm run seed                  # creates demo users with bcrypt-hashed passwords
npm start                     # http://localhost:4000/api/health
```

### Getting your Atlas connection string

1. **Atlas → Database → Connect → Drivers → Node.js**
2. Copy the `mongodb+srv://...` string into `MONGODB_URI` in `.env`
3. Replace `<password>` and **URL-encode** special characters (`@` → `%40`, `#` → `%23`, `/` → `%2F`)
4. **Atlas → Network Access → Add IP Address** (your IP, or `0.0.0.0/0` for a demo)
5. Keep the database name `upang_delivers` at the end of the URI

## Collections

| Collection | Purpose |
|---|---|
| `users` | `fullName`, `studentId`, `email`, **`passwordHash`**, `role`, `status`, `failedLogins` |
| `errands` | `ownerId` → users, `runnerId`, title, instructions, category, reward, status |
| `audit_logs` | every auth / validation / authorization decision (TTL 30 days) |
| `rate_limits_auth` | rate-limit counters, so throttling survives restarts & multiple instances |

## Security requirements — where each one lives

| Requirement | Implementation | File |
|---|---|---|
| **Hashed passwords in the DB (GUI/CLI)** | `password` is a Mongoose **virtual**; a `pre('save')` hook bcrypt-hashes it (cost 12) into `passwordHash`, which is `select: false` so it never leaks in a response. There is no plaintext field anywhere in the schema. | `src/models/User.js` |
| **Input validation blocking invalid payloads** | Zod schemas via `validate()` → `422` + per-field errors **before** any DB call, then Mongoose validators as a second layer | `src/middleware/validate.js`, models |
| **Role / ownership checks (BOLA)** | `requireAuth` → `requireRole(...)` → `requireOwnership(Model)`; `ownerId` always comes from the JWT, never the body → `403` | `src/middleware/auth.js` |
| **Rate limiting on auth routes** | `express-rate-limit` + `rate-limit-mongo`, 5 req / 60 s keyed on IP + email, counters persisted in Atlas → `429` | `src/middleware/rateLimit.js` |
| *(bonus)* **NoSQL injection** | `express-mongo-sanitize` strips `$`/`.` operators, `mongoose.set('strict','throw')`, `isValidObjectId` guard | `src/server.js`, `src/middleware/auth.js` |

## Verify the hashes yourself

### GUI — MongoDB Compass or the Atlas web UI

1. Open Compass (or **Atlas → Browse Collections**)
2. Navigate to `upang_delivers` → `users`
3. Each document shows:

```json
{
  "_id": { "$oid": "66d3f1a2c4e9b81f2a0c7d11" },
  "fullName": "John Dela Cruz",
  "studentId": "04-2021-00456",
  "email": "john.upang@phinmaed.com",
  "passwordHash": "$2a$12$Q8s1kZ2m0Yc9jVRe1oOEn.uKf3SgH7pUvXn1w2Yb4Zc6Dd8Ee0Ff2",
  "role": "student",
  "status": "active"
}
```

There is **no** `password` field — only the bcrypt digest.

### CLI

```bash
npm run db                 # interactive console
npm run db -- hashes       # print every stored bcrypt hash
npm run db -- plaintext    # scans for any plaintext password field → should PASS
npm run db -- indexes      # unique email, sparse-unique studentId
npm run db -- log 20       # recent audit_logs
```

Or with the official shell:

```bash
npm run db:shell
# then inside mongosh:
use upang_delivers
db.users.find({}, { email: 1, passwordHash: 1, _id: 0 })
db.users.countDocuments({ password: { $exists: true } })   // → 0
```

## Run the security suite

```bash
npm start              # terminal 1
npm run test:security  # terminal 2
```

Checks: bcrypt storage · `passwordHash` never serialized · invalid sign-up `422` ·
malformed login `422` · duplicate email `422` · NoSQL operator injection blocked ·
cross-account read `403` · owner read `200` · forged `ownerId` ignored ·
student→admin escalation `403` · forged token `401` · auth rate limit `429`.

## Endpoints

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | – | connection + security posture |
| POST | `/api/auth/register` | rate-limited | full name, student ID, PHINMA email, strong password |
| POST | `/api/auth/login` | rate-limited | admins rejected here (403) |
| POST | `/api/auth/admin/login` | rate-limited | non-admins rejected (403) |
| GET | `/api/auth/me` | JWT | current profile |
| GET | `/api/errands` | JWT | open board |
| GET | `/api/errands/mine` | JWT | your errands + gigs |
| POST | `/api/errands` | JWT | validated; `ownerId` from token |
| GET/DELETE | `/api/errands/:id` | JWT + owner | BOLA guarded |
| POST | `/api/errands/:id/accept` | JWT + runner | role checked |
| PATCH | `/api/errands/:id/status` | JWT + owner/runner | state machine |
| GET | `/api/admin/*` | JWT + admin | users, hashes, errands, audit-log, stats |

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Student | john.upang@phinmaed.com | `Upang#2026` |
| Delivery | mark.tan@phinmaed.com | `Runner#2026` |
| Employee | ana.reyes@phinmaed.com | `Faculty#2026` |
| Admin | admin@phinmaed.com | `Admin#2026` |
