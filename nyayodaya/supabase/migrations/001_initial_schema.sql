-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Departments
create table departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text not null unique,
  secretary_name text,
  contact_email text,
  created_at timestamptz default now()
);

-- Cases (main table)
create table cases (
  id uuid primary key default uuid_generate_v4(),
  case_number text not null unique,
  court text default 'Karnataka High Court',
  order_date date,
  judgment_pdf_url text,
  respondent_department_id uuid references departments(id),
  key_directives jsonb default '[]',
  absolute_deadline date,
  relative_deadline_text text,
  comply_recommendation text
    check (comply_recommendation in ('comply','appeal','unclear')),
  comply_reasoning text,
  responsible_officer text,
  contempt_risk text
    check (contempt_risk in ('high','medium','low')),
  confidence_case_number numeric(5,2),
  confidence_department numeric(5,2),
  confidence_deadline numeric(5,2),
  confidence_directive numeric(5,2),
  confidence_overall numeric(5,2),
  status text default 'processing'
    check (status in (
      'processing','extracted','pending_verification',
      'verified','rejected','complied'
    )),
  processing_job_id text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  extraction_raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Action plans
create table action_plans (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  checklist_items jsonb default '[]',
  context_insights text,
  similar_cases jsonb default '[]',
  generated_at timestamptz default now()
);

-- Verification records
create table verifications (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  verified_by uuid references auth.users(id),
  action text check (action in ('approved','edited','rejected')),
  edited_fields jsonb default '{}',
  rejection_reason text,
  feedback_notes text,
  verified_at timestamptz default now()
);

-- Audit trail
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id),
  user_id uuid references auth.users(id),
  action text not null,
  details jsonb default '{}',
  langfuse_trace_id text,
  created_at timestamptz default now()
);

-- Embeddings for RAG
create table judgment_embeddings (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  chunk_text text not null,
  chunk_index integer,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- RLS
alter table cases enable row level security;
alter table verifications enable row level security;
alter table audit_logs enable row level security;

-- Indexes
create index on cases(status);
create index on cases(absolute_deadline);
create index on cases(respondent_department_id);
create index on judgment_embeddings
  using ivfflat (embedding vector_cosine_ops);

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cases_updated_at
  before update on cases
  for each row execute function update_updated_at_column();

-- RLS Policies
-- Allow authenticated users to read all cases
create policy "Authenticated users can read cases"
  on cases for select
  to authenticated
  using (true);

-- Allow authenticated users to insert cases
create policy "Authenticated users can insert cases"
  on cases for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update cases
create policy "Authenticated users can update cases"
  on cases for update
  to authenticated
  using (true);

-- Allow authenticated users to read verifications
create policy "Authenticated users can read verifications"
  on verifications for select
  to authenticated
  using (true);

-- Allow authenticated users to insert verifications
create policy "Authenticated users can insert verifications"
  on verifications for insert
  to authenticated
  with check (true);

-- Allow authenticated users to read audit logs
create policy "Authenticated users can read audit logs"
  on audit_logs for select
  to authenticated
  using (true);

-- Allow authenticated users to insert audit logs
create policy "Authenticated users can insert audit logs"
  on audit_logs for insert
  to authenticated
  with check (true);

-- Service role bypass (for backend)
create policy "Service role full access to cases"
  on cases for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access to verifications"
  on verifications for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access to audit logs"
  on audit_logs for all
  to service_role
  using (true)
  with check (true);
