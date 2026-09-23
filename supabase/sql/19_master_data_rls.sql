-- ============================================================
-- Migration 19: RLS for clinic master/configuration tables
-- ============================================================
--
-- Policy model:
-- - Active authenticated clinic staff may read master/config data.
-- - Doctor/Admin may create and update editable master data.
-- - No delete policies: masters use is_active for deactivation.
-- - clinic_settings is read-only from the current application.
--
-- Deliberately excluded from this migration:
-- - attachments
-- - generated_documents
-- These require separate security review.
-- ============================================================


-- ============================================================
-- Enable RLS
-- ============================================================

alter table public.services
enable row level security;

alter table public.patient_sources
enable row level security;

alter table public.clinical_templates
enable row level security;

alter table public.medicine_master
enable row level security;

alter table public.frequency_master
enable row level security;

alter table public.duration_master
enable row level security;

alter table public.clinic_settings
enable row level security;


-- ============================================================
-- Services
-- ============================================================

drop policy if exists "Active staff can read services"
on public.services;

create policy "Active staff can read services"
on public.services
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create services"
on public.services;

create policy "Doctor can create services"
on public.services
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update services"
on public.services;

create policy "Doctor can update services"
on public.services
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Patient sources
-- ============================================================

drop policy if exists "Active staff can read patient sources"
on public.patient_sources;

create policy "Active staff can read patient sources"
on public.patient_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create patient sources"
on public.patient_sources;

create policy "Doctor can create patient sources"
on public.patient_sources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update patient sources"
on public.patient_sources;

create policy "Doctor can update patient sources"
on public.patient_sources
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Clinical templates
-- ============================================================

drop policy if exists "Active staff can read clinical templates"
on public.clinical_templates;

create policy "Active staff can read clinical templates"
on public.clinical_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create clinical templates"
on public.clinical_templates;

create policy "Doctor can create clinical templates"
on public.clinical_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update clinical templates"
on public.clinical_templates;

create policy "Doctor can update clinical templates"
on public.clinical_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Medicine master
-- ============================================================

drop policy if exists "Active staff can read medicine master"
on public.medicine_master;

create policy "Active staff can read medicine master"
on public.medicine_master
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create medicines"
on public.medicine_master;

create policy "Doctor can create medicines"
on public.medicine_master
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update medicines"
on public.medicine_master;

create policy "Doctor can update medicines"
on public.medicine_master
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Frequency master
-- ============================================================

drop policy if exists "Active staff can read frequency master"
on public.frequency_master;

create policy "Active staff can read frequency master"
on public.frequency_master
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create frequencies"
on public.frequency_master;

create policy "Doctor can create frequencies"
on public.frequency_master
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update frequencies"
on public.frequency_master;

create policy "Doctor can update frequencies"
on public.frequency_master
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Duration master
-- ============================================================

drop policy if exists "Active staff can read duration master"
on public.duration_master;

create policy "Active staff can read duration master"
on public.duration_master
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);

drop policy if exists "Doctor can create durations"
on public.duration_master;

create policy "Doctor can create durations"
on public.duration_master
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can update durations"
on public.duration_master;

create policy "Doctor can update durations"
on public.duration_master
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Clinic settings
-- ============================================================

drop policy if exists "Active staff can read clinic settings"
on public.clinic_settings;

create policy "Active staff can read clinic settings"
on public.clinic_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);
