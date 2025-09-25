# FlowPilot

Production-style **developer productivity** platform: authentication, dashboard analytics, task management, comments, activity logs, notifications UI, REST APIs with validation, Prisma + PostgreSQL, and CI/CD scaffolding where **lint, types, tests, and builds** can fail naturally as the codebase evolves.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4**
- **Prisma ORM** + **PostgreSQL**
- **Auth.js / NextAuth v5** (credentials, JWT sessions)
- **Zustand** (UI state) + **TanStack Query** (server state)
- **Zod** (validation) + **ESLint** + **Prettier** + **Vitest**

## Quick start

### 1. Dependencies

```bash
npm install
```

### 2. Database

Start Postgres (Docker):

```bash
docker compose up -d
```

Copy environment variables:

```bash
cp .env.example .env
# Edit .env — especially NEXTAUTH_SECRET (>= 16 chars)
```

Apply schema:

```bash
npx prisma db push
```

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`, register a user, then use the **Dashboard**.

## Scripts

| Script                 | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Next.js dev server                             |
| `npm run build`        | `prisma generate` + production build           |
| `npm run start`        | Start production server                        |
| `npm run lint`         | ESLint                                         |
| `npm run format`       | Prettier write                                 |
| `npm run format:check` | Prettier check                                 |
| `npm run typecheck`    | `tsc --noEmit`                                 |
| `npm run test`         | Vitest (unit + API helper tests)               |
| `npm run ci`           | Lint + format check + typecheck + test + build |

## Environment variables

See `.env.example`. **Runtime validation** runs from `src/instrumentation.ts` (unless `SKIP_ENV_VALIDATION=1`).

Required for production / strict CI:

- `DATABASE_URL` — PostgreSQL URL
- `NEXTAUTH_SECRET` — long random secret (16+ chars)
- `NEXTAUTH_URL` — public origin (e.g. `https://app.example.com`)

Optional:

- `NEXT_PUBLIC_APP_URL` — public site URL for client-side absolute links
- `DOCKER_BUILD=1` — enables Next.js `standalone` output (see `next.config.ts`)

## Docker (production image)

The `Dockerfile` builds a **standalone** Node server. You still need a reachable Postgres instance and matching `DATABASE_URL` at runtime. Run migrations / `prisma db push` against that database before serving traffic (for example in your deploy pipeline or an init container).

```bash
docker build -t flowpilot:local .
```

`docker-compose.yml` currently provides **Postgres only** for local development (keeps the compose file honest and avoids hiding migration failures inside the image).

## CI/CD & AI incident routing (n8n)

Workflow file: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

### Triggers

| Event          | Branches                              |
| -------------- | ------------------------------------- |
| `push`         | `main`, `develop`                     |
| `pull_request` | targeting **`main`** or **`develop`** |

### Pipeline steps (production-style)

1. Checkout repository
2. Setup Node.js (with npm cache)
3. Install dependencies (`npm ci`)
4. **Prisma** — `generate` + `db push` against a Postgres **service** container
5. **TypeScript** — `npm run typecheck`
6. **ESLint** — `npm run lint`
7. **Unit tests** — `npm run test` (Vitest)
8. **Build** — `npm run build`

Individual gates use **`continue-on-error: true`** so later checks still run when an earlier one fails (you see **all** failures in a single run). A final step aggregates outcomes; if anything failed it:

- Builds a **JSON-safe** payload with **`jq`** (handles multiline logs correctly).
- **Truncates** combined logs to **`CI_LOG_MAX_CHARS`** (default **120 000**) so payloads stay bounded.
- **`POST`s** to your **n8n** webhook URL from the **`N8N_WEBHOOK_URL`** repository secret.
- Exits **`1`** so GitHub still marks the workflow **failed** (branch protection / required checks stay meaningful).

If the secret is missing, CI **still fails** on broken gates; only the webhook is skipped (with a warning in logs).

