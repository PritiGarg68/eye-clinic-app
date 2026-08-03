-- 03_clinical.sql
-- Garg Eye Clinic OPD App
-- Clinical tables: optometrist workup, doctor consultation, medicines, spectacles

-- ------------------------------------------------------------
-- Optometrist workups
-- Hybrid model:
-- - columns for workflow/search/report fields
-- - JSONB for flexible eye-table data
-- ------------------------------------------------------------
create table if not exists public.optometrist_workups (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),

  chief_complaint text,
  history_notes text,

  vision_json jsonb,
  refraction_json jsonb,
  spectacle_draft_json jsonb,

  iop_od numeric(5,2),
  iop_os numeric(5,2),

  dilation_status text not null default 'Not Dilated',
  dilation_notes text,

  entered_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),

  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint optometrist_workups_visit_unique
    unique (visit_id),

  constraint optometrist_workups_iop_od_check
    check (iop_od is null or (iop_od >= 0 and iop_od <= 100)),

  constraint optometrist_workups_iop_os_check
    check (iop_os is null or (iop_os >= 0 and iop_os <= 100)),

  constraint optometrist_workups_dilation_status_check
    check (dilation_status in ('Not Dilated', 'Dilated Waiting', 'Dilated Done'))
);

drop trigger if exists trg_optometrist_workups_updated_at on public.optometrist_workups;
create trigger trg_optometrist_workups_updated_at
before update on public.optometrist_workups
for each row execute function public.set_updated_at();

create index if not exists idx_optometrist_workups_visit_id
on public.optometrist_workups (visit_id);

create index if not exists idx_optometrist_workups_patient_id
on public.optometrist_workups (patient_id);

create index if not exists idx_optometrist_workups_dilation_status
on public.optometrist_workups (dilation_status);

-- ------------------------------------------------------------
-- Doctor consultations
-- Main doctor note for one visit.
-- Medicines are stored separately in consultation_medicines.
-- ------------------------------------------------------------
create table if not exists public.doctor_consultations (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),
  doctor_id uuid references public.user_profiles(id),

  findings text,
  diagnosis text,
  advice text,
  notes text,

  follow_up_date date,
  free_follow_up_valid_until date,

  status text not null default 'Draft',

  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint doctor_consultations_visit_unique
    unique (visit_id),

  constraint doctor_consultations_status_check
    check (status in ('Draft', 'Completed', 'Cancelled')),

  constraint doctor_consultations_followup_exclusive_check
    check (
      follow_up_date is null
      or free_follow_up_valid_until is null
    )
);

drop trigger if exists trg_doctor_consultations_updated_at on public.doctor_consultations;
create trigger trg_doctor_consultations_updated_at
before update on public.doctor_consultations
for each row execute function public.set_updated_at();

create index if not exists idx_doctor_consultations_visit_id
on public.doctor_consultations (visit_id);

create index if not exists idx_doctor_consultations_patient_id
on public.doctor_consultations (patient_id);

create index if not exists idx_doctor_consultations_follow_up_date
on public.doctor_consultations (follow_up_date);

create index if not exists idx_doctor_consultations_free_follow_up_valid_until
on public.doctor_consultations (free_follow_up_valid_until);

-- ------------------------------------------------------------
-- Consultation medicines
-- Medicine rows are separate so order is preserved and printing is clean.
-- medicine_master table is created in 05_master_data.sql.
-- Foreign key to medicine_master will be added after medicine_master exists.
-- ------------------------------------------------------------
create table if not exists public.consultation_medicines (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.doctor_consultations(id) on delete cascade,
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),

  medicine_id uuid,
  medicine_name_snapshot text not null,

  eye text,
  frequency text,
  duration text,
  instructions text,

  sort_order integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint consultation_medicines_eye_check
    check (eye is null or eye in ('OD', 'OS', 'OU', 'Both Eyes', 'Right Eye', 'Left Eye')),

  constraint consultation_medicines_sort_order_check
    check (sort_order > 0)
);

drop trigger if exists trg_consultation_medicines_updated_at on public.consultation_medicines;
create trigger trg_consultation_medicines_updated_at
before update on public.consultation_medicines
for each row execute function public.set_updated_at();

create index if not exists idx_consultation_medicines_consultation_id
on public.consultation_medicines (consultation_id);

create index if not exists idx_consultation_medicines_visit_id
on public.consultation_medicines (visit_id);

create index if not exists idx_consultation_medicines_patient_id
on public.consultation_medicines (patient_id);

-- ------------------------------------------------------------
-- Spectacle prescriptions
-- Doctor-final spectacle advice.
-- Optometrist spectacle draft remains in optometrist_workups.spectacle_draft_json.
-- ------------------------------------------------------------
create table if not exists public.spectacle_prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),
  consultation_id uuid references public.doctor_consultations(id) on delete set null,

  spectacle_json jsonb,
  remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint spectacle_prescriptions_visit_unique
    unique (visit_id)
);

drop trigger if exists trg_spectacle_prescriptions_updated_at on public.spectacle_prescriptions;
create trigger trg_spectacle_prescriptions_updated_at
before update on public.spectacle_prescriptions
for each row execute function public.set_updated_at();

create index if not exists idx_spectacle_prescriptions_visit_id
on public.spectacle_prescriptions (visit_id);

create index if not exists idx_spectacle_prescriptions_patient_id
on public.spectacle_prescriptions (patient_id);

create index if not exists idx_spectacle_prescriptions_consultation_id
on public.spectacle_prescriptions (consultation_id);
