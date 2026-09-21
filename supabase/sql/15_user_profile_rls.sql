-- 15_user_profile_rls.sql
-- Garg Eye Clinic OPD App
-- First production-security migration.
--
-- Protect staff profiles so authenticated users can read only
-- their own application profile.
--
-- No client-side INSERT / UPDATE / DELETE policies are created.

alter table public.user_profiles
enable row level security;

drop policy if exists "Users can read own profile"
on public.user_profiles;

create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
);
