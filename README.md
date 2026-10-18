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
│   │       ├── api.ts         frontend client for the Express API
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

## Run the live demo on Windows

After dependencies and `backend/.env` are configured, double-click **Start Demo.cmd**.
It starts the API and website in the background, reuses a running local server
instead of starting a duplicate, and opens the browser at `http://localhost:5173`.
Double-click **Stop Demo.cmd** when finished. Service logs are saved in the ignored
`.demo-state/logs` folder.

The launcher uses Node directly, so it does not depend on the `npm` command shim.
If Node is installed in a nonstandard location, set `NODE_EXE` to the full path of
`node.exe` before starting.

## Run both sides manually

**Terminal 1 — backend**

```bash
cd backend
cp .env.example .env    # configure MongoDB, JWT_SECRET, ADMIN_NAME/EMAIL/PASSWORD and DEMO_PASSWORD
npm install
npm run seed -- --demo  # create admin, student, and runner demo accounts
npm start               # http://localhost:5000/api/health
```

> **Atlas setup:** Database → Connect → Drivers → copy the `mongodb+srv://…` URI,
> URL-encode the password (`@` → `%40`, `#` → `%23`), and allow your IP under
> Network Access.

**Terminal 2 — frontend**

```bash
npm install
npm run dev      # http://localhost:5173
```

The frontend defaults to the `/api` path. Vite forwards `/api` requests to
`http://localhost:5000`, so the Express backend and MongoDB connection must be
running for the app to load or save real records. The separate
`src/lib/http.ts` file is a legacy HTTP client; current screens use
`src/lib/api.ts`.

The seed script reads the administrator's `ADMIN_NAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD` from `backend/.env`; there is no built-in admin identity or
default credential. Set these values for each client installation before running
the seed script. `DEMO_PASSWORD` is used only for the optional demo student and
runner accounts. The script does not create sample errands; post an errand in
the app during the demo. Before presenting, open
`http://localhost:5000/api/health` and confirm it reports `ok: true`, then open
`http://localhost:5173`. Browser geolocation and internet access are needed for
live runner tracking and OpenStreetMap tiles. Map tile requests reveal the map
area being viewed to OpenStreetMap. Only points inside the approximate Dagupan
campus map bounds are saved or shared; off-campus points clear the previous
pin. Those bounds are a rectangular approximation, not a surveyed geofence.

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
| Student | john.upang@phinmaed.com | Value of `DEMO_PASSWORD` in `backend/.env` |
| Delivery | mark.tan@phinmaed.com | Value of `DEMO_PASSWORD` in `backend/.env` |
| Admin *(separate portal)* | Value of `ADMIN_EMAIL` in `backend/.env` | Value of `ADMIN_PASSWORD` in `backend/.env` |
