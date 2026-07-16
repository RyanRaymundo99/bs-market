# AGENTS.md

## Cursor Cloud specific instructions

BS Market is a single Next.js 15 (App Router) full-stack app (frontend + API routes under `src/app/api`). There is no separate backend service. Standard scripts live in `package.json`; standard setup is in `README.md`.

### Services
- **Web app (Next.js dev server)** — the only local process. Start with `pnpm dev` (Turbopack) on port **3000**.
- **PostgreSQL** — the only infrastructure dependency (Prisma ORM, provider `postgresql`). All other integrations (Binance, Mercado Pago, Resend, TextBelt, Vercel Blob, Google OAuth) are external SaaS accessed via API keys and are optional for local dev.

### Startup caveats (non-obvious)
- The update script only runs `pnpm install` (which triggers `postinstall` → `prisma generate`). PostgreSQL is preinstalled in the VM snapshot but is **not auto-started**. Before running the app, start it and ensure the DB/schema exist:
  - `sudo pg_ctlcluster 16 main start`
  - The `bsmarket` database and `postgres`/`postgres` credentials already exist in the snapshot. If missing, recreate: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" -c "CREATE DATABASE bsmarket;"`
  - Sync schema if needed: `pnpm db:push`
- Env files (`.env` and `.env.local`, both gitignored) already exist in the snapshot with a local `DATABASE_URL` and dev auth secrets. **Prisma CLI reads `.env` only** (not `.env.local`), while Next.js reads both — keep `DATABASE_URL` in `.env` or Prisma commands (`db:push`, `db:studio`) will fail with "Environment variable not found: DATABASE_URL".
- The Prisma client is generated to `prisma/generated/client` (not the default location); always run `prisma generate` after schema changes (handled by `postinstall`).

### Create an admin / first user
- Admin: `POST http://localhost:3000/api/auth/create-admin` (localhost-only; returns generated credentials once). Regular users self-register at `/signup`.

### Checks (run from repo root)
- Tests: `pnpm test` (Vitest) — Lint: `pnpm lint` — Types: `pnpm type-check` — Full gate: `pnpm run deploy:check`.
- `pnpm lint` emits `max-lines` warnings on several large page files; these are warnings (exit 0), not errors.
