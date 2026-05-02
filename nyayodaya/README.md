# Nyayodaya — Dawn of Justice

AI-powered legal intelligence system that transforms raw Karnataka High Court judgment PDFs into verified, explainable, and actionable compliance plans for government departments.

**North star metric:** Time from judgment PDF arrival → officer has verified action plan.  
Target: under 5 minutes. Current reality without this system: 2–3 days.

---

## Architecture

```
PDF → FastAPI Backend (Railway)
        ├── PyMuPDF: text extraction
        ├── Claude Sonnet 4.5: structured data extraction
        ├── Confidence scoring engine
        ├── Deadline computation engine
        └── Action plan generation (Claude)
              ↓
        Supabase (PostgreSQL + Storage)
              ↓
Next.js Frontend (Vercel)
        ├── Upload page (file → pipeline trigger)
        ├── Verify page (human-in-the-loop — THE core screen)
        ├── Dashboard (verified cases only)
        └── Cases browser (all cases with filters)
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project (free tier works)
- Anthropic API key
- Langfuse account (optional but recommended for AI observability)

---

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in Supabase SQL editor:
   ```sql
   -- Copy and run: supabase/migrations/001_initial_schema.sql
   ```
3. Run the seed file:
   ```sql
   -- Copy and run: supabase/seed.sql
   ```
4. Create a `judgments` storage bucket in Supabase Storage → set to **Public**
5. Copy your project URL, anon key, and service role key

### 2. Backend (FastAPI)

```bash
cd backend
cp .env.example .env
# Fill in your keys in .env

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.  
API docs at `http://localhost:8000/docs`.

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your Supabase keys and FastAPI URL

npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_STORAGE_BUCKET` | `judgments` |
| `LANGFUSE_PUBLIC_KEY` | Optional — Langfuse public key |
| `LANGFUSE_SECRET_KEY` | Optional — Langfuse secret key |
| `ENVIRONMENT` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `NEXT_PUBLIC_FASTAPI_URL` | FastAPI URL (localhost:8000 in dev) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |

---

## Deployment

### Backend → Railway

1. Push `backend/` to a GitHub repo
2. Create a new Railway project → connect the repo
3. Railway auto-detects the `Dockerfile`
4. Set all env vars in Railway dashboard
5. Railway assigns a public URL — copy it

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Create a new Vercel project → connect the repo
3. Set env vars in Vercel dashboard (use Railway URL for `NEXT_PUBLIC_FASTAPI_URL`)
4. Deploy

---

## How It Works

### Upload flow
1. Officer uploads judgment PDF via `/upload`
2. PDF is stored in Supabase Storage
3. FastAPI pipeline is triggered (background task):
   - PyMuPDF extracts text
   - Claude Sonnet 4.5 extracts: case number, department, directives, deadline, contempt risk, comply recommendation
   - Confidence scores computed per field (case_number, department, deadline, directive)
   - Absolute deadline computed from relative text ("within 30 days" + order date)
   - Similar past cases fetched from same department
   - Claude generates step-by-step compliance action plan
   - Case inserted into Supabase with status `pending_verification`
4. Frontend polls `/api/status/{job_id}` every 2 seconds
5. On completion, officer is directed to verify

### Verification flow (Layer 3 — most important)
1. Officer opens `/verify`
2. Sees all `pending_verification` cases sorted by contempt risk, then deadline
3. For each case: two-column layout
   - **Left**: AI extraction fields + confidence bars + source paragraph citations
   - **Right**: compliance action plan checklist + comply/appeal recommendation
4. Officer chooses: **Approve**, **Edit**, or **Reject**
5. Decision is permanent, timestamped, stored in `verifications` and `audit_logs`
6. Case status changes to `verified` or `rejected`
7. Supabase Realtime pushes new pending cases automatically

### Dashboard
- Shows only `verified` cases
- Deadline tracker sorted by urgency (critical ≤3 days, soon ≤14 days)
- Department compliance rates
- Real-time metrics

---

## Project Structure

```
nyayodaya/
├── frontend/          Next.js 15 app
├── backend/           FastAPI AI pipeline
└── supabase/          DB migrations + seed data
```

---

## AI Observability

If Langfuse keys are configured, every Claude API call is traced:
- Extraction trace: `job_id`
- Action plan trace: `{job_id}_action_plan`

This allows debugging extraction quality, measuring token usage, and tracking confidence score accuracy over time.

---

## Design Principles

This system is used by government officers — senior bureaucrats who are accountable for their decisions in ways that startup users are not.

- **Trust over flash**: Every screen prioritizes clarity about what is AI-generated vs human-verified
- **Audit everything**: No action happens without a timestamped record
- **Human-in-the-loop is non-negotiable**: Nothing reaches a decision-maker without officer review
- **Calm under pressure**: Urgency is communicated through information hierarchy, not panic-inducing alerts
