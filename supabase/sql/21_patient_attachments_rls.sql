-- ============================================================
-- Migration 21: Secure patient attachments
-- ============================================================
--
-- Policy model:
-- - Patient attachment files are private.
-- - Active authenticated clinic staff may read attachments.
-- - Active authenticated clinic staff may upload attachments.
-- - Doctor/Admin and Optometrist may soft-delete attachment
--   metadata and delete attachment files.
-- - Receptionist may not delete attachments.
-- - No anonymous attachment access.
-- - No hard DELETE policy on public.attachments.
--
-- Existing application behavior:
-- - attachment metadata is stored in public.attachments
-- - files are stored in patient-attachments
-- - application uses signed URLs for View / Print
-- ============================================================


-- ============================================================
-- Ensure the patient attachment bucket exists and is private
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'patient-attachments',
  'patient-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- Enable RLS on attachment metadata
-- ============================================================

alter table public.attachments
enable row level security;


-- ============================================================
-- Attachment metadata policies
-- ============================================================

drop policy if exists "Active staff can read attachments"
on public.attachments;

create policy "Active staff can read attachments"
on public.attachments
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


drop policy if exists "Active staff can create attachments"
on public.attachments;

create policy "Active staff can create attachments"
on public.attachments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);


drop policy if exists "Clinical staff can update attachments"
on public.attachments;

create policy "Clinical staff can update attachments"
on public.attachments
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
-- Remove obsolete anonymous DEV Storage policies
-- ============================================================

drop policy if exists "Dev allow attachment read"
on storage.objects;

drop policy if exists "Dev allow attachment upload"
on storage.objects;

drop policy if exists "Dev allow attachment delete"
on storage.objects;


-- ============================================================
-- Authenticated Storage policies
-- ============================================================

drop policy if exists "Active staff can read patient attachment files"
on storage.objects;

create policy "Active staff can read patient attachment files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-attachments'
  and exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);


drop policy if exists "Active staff can upload patient attachment files"
on storage.objects;

create policy "Active staff can upload patient attachment files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient-attachments'
  and exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
  )
);


drop policy if exists "Clinical staff can delete patient attachment files"
on storage.objects;

create policy "Clinical staff can delete patient attachment files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'patient-attachments'
  and exists (
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