### Required GitHub secret

| Secret                | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| **`N8N_WEBHOOK_URL`** | HTTPS URL of your n8n **Webhook** (POST) workflow node |

Create it under **Repository → Settings → Secrets and variables → Actions → New repository secret**.

**Fork PRs:** secrets are often **not** exposed to workflows from forks (GitHub security). For external contributors, document that failure webhooks may only fire from branches inside the repo.

### Webhook payload (JSON)

On failure, the workflow sends a single POST body like:

```json
{
  "repository": "owner/repo",
  "branch": "feature/foo",
  "commit_sha": "abc123…",
  "commit_message": "…",
  "author": "Ada Lovelace",
  "pr_number": "42",
  "pr_url": "https://github.com/owner/repo/pull/42",
  "run_url": "https://github.com/owner/repo/actions/runs/…",
  "timestamp": "2026-05-13T12:00:00Z",
  "failed_step": "eslint,unit_tests",
  "logs": "===== eslint =====\n…"
}
```

- **`failed_step`** — comma-separated step ids (`install`, `prisma`, `typecheck`, `eslint`, `unit_tests`, `build`).
- **`logs`** — concatenation of **`tee`**’d log files for failed steps only, with section headers.
- Empty **`pr_number`** / **`pr_url`** on plain **`push`** events.

### How n8n integration works

1. In n8n, add a **Webhook** node (POST), activate the workflow, copy the **Production URL**.
2. Store that URL in **`N8N_WEBHOOK_URL`**.
3. Chain nodes after the webhook — e.g. **OpenAI**, **Slack**, **Jira**, **email** — to summarize **`logs`**, open incidents, or notify on-call.
4. The CI job does **not** wait for AI; it only delivers structured JSON. Downstream latency and retries live in n8n.

### AI-powered failure analysis (recommended n8n pattern)

Treat this repo’s webhook as an **incident envelope**: branch, commit, run URL, and raw logs. A typical n8n branch:

**Webhook → Function (sanitize/limit) → OpenAI (summarize root cause + fixes) → Slack**

Keep prompts **scoped** to the provided `logs` and metadata; avoid sending unrelated secrets (CI already avoids exposing other GitHub secrets in the payload).

### How to test intentional CI failures (demo / staging)

Use a throwaway branch targeting **`develop`** or **`main`**:

| Goal      | Quick approach                                      |
| --------- | --------------------------------------------------- |
| ESLint    | Introduce an unused variable or disable rule misuse |
| Typecheck | Add a deliberate type error in a `.ts` file         |
| Tests     | `expect(true).toBe(false)` in a test                |
| Build     | Break an import or `export`                         |
| Install   | Temporarily pin an invalid dependency version       |

Revert immediately after validating the webhook + n8n flow.

### Failure handling guarantees

- Webhook **`POST`** failures (network, 5xx) emit a **`::warning`** but the workflow **still exits failed** — CI truth is never “green-washed”.
- Malformed JSON build (**`jq`**) skips the HTTP call and warns — workflow **still** exits **`1`** if gates failed.

## Project layout (high level)

```
src/
  app/                 # App Router pages + API routes
  auth.ts              # Auth.js configuration
  components/          # Reusable UI + dashboard widgets
  hooks/               # TanStack Query hooks
  lib/                 # Prisma singleton, env, HTTP helpers, validators
  middleware.ts        # Protects /dashboard/*
  server/services/    # Domain/service layer (used by route handlers)
  stores/              # Zustand stores
  types/               # Shared TS types
prisma/schema.prisma
tests/                 # Cross-cutting tests
```

## Security notes

- Passwords are hashed with **bcrypt** (cost factor 12).
- Sessions use **JWT** strategy (good fit for credentials provider).
- Replace demo secrets before any real deployment; rotate `NEXTAUTH_SECRET` if leaked.

## License

Private / ISC — adjust per your organization.
