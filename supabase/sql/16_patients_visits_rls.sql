-- 16_patients_visits_rls.sql
-- Garg Eye Clinic OPD App
-- Role-based RLS for patients and visits.
--
-- Active V1 roles:
--   Doctor/Admin
--   Receptionist
--   Optometrist
--
-- Detailed clinical workflow rules remain enforced by the application.
-- RLS here protects the broad role boundaries.

alter table public.patients
enable row level security;

alter table public.visits
enable row level security;


-- ------------------------------------------------------------
-- Patients
-- ------------------------------------------------------------

drop policy if exists "Clinic staff can read patients"
on public.patients;

create policy "Clinic staff can read patients"
on public.patients
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


drop policy if exists "Doctor and reception can create patients"
on public.patients;

create policy "Doctor and reception can create patients"
on public.patients
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
        'Receptionist'
      )
  )
);


drop policy if exists "Doctor and reception can update patients"
on public.patients;

create policy "Doctor and reception can update patients"
on public.patients
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
        'Receptionist'
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
        'Receptionist'
      )
  )
);


-- ------------------------------------------------------------
-- Visits
-- ------------------------------------------------------------

drop policy if exists "Clinic staff can read visits"
on public.visits;

create policy "Clinic staff can read visits"
on public.visits
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


drop policy if exists "Doctor and reception can create visits"
on public.visits;

create policy "Doctor and reception can create visits"
on public.visits
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
        'Receptionist'
      )
  )
);


drop policy if exists "Clinic staff can update visits"
on public.visits;

create policy "Clinic staff can update visits"
on public.visits
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
        'Receptionist',
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
        'Receptionist',
        'Optometrist'
      )
  )
);
