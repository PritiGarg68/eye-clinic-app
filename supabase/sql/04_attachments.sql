-- 04_attachments.sql
-- Garg Eye Clinic OPD App
-- Attachment metadata table
-- Actual files are stored in Supabase Storage.

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null references public.patients(id),
  visit_id uuid references public.visits(id),

  uploaded_by uuid references public.user_profiles(id),

  file_name text not null,
  file_type text,
  file_size_bytes integer,

  storage_bucket text not null,
  storage_path text not null,

  attachment_category text not null,
  notes text,

  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attachments_file_size_check
    check (file_size_bytes is null or file_size_bytes >= 0),

  constraint attachments_category_check
    check (attachment_category in (
      'OCT',
      'Fundus Photo',
      'Perimetry',
      'IOP Report',
      'External Report',
      'Prescription',
      'Spectacle Prescription',
      'Other'
    ))
);

drop trigger if exists trg_attachments_updated_at on public.attachments;
create trigger trg_attachments_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

create index if not exists idx_attachments_patient_id
on public.attachments (patient_id);

create index if not exists idx_attachments_visit_id
on public.attachments (visit_id);

create index if not exists idx_attachments_uploaded_by
on public.attachments (uploaded_by);

create index if not exists idx_attachments_category
on public.attachments (attachment_category);

create index if not exists idx_attachments_deleted_at
on public.attachments (deleted_at);

create unique index if not exists idx_attachments_storage_path_unique
on public.attachments (storage_bucket, storage_path);
