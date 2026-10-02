# NIT Delhi Club Mail Recipient Manager

Generates and manages **recipient email IDs** from NIT Delhi's roll-number structure.
**This application does NOT send email.** There is no SMTP, no email provider and no Send button.
A club member builds the list here, copies or exports it, and pastes it into the
official college/club email account.

```
Batch -> Branch -> Roll range / filters -> Roll numbers -> Email IDs -> Preview -> Copy / Export
```

> The current roll ranges are **ASSUMED configured maximums**. They are **not verified student data**. The same maximums are currently assumed for UG 2023, UG 2024, UG 2025 and UG 2026. Generated lists come from these ranges, not from a verified student list.
> Some generated addresses may be inactive or nonexistent. Every API response carries this disclaimer
> while the source is `RULE_BASED`.

Status: backend + recipient engine + React client are written. See *Testing* for exactly what has and has not been executed.

## Run everything locally

**Node versions:** the server runtime needs Node 18.18+; the client (Vite 5) needs Node 18+ (20+ recommended); **`npm test` in `server/` needs Node 22.3 or newer** because it uses `--experimental-test-module-mocks`. MongoDB is required to run the API.

```bash
# terminal 1 - API
cd server && cp .env.example .env     # set JWT_SECRET (32+ chars), SEED_ADMIN_EMAIL
npm install && npm run seed && npm run dev

# terminal 2 - client (proxies /api to :5000)
cd client && npm install && npm run dev   # http://localhost:5173
```

## Server setup (details)

```bash
cd server
cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, SEED_ADMIN_EMAIL
npm install
npm run seed                # batches, branches, roll rules, settings, first admin
npm run dev                 # http://localhost:5000
npm test                    # engine tests (no database needed)
```

`SEED_ADMIN_PASSWORD` is optional. If empty, a random one-time password is printed once.
The seed is idempotent and never overwrites existing rules or settings.

## How roll numbers work

`rollNumber = rule.prefix + zero-padded sequence`, e.g. `251210` + `001` = `251210001`.
`email = rollNumber@<domain>` (domain from the `emailDomain` setting, or per-rule override).

All of this lives in MongoDB (`RollNumberRule`, `Batch`, `Branch`, `SystemSetting`).
Defaults in `src/config/defaultRules.js` are used **only by the seed script**.

## Changing configuration (no code edits)

All via the admin API (SUPER_ADMIN), which the admin UI will call. Every change is audit-logged,
e.g. `Admin X: changed CSE UG 2025: endSequence 140 -> 137`.

| Change | Call |
|---|---|
| CSE 2025 now ends at 137 | `PUT /api/admin/roll-rules/:id` `{"endSequence":137}` |
| Change a prefix / start | `PUT /api/admin/roll-rules/:id` `{"prefix":"251210","startSequence":1}` |
| Email domain | `PUT /api/admin/settings` `{"emailDomain":"nitdelhi.ac.in"}` |
| Per-rule domain override | `PUT /api/admin/roll-rules/:id` `{"emailDomain":"x.example.edu"}` |
| New branch | `POST /api/admin/branches`, then `POST /api/admin/roll-rules` per batch |
| New batch | `POST /api/admin/batches`, then rules per branch |
| Disable something | `PUT` with `{"active":false}` on a batch, branch or rule |
| Switch to real data | `PUT /api/admin/settings` `{"recipientSource":"ACTUAL_STUDENT_DATABASE"}` |

Rules reject invalid ranges and any roll-number ranges that could produce overlapping roll numbers.
Batches/branches that still have rules can't be deleted (deactivate them instead).

## Recipient spec (request body)

```json
{
  "batches": [2025], "allBatches": false,
  "branches": ["CSE", "ECE"], "allBranches": false,
  "selection": { "mode": "ALL" },
  "exclusions": "251210014, 251210057",
  "additions": "251220001"
}
```

`selection.mode`: `ALL` | `RANGE` (`start`, `end` sequence numbers, applied per branch) |
`ROLLS` (`rollNumbers`: text or array; batches/branches optional). Roll numbers are
split on whitespace, commas and semicolons. Duplicates are impossible (keyed by roll number).
Out-of-range or malformed entries are reported in `invalid`, never silently dropped.

Response `data`: `recipients[]` (`rollNumber, email, batch, branch`), `stats`
(`generated, added, excluded, final, groups[]`), `warnings[]`, `invalid[]`, `source`,
`sourceLabel`, `disclaimer`, `summary`.

## API

