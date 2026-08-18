-- 13_refund_receipt_document.sql
-- Garg Eye Clinic OPD App
-- Allow finalized Refund Receipt PDFs in generated_documents.

alter table public.generated_documents
drop constraint if exists generated_documents_type_check;

alter table public.generated_documents
add constraint generated_documents_type_check
check (
  document_type in (
    'Prescription',
    'Spectacle Prescription',
    'Consultation Receipt',
    'Additional Service Receipt',
    'Refund Receipt'
  )
);


alter table public.generated_documents
drop constraint if exists generated_documents_payment_relationship_check;

alter table public.generated_documents
add constraint generated_documents_payment_relationship_check
check (
  (
    document_type in (
      'Prescription',
      'Spectacle Prescription'
    )
    and payment_id is null
  )
  or
  (
    document_type in (
      'Consultation Receipt',
      'Additional Service Receipt',
      'Refund Receipt'
    )
    and payment_id is not null
  )
);
