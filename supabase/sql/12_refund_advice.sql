-- ------------------------------------------------------------
-- Refund / Fee Adjustment Advice
--
-- Doctor creates a pending refund advice only after consultation completion.
-- Reception processes the advice into a separate paid Refund transaction.
-- The original consultation payment and receipt are never modified.
-- ------------------------------------------------------------

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),

  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),
  original_payment_id uuid not null references public.payments(id),

  refund_amount numeric(10,2) not null,
  reason text not null,
  notes text,

  status text not null default 'Refund Pending',

  linked_refund_payment_id uuid references public.payments(id),
  refunded_at timestamptz,

  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint refund_requests_amount_check
    check (refund_amount > 0),

  constraint refund_requests_reason_check
    check (length(trim(reason)) > 0),

  constraint refund_requests_status_check
    check (status in ('Refund Pending', 'Refunded', 'Cancelled'))
);

drop trigger if exists trg_refund_requests_updated_at
on public.refund_requests;

create trigger trg_refund_requests_updated_at
before update on public.refund_requests
for each row execute function public.set_updated_at();

create index if not exists idx_refund_requests_visit_id
on public.refund_requests (visit_id);

create index if not exists idx_refund_requests_patient_id
on public.refund_requests (patient_id);

create index if not exists idx_refund_requests_original_payment_id
on public.refund_requests (original_payment_id);

create index if not exists idx_refund_requests_status
on public.refund_requests (status);

create index if not exists idx_refund_requests_linked_refund_payment_id
on public.refund_requests (linked_refund_payment_id);

create unique index if not exists uq_refund_requests_one_active_or_processed_per_payment
on public.refund_requests (original_payment_id)
where status in ('Refund Pending', 'Refunded');

-- ------------------------------------------------------------
-- Doctor: create refund advice.
-- ------------------------------------------------------------
create or replace function public.create_refund_request(
  p_original_payment_id uuid,
  p_refund_amount numeric,
  p_reason text,
  p_notes text default null
)
returns table (
  request_id uuid,
  visit_id uuid,
  patient_id uuid,
  original_payment_id uuid,
  original_receipt_number text,
  original_paid_amount numeric,
  refund_amount numeric,
  reason text,
  notes text,
  status text,
  created_at timestamptz
)
language plpgsql
as $$
declare
  v_original_payment public.payments%rowtype;
  v_visit public.visits%rowtype;
  v_request public.refund_requests%rowtype;
begin
  if p_refund_amount is null or p_refund_amount <= 0 then
    raise exception 'Refund amount must be greater than zero.';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Refund reason is required.';
  end if;

  select *
  into v_original_payment
  from public.payments
  where id = p_original_payment_id
  for update;

  if not found then
    raise exception 'Original payment not found.';
  end if;

  if v_original_payment.payment_type <> 'Consultation'
     or v_original_payment.payment_status <> 'Paid' then
    raise exception 'Only a paid consultation payment can be refunded.';
  end if;

  if v_original_payment.net_amount <= 0 then
    raise exception 'This consultation has no paid amount available to refund.';
  end if;

  select *
  into v_visit
  from public.visits
  where id = v_original_payment.visit_id
  for update;

  if not found then
    raise exception 'Visit not found for original payment.';
  end if;

  if v_visit.status <> 'Completed' then
    raise exception 'Refund advice can be created only after consultation is completed.';
  end if;

  if exists (
    select 1
    from public.refund_requests rr
    where rr.original_payment_id = v_original_payment.id
      and rr.status in ('Refund Pending', 'Refunded')
  ) then
    raise exception 'A refund advice already exists for this consultation receipt.';
  end if;

  if p_refund_amount > v_original_payment.net_amount then
    raise exception
      'Refund amount cannot exceed original amount paid of ₹%.',
      v_original_payment.net_amount;
  end if;

  insert into public.refund_requests (
    visit_id,
    patient_id,
    original_payment_id,
    refund_amount,
    reason,
    notes,
    status
  )
  values (
    v_original_payment.visit_id,
    v_original_payment.patient_id,
    v_original_payment.id,
    p_refund_amount,
    trim(p_reason),
    nullif(trim(coalesce(p_notes, '')), ''),
    'Refund Pending'
  )
  returning *
  into v_request;

  return query
  select
    v_request.id,
    v_request.visit_id,
    v_request.patient_id,
    v_request.original_payment_id,
    v_original_payment.receipt_number,
    v_original_payment.net_amount,
    v_request.refund_amount,
    v_request.reason,
    v_request.notes,
    v_request.status,
    v_request.created_at;
