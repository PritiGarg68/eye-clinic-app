-- ============================================================
-- Migration 20: Generated documents metadata + Storage RLS
-- ============================================================
--
-- generated-documents bucket remains PRIVATE.
--
-- Policy model:
-- - Doctor/Admin and Receptionist may read generated documents.
-- - Doctor/Admin and Receptionist may create/update finalized PDFs.
-- - Doctor/Admin alone may delete generated documents.
-- - Optometrist has no generated-document access.
--
-- This migration also removes the temporary anonymous DEV policies
-- for the generated-documents Storage bucket.
--
-- patient-attachments is deliberately NOT changed here.
-- ============================================================


-- ============================================================
-- generated_documents table
-- ============================================================

alter table public.generated_documents
enable row level security;


drop policy if exists "Doctor and reception can read generated documents"
on public.generated_documents;

create policy "Doctor and reception can read generated documents"
on public.generated_documents
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


drop policy if exists "Doctor and reception can create generated documents"
on public.generated_documents;

create policy "Doctor and reception can create generated documents"
on public.generated_documents
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


drop policy if exists "Doctor and reception can update generated documents"
on public.generated_documents;

create policy "Doctor and reception can update generated documents"
on public.generated_documents
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


drop policy if exists "Doctor can delete generated documents"
on public.generated_documents;

create policy "Doctor can delete generated documents"
on public.generated_documents
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
-- Remove temporary anonymous DEV Storage policies
-- ============================================================

drop policy if exists "Dev allow generated document read"
on storage.objects;

drop policy if exists "Dev allow generated document upload"
on storage.objects;

drop policy if exists "Dev allow generated document update"
on storage.objects;


-- ============================================================
-- generated-documents Storage policies
-- ============================================================

drop policy if exists "Doctor and reception can read generated document files"
on storage.objects;

create policy "Doctor and reception can read generated document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-documents'
  and exists (
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


drop policy if exists "Doctor and reception can upload generated document files"
on storage.objects;

create policy "Doctor and reception can upload generated document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-documents'
  and exists (
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


drop policy if exists "Doctor and reception can update generated document files"
on storage.objects;

create policy "Doctor and reception can update generated document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-documents'
  and exists (
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
  bucket_id = 'generated-documents'
  and exists (
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


drop policy if exists "Doctor can delete generated document files"
on storage.objects;

create policy "Doctor can delete generated document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-documents'
  and exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);
