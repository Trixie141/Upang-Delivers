# Upang Delivers — Campus Micro-Gigs

PHINMA University of Pangasinan errand & delivery platform.
The project is split into two independent workspaces:

```
upang-delivers/
├──src/         React 19 + Vite + Tailwind 4  (this repo root)
│   │   ├── screens/           landing, role select, login, sign up
│   │   │   ├── runner/        browse errands, my gigs, runner profile
│   │   │   └── admin/         dashboard, users, runners, errands,
│   │   │                      reports, settings, security & DB console
│   │   ├── components/        Shell (sidebar/topbar), Charts (SVG)
│   │   └── lib/
│   │       ├── api.ts         in-browser mock backend (zero-setup demo)
│   │       ├── crypto.ts      salted PBKDF2-style SHA-256
│   │       └── http.ts        REAL client for the Express API
│   └── public/images/
│
└── backend/           Express 4 + MongoDB Atlas (Mongoose) + bcrypt + Zod + JWT
    └── src/
        ├── server.js
        ├── config/db.js       Atlas connection
        ├── models/            User.js · Errand.js · AuditLog.js
        ├── middleware/        validate.js · auth.js · rateLimit.js
        ├── routes/            auth.js · errands.js · admin.js
        ├── seed.js            demo users (bcrypt hashed)
        ├── cli.js             `npm run db` Atlas console
        └── security.test.js   automated security assertions
```

## Build the separated ZIP

```bash
bash make-zip.sh
# → upang-delivers.zip  containing  frontend/  and  backend/
```

The script copies each workspace into its own folder, strips `node_modules`,
`dist` and the SQLite files, then zips the result. If `zip` is not installed it
falls back to `.tar.gz`.

## Run both sides

**Terminal 1 — backend**

```bash
cd backend
cp .env.example .env    # paste your MongoDB Atlas SRV string into MONGODB_URI
npm install
npm run seed            # bcrypt-hashed demo users
npm start               # http://localhost:4000/api/health
```

> **Atlas setup:** Database → Connect → Drivers → copy the `mongodb+srv://…` URI,
> URL-encode the password (`@` → `%40`, `#` → `%23`), and allow your IP under
> Network Access.

**Terminal 2 — frontend**

```bash
npm install
echo "VITE_API_URL=http://localhost:4000/api" > .env.local   # optional
npm run dev      # http://localhost:5173
```

Without `.env.local` the UI runs on the built-in mock backend so you can demo
everything (including the Security & DB console) with no server running.

## Security checklist

| Requirement | Frontend proof | Backend proof |
|---|---|---|
| **Hashed passwords, visible in DB GUI/CLI** | Admin → *Security & DB* shows the users table + a query console | bcrypt cost 12 via a Mongoose `pre('save')` hook; `passwordHash` is `select:false`. Verify in **Compass / Atlas → Browse Collections → users**, or `npm run db -- hashes` |
| **Input validation blocks invalid payloads** | Sign Up / Login / Post Errand validate on blur + submit, show per-field errors, and refuse to send | Zod schemas in `middleware/validate.js` return `422` + field map before any DB call; Mongoose validators are the second layer |
| **Role / ownership checks (BOLA)** | Admin lives behind its own portal; students hitting admin views are rejected | `requireAuth` → `requireRole` → `requireOwnership`; `ownerId` is read from the JWT, never the body → `403` |
| **Rate limiting on auth routes** | Live "attempts left / locked Xs" meter on all login & sign-up forms | `express-rate-limit` + `rate-limit-mongo`, 5 req / 60 s keyed on IP + email, counters stored in Atlas → `429` |
| *(bonus)* **NoSQL injection** | — | `express-mongo-sanitize`, `strict: 'throw'` schemas, `isValidObjectId` guards |

Run the automated proof:

```bash
cd backend && npm run test:security
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | john.upang@phinmaed.com | `Upang#2026` |
| Delivery | mark.tan@phinmaed.com | `Runner#2026` |
| Admin *(separate portal)* | admin@phinmaed.com | `Admin#2026` |
