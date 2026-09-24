-- ============================================================
-- Migration 23: Doctor/Admin may update clinic identity details
-- ============================================================
--
-- clinic_settings remains a single-row configuration table.
--
-- Active authenticated staff retain read access from Migration 19.
-- This migration adds UPDATE access only for Doctor/Admin.
--
-- No INSERT policy.
-- No DELETE policy.
-- ============================================================

drop policy if exists "Doctor can update clinic settings"
on public.clinic_settings;

create policy "Doctor can update clinic settings"
on public.clinic_settings
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