All routes are under `/api`, JSON, `Authorization: Bearer <token>` except login.
Errors: `{ "error": { "message": "...", "details": [...] } }` (no stack traces).

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Get JWT |
| GET | `/auth/me` | any | Current user |
| POST | `/auth/change-password` | any | |
| POST | `/auth/register` | SUPER_ADMIN, CLUB_ADMIN | Create user (club admins: members of own club only) |
| GET/PATCH | `/users`, `/users/:id` | SUPER_ADMIN, CLUB_ADMIN | |
| GET/POST | `/clubs` | any / SUPER_ADMIN | |
| GET | `/batches` `/branches` `/roll-rules` `/settings` | any | Read config |
| POST | `/recipients/generate` | any | Full list + stats |
| POST | `/recipients/preview` | any | Same, paginated: add `q, sort, order, page, limit` |
| POST | `/recipients/export?format=csv\|comma\|semicolon\|lines[&inline=1]` | any | Download, or JSON `{text}` for Copy buttons |
| POST/GET | `/campaigns` | any | Save / list recipient lists |
| GET/PUT/DELETE | `/campaigns/:id` | owner/club/admin | PUT with `spec` regenerates the snapshot |
| GET | `/campaigns/:id/recipients` | same | Searchable, sortable, paginated snapshot |
| GET | `/campaigns/:id/export?format=...` | same | Copy/Export a saved list |
| GET | `/dashboard` | any | Counts and recent lists |
| POST/PUT/DELETE | `/admin/batches`, `/admin/branches`, `/admin/roll-rules` | SUPER_ADMIN | Configuration |
| PUT | `/admin/settings` | SUPER_ADMIN | Email domain, recipient source |
| GET | `/admin/audit-logs` | SUPER_ADMIN | |

Export formats: `comma` (`a, b`), `semicolon` (`a; b`), `lines` (one per line), `csv`
(`rollNumber,email,batch,branch`).

A **campaign** (shown as a *Saved List* in the UI) is only a saved recipient list (`Draft` or `Recipient List Generated`).
Its snapshot is stored at creation, so later config changes never alter old lists.

Roles: SUPER_ADMIN sees everything and manages config/users/clubs; CLUB_ADMIN manages their
club's members and sees the club's lists; CLUB_MEMBER sees their own lists.

## Security

JWT (HS256) + bcrypt (cost 12), role checks on every route, zod validation, helmet, CORS
limited to `CLIENT_URL`, rate limits (login 10/15 min, generation 60/min), audit log for
login, generation, export, list changes and config changes. No secrets in git: `.env` is ignored.

## Future: real student data

`Student` model (`rollNumber, name, email, batch, branch, status`) already exists and
`recipientSources.service.js` reads it when `recipientSource = ACTUAL_STUDENT_DATABASE` (labelled "Imported student database"; it is only called verified once the data source has actually been verified).
CSV import (validating roll number, email, batch, branch, status) is not built yet.

## Deployment

Set `NODE_ENV=production`, a 32+ char `JWT_SECRET`, `MONGO_URI` (e.g. Atlas), `CLIENT_URL`
to the deployed frontend origin, and `TRUST_PROXY=1` behind a proxy. Run `npm run seed` once,
then `npm start`.

## Frontend (`client/`)

React + Vite + Tailwind. All roll-number logic stays in the API; the client only builds a request
(`batches`, `branches`, `selection`, `exclusions`, `additions`) and renders the response. Brand blue is
configured in `client/tailwind.config.js` (`nitd` palette, an approximation; swap in the official hex).
No official logo asset was available, so a text mark is used.

Pages: `/login`, `/dashboard`, `/recipients` (builder), `/saved-lists`, `/saved-lists/:id`, `/settings`,
`/admin` (overview + system settings), `/admin/batches`, `/admin/branches`, `/admin/roll-rules`,
`/admin/users` (also "Members" for club admins), `/admin/audit-logs`. Set `VITE_API_URL` for production.
The JWT is stored in `sessionStorage`, which limits persistence across browser sessions, but XSS protection still depends on the application being free of XSS vulnerabilities (React escapes output by default, and the app renders no raw HTML).

## API contract changes in this pass

- `POST /recipients/preview` accepts `audit: true` (the explicit Generate click). Paging/search calls omit it, so the audit log is not flooded.
- `/recipients/export?inline=1` and `/campaigns/:id/export?inline=1` are logged as "copied"; downloads as "exported".
- Warnings now name skipped inactive/unknown batches and branches; an empty result adds `"No recipients generated."`.
- Roll rules are rejected if the end sequence does not fit the width, or if the rule can produce roll numbers that collide with another rule (previously only same-prefix overlap was checked).
- `GET /clubs` returns only the caller's club for non-super-admins.
- Campaign responses include `sourceLabel`; `GET /campaigns/:id/recipients` unchanged.

## Testing

```bash
cd server && npm test      # 37 tests, no database required
```

Covers the pure engine, edge cases, export formats, a no-email-code scan of server and client, and
integration tests that run the real generator/campaign/config services against in-memory fake models
(snapshot-vs-config-change, inactive rules, access scoping). **Not covered by automated tests:**
real MongoDB, HTTP routes/middleware, zod validators, and the React UI (no browser tests).

## Forced password change

Accounts created through `/auth/register` or the seed script have `mustChangePassword = true`.
The server enforces it: such a user can log in and call only `GET /auth/me` and `POST /auth/change-password`;
every other endpoint returns `403` with `error.code = "PASSWORD_CHANGE_REQUIRED"`. The new password must differ
from the temporary one. The React app shows a dedicated "Change your password" screen instead of the app.
Temporary passwords are never returned by any API; the seed script prints a generated one once.
