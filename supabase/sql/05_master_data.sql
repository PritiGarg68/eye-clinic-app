-- 05_master_data.sql
-- Garg Eye Clinic OPD App
-- Clinical master data for faster doctor/optometrist entry

-- ------------------------------------------------------------
-- Medicine master
-- Used for medicine suggestions and faster prescription entry.
-- Old prescriptions use consultation_medicines.medicine_name_snapshot.
-- ------------------------------------------------------------
create table if not exists public.medicine_master (
  id uuid primary key default gen_random_uuid(),

  medicine_name text not null unique,
  default_eye text,
  default_frequency text,
  default_duration text,
  default_instructions text,

  is_active boolean not null default true,
  sort_order integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medicine_master_default_eye_check
    check (
      default_eye is null
      or default_eye in ('OD', 'OS', 'OU', 'Both Eyes', 'Right Eye', 'Left Eye')
    )
);

drop trigger if exists trg_medicine_master_updated_at on public.medicine_master;
create trigger trg_medicine_master_updated_at
before update on public.medicine_master
for each row execute function public.set_updated_at();

create index if not exists idx_medicine_master_active
on public.medicine_master (is_active);

create index if not exists idx_medicine_master_name
on public.medicine_master (medicine_name);

-- ------------------------------------------------------------
-- Frequency master
-- ------------------------------------------------------------
create table if not exists public.frequency_master (
  id uuid primary key default gen_random_uuid(),

  frequency_label text not null unique,
  sort_order integer not null default 1,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_frequency_master_updated_at on public.frequency_master;
create trigger trg_frequency_master_updated_at
before update on public.frequency_master
for each row execute function public.set_updated_at();

create index if not exists idx_frequency_master_active
on public.frequency_master (is_active);

-- ------------------------------------------------------------
-- Duration master
-- ------------------------------------------------------------
create table if not exists public.duration_master (
  id uuid primary key default gen_random_uuid(),

  duration_label text not null unique,
  sort_order integer not null default 1,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_duration_master_updated_at on public.duration_master;
create trigger trg_duration_master_updated_at
before update on public.duration_master
for each row execute function public.set_updated_at();

create index if not exists idx_duration_master_active
on public.duration_master (is_active);

-- ------------------------------------------------------------
-- Clinical templates
-- One flexible table for chips/templates.
-- Used for chief complaint, history, findings, diagnosis, advice, instructions.
-- ------------------------------------------------------------
create table if not exists public.clinical_templates (
  id uuid primary key default gen_random_uuid(),

  template_type text not null,
  template_text text not null,

  is_active boolean not null default true,
  sort_order integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clinical_templates_type_check
    check (template_type in (
      'Chief Complaint',
      'History',
      'Finding',
      'Diagnosis',
      'Advice',
      'Instruction'
    )),

  constraint clinical_templates_type_text_unique
    unique (template_type, template_text)
);

drop trigger if exists trg_clinical_templates_updated_at on public.clinical_templates;
create trigger trg_clinical_templates_updated_at
before update on public.clinical_templates
for each row execute function public.set_updated_at();

create index if not exists idx_clinical_templates_type
on public.clinical_templates (template_type);

create index if not exists idx_clinical_templates_active
on public.clinical_templates (is_active);

create index if not exists idx_clinical_templates_type_active
on public.clinical_templates (template_type, is_active);

-- ------------------------------------------------------------
-- Add medicine_master foreign key after medicine_master exists.
-- consultation_medicines table is created in 03_clinical.sql.
-- ------------------------------------------------------------
alter table public.consultation_medicines
drop constraint if exists consultation_medicines_medicine_id_fkey;

alter table public.consultation_medicines
add constraint consultation_medicines_medicine_id_fkey
foreign key (medicine_id)
references public.medicine_master(id);
