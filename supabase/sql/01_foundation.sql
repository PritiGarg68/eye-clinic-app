-- 01_foundation.sql
-- Garg Eye Clinic OPD App
-- Foundation tables: clinic settings, users, patient sources, patients, visits

-- Required for UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Helper: updated_at trigger function
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Clinic settings
-- Single-clinic app. One row expected.
-- ------------------------------------------------------------
create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  doctor_name text not null,
  qualification text,
  registration_number text,
  address text,
  phone text,
  email text,
  default_consultation_fee numeric(10,2) not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_clinic_settings_updated_at on public.clinic_settings;
create trigger trg_clinic_settings_updated_at
before update on public.clinic_settings
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- User profiles
-- Supabase Auth stores login.
-- This table stores app role/profile.
-- ------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  full_name text not null,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_profiles_role_check
    check (role in ('Doctor/Admin', 'Receptionist', 'Optometrist', 'Assistant/Admin'))
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Patient sources
-- Optional on patient registration, useful for reports.
-- ------------------------------------------------------------
create table if not exists public.patient_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_patient_sources_updated_at on public.patient_sources;
create trigger trg_patient_sources_updated_at
before update on public.patient_sources
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- UHID sequence and generator
-- Format: GEC-000001
-- ------------------------------------------------------------
create sequence if not exists public.patient_uhid_seq start 1;

create or replace function public.generate_patient_uhid()
returns text
language plpgsql
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.patient_uhid_seq');
  return 'GEC-' || lpad(next_number::text, 6, '0');
end;
$$;

-- ------------------------------------------------------------
-- Patients
-- Mobile is deliberately NOT unique because family members may share mobile.
-- Age is required; date_of_birth is optional.
-- ------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  uhid text unique not null default public.generate_patient_uhid(),
  full_name text not null,
  mobile text not null,
  age_years integer not null,
  date_of_birth date,
  gender text not null,
  address text,
  patient_source_id uuid references public.patient_sources(id),
  referral_notes text,
  is_active boolean not null default true,
  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patients_age_years_check
    check (age_years >= 0 and age_years <= 130),

  constraint patients_gender_check
    check (gender in ('Male', 'Female', 'Other'))
);

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create index if not exists idx_patients_mobile on public.patients (mobile);
create index if not exists idx_patients_full_name on public.patients (full_name);
create index if not exists idx_patients_patient_source_id on public.patients (patient_source_id);

-- ------------------------------------------------------------
-- Visits
-- Every OPD encounter creates one visit.
-- Today's queue is a filtered view of visits by visit_date/status.
-- Token number resets daily.
-- ------------------------------------------------------------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),

  visit_date date not null default current_date,
  token_number integer not null,
  visit_type text not null,
  status text not null,

  priority_level text not null default 'Normal',

  checked_in_at timestamptz not null default now(),
  clinical_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint visits_visit_type_check
    check (visit_type in ('New Consultation', 'Follow-Up', 'Free Follow-Up', 'Procedure / Test Only')),

  constraint visits_status_check
    check (status in (
      'Waiting',
      'Under Optometry',
      'Needs Optometry Review',
      'Dilated Waiting',
      'Ready for Doctor',
      'Under Consultation',
      'Additional Payment Pending',
      'Completed',
      'Cancelled'
    )),

  constraint visits_priority_level_check
    check (priority_level in ('Normal', 'Senior', 'Emergency')),

  constraint visits_token_number_check
    check (token_number > 0),

  constraint visits_unique_daily_token
    unique (visit_date, token_number)
);

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create index if not exists idx_visits_patient_id on public.visits (patient_id);
create index if not exists idx_visits_visit_date on public.visits (visit_date);
create index if not exists idx_visits_status on public.visits (status);
create index if not exists idx_visits_visit_date_status on public.visits (visit_date, status);

-- ------------------------------------------------------------
-- Daily token helper
-- Returns next token number for a given date.
-- App can call this before creating a visit.
-- ------------------------------------------------------------
create or replace function public.get_next_visit_token(for_visit_date date default current_date)
returns integer
language plpgsql
as $$
declare
  next_token integer;
begin
  select coalesce(max(token_number), 0) + 1
  into next_token
  from public.visits
  where visit_date = for_visit_date;

  return next_token;
end;
$$;