end;
$$;

-- ------------------------------------------------------------
-- Reception: process refund advice.
-- Creates a separate paid Refund transaction.
-- Original consultation payment remains unchanged.
-- ------------------------------------------------------------
create or replace function public.process_refund_request(
  p_request_id uuid,
  p_payment_mode text
)
returns table (
  request_id uuid,
  refund_payment_id uuid,
  refund_receipt_number text,
  original_payment_id uuid,
  original_receipt_number text,
  refund_amount numeric,
  payment_mode text,
  refunded_at timestamptz
)
language plpgsql
as $$
declare
  v_request public.refund_requests%rowtype;
  v_original_payment public.payments%rowtype;
  v_refund_payment public.payments%rowtype;
begin
  -- Read first to identify the original payment, then lock consistently:
  -- original payment first, refund request second.
  select *
  into v_request
  from public.refund_requests
  where id = p_request_id;

  if not found then
    raise exception 'Refund advice not found.';
  end if;

  select *
  into v_original_payment
  from public.payments
  where id = v_request.original_payment_id
  for update;

  if not found then
    raise exception 'Original consultation payment not found.';
  end if;

  select *
  into v_request
  from public.refund_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Refund advice not found.';
  end if;

  if v_request.original_payment_id <> v_original_payment.id then
    raise exception 'Refund advice payment relationship changed unexpectedly.';
  end if;

  if v_request.status <> 'Refund Pending' then
    raise exception 'Refund advice is no longer pending.';
  end if;

  if p_payment_mode not in ('Cash', 'UPI', 'Card', 'Bank Transfer') then
    raise exception 'Valid refund mode is required.';
  end if;

  if v_original_payment.payment_type <> 'Consultation'
     or v_original_payment.payment_status <> 'Paid' then
    raise exception 'Original consultation payment is not eligible for refund.';
  end if;

  if v_request.refund_amount > v_original_payment.net_amount then
    raise exception 'Refund amount exceeds the original consultation amount paid.';
  end if;

  insert into public.payments (
    visit_id,
    patient_id,
    payment_type,
    payment_status,
    gross_amount,
    discount_amount,
    net_amount,
    payment_mode,
    paid_at,
    notes
  )
  values (
    v_request.visit_id,
    v_request.patient_id,
    'Refund',
    'Paid',
    v_request.refund_amount,
    0,
    v_request.refund_amount,
    p_payment_mode,
    now(),
    'Refund against receipt ' ||
      v_original_payment.receipt_number ||
      '. Reason: ' ||
      v_request.reason ||
      case
        when v_request.notes is not null
          then '. ' || v_request.notes
        else ''
      end
  )
  returning *
  into v_refund_payment;

  insert into public.payment_items (
    payment_id,
    service_id,
    item_name,
    quantity,
    unit_amount,
    gross_amount,
    discount_amount,
    net_amount,
    sort_order
  )
  values (
    v_refund_payment.id,
    null,
    'Refund against receipt ' || v_original_payment.receipt_number,
    1,
    v_request.refund_amount,
    v_request.refund_amount,
    0,
    v_request.refund_amount,
    1
  );

  update public.refund_requests
  set
    status = 'Refunded',
    linked_refund_payment_id = v_refund_payment.id,
    refunded_at = v_refund_payment.paid_at,
    updated_at = now()
  where id = v_request.id;

  return query
  select
    v_request.id,
    v_refund_payment.id,
    v_refund_payment.receipt_number,
    v_original_payment.id,
    v_original_payment.receipt_number,
    v_refund_payment.net_amount,
    v_refund_payment.payment_mode,
    v_refund_payment.paid_at;
end;
$$;

-- ------------------------------------------------------------
-- Doctor: cancel an unprocessed refund advice.
-- A processed refund can never be cancelled here.
-- ------------------------------------------------------------
create or replace function public.cancel_refund_request(
  p_request_id uuid
)
returns void
language plpgsql
as $$
declare
  v_request public.refund_requests%rowtype;
begin
  select *
  into v_request
  from public.refund_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Refund advice not found.';
  end if;

  if v_request.status <> 'Refund Pending' then
    raise exception 'Only a pending refund advice can be cancelled.';
  end if;

  update public.refund_requests
  set
    status = 'Cancelled',
    updated_at = now()
  where id = p_request_id;
end;
$$;
