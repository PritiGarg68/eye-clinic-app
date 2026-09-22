-- 17_clinical_rls.sql
-- Garg Eye Clinic OPD App
-- RLS for clinical workup and consultation tables.
--
-- Doctor/Admin:
--   full clinical access
--
-- Receptionist:
--   read-only clinical history for Patient Records / reprints
--
-- Optometrist:
--   read/write optometrist workups only


-- ============================================================
-- Optometrist workups
-- ============================================================

alter table public.optometrist_workups
enable row level security;

drop policy if exists "Authorized staff can read optometrist workups"
on public.optometrist_workups;

create policy "Authorized staff can read optometrist workups"
on public.optometrist_workups
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Receptionist',
        'Optometrist'
      )
  )
);

drop policy if exists "Doctor and optometrist can create workups"
on public.optometrist_workups;

create policy "Doctor and optometrist can create workups"
on public.optometrist_workups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Optometrist'
      )
  )
);

drop policy if exists "Doctor and optometrist can update workups"
on public.optometrist_workups;

create policy "Doctor and optometrist can update workups"
on public.optometrist_workups
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Optometrist'
      )
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Optometrist'
      )
  )
);


-- ============================================================
-- Doctor consultations
-- ============================================================

alter table public.doctor_consultations
enable row level security;

drop policy if exists "Doctor and reception can read consultations"
on public.doctor_consultations;

create policy "Doctor and reception can read consultations"
on public.doctor_consultations
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Receptionist'
      )
  )
);

drop policy if exists "Doctor can create consultations"
on public.doctor_consultations;

create policy "Doctor can create consultations"
on public.doctor_consultations
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

drop policy if exists "Doctor can update consultations"
on public.doctor_consultations;

create policy "Doctor can update consultations"
on public.doctor_consultations
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
-- Consultation medicines
-- ============================================================

alter table public.consultation_medicines
enable row level security;

drop policy if exists "Doctor and reception can read consultation medicines"
on public.consultation_medicines;

create policy "Doctor and reception can read consultation medicines"
on public.consultation_medicines
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Receptionist'
      )
  )
);

drop policy if exists "Doctor can create consultation medicines"
on public.consultation_medicines;

create policy "Doctor can create consultation medicines"
on public.consultation_medicines
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

drop policy if exists "Doctor can update consultation medicines"
on public.consultation_medicines;

create policy "Doctor can update consultation medicines"
on public.consultation_medicines
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

drop policy if exists "Doctor can delete consultation medicines"
on public.consultation_medicines;

create policy "Doctor can delete consultation medicines"
on public.consultation_medicines
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);


-- ============================================================
-- Final spectacle prescriptions
-- ============================================================

alter table public.spectacle_prescriptions
enable row level security;

drop policy if exists "Doctor and reception can read spectacle prescriptions"
on public.spectacle_prescriptions;

create policy "Doctor and reception can read spectacle prescriptions"
on public.spectacle_prescriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role in (
        'Doctor/Admin',
        'Receptionist'
      )
  )
);

drop policy if exists "Doctor can create spectacle prescriptions"
on public.spectacle_prescriptions;

create policy "Doctor can create spectacle prescriptions"
on public.spectacle_prescriptions
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

drop policy if exists "Doctor can update spectacle prescriptions"
on public.spectacle_prescriptions;

create policy "Doctor can update spectacle prescriptions"
on public.spectacle_prescriptions
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
