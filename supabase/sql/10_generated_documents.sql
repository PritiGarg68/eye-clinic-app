-- 10_generated_documents.sql
-- Garg Eye Clinic OPD App
-- Finalized clinic-generated PDF documents.
--
-- Structured clinical/payment data remains authoritative.
-- This table points to the latest finalized PDF artifact.
-- Re-finalization replaces the same logical document; no version history in V1.

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null references public.patients(id),
  visit_id uuid not null references public.visits(id),
  payment_id uuid references public.payments(id),

  document_type text not null,

  file_name text not null,
  file_type text not null default 'application/pdf',
  file_size_bytes integer,

  storage_bucket text not null,
  storage_path text not null,

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint generated_documents_type_check
    check (
      document_type in (
        'Prescription',
        'Spectacle Prescription',
        'Consultation Receipt',
        'Additional Service Receipt'
      )
    ),

  constraint generated_documents_file_type_check
    check (file_type = 'application/pdf'),

  constraint generated_documents_file_size_check
    check (file_size_bytes is null or file_size_bytes >= 0),

  constraint generated_documents_payment_relationship_check
    check (
      (
        document_type in ('Prescription', 'Spectacle Prescription')
        and payment_id is null
      )
      or
      (
        document_type in (
          'Consultation Receipt',
          'Additional Service Receipt'
        )
        and payment_id is not null
      )
    )
);

drop trigger if exists trg_generated_documents_updated_at
on public.generated_documents;

create trigger trg_generated_documents_updated_at
before update on public.generated_documents
for each row execute function public.set_updated_at();


-- One current prescription of each clinical document type per visit.
create unique index if not exists idx_generated_documents_one_clinical_per_visit
on public.generated_documents (visit_id, document_type)
where document_type in (
  'Prescription',
  'Spectacle Prescription'
);


-- One current generated receipt per payment.
create unique index if not exists idx_generated_documents_one_receipt_per_payment
on public.generated_documents (payment_id)
where payment_id is not null;


-- A Storage object must map to only one generated-document record.
create unique index if not exists idx_generated_documents_storage_path_unique
on public.generated_documents (storage_bucket, storage_path);


create index if not exists idx_generated_documents_patient_id
on public.generated_documents (patient_id);

create index if not exists idx_generated_documents_visit_id
on public.generated_documents (visit_id);

create index if not exists idx_generated_documents_payment_id
on public.generated_documents (payment_id);

create index if not exists idx_generated_documents_document_type
on public.generated_documents (document_type);


-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------
-- Keep generated clinic documents separate from uploaded patient attachments.
--
-- Bucket is private by design. Authentication / Storage RLS policies will be
-- finalized with the production security phase.
--
-- During the current development phase we will validate upload/access through
-- the application's existing Supabase setup before adding production policies.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'generated-documents',
  'generated-documents',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
