-- 02_billing.sql
-- Garg Eye Clinic OPD App
-- Billing, receipts, services, and additional service requests

-- ------------------------------------------------------------
-- Services master
-- Chargeable services/tests/procedures.
-- Old receipts use payment item snapshots, not live master prices.
-- ------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  service_name text not null unique,
  service_category text not null,
  default_amount numeric(10,2) not null default 0,
  route_after_payment text not null default 'Needs Optometry Review',
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint services_category_check
    check (service_category in ('Consultation', 'Investigation', 'Procedure', 'Other')),

  constraint services_default_amount_check
    check (default_amount >= 0),

  constraint services_route_after_payment_check
    check (route_after_payment in ('Needs Optometry Review', 'Ready for Doctor'))
);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create index if not exists idx_services_category on public.services (service_category);
create index if not exists idx_services_active on public.services (is_active);

-- ------------------------------------------------------------
-- Receipt number sequence and generator
-- Format: GEC-R-2026-000001
-- Same sequence for consultation and additional service receipts.
-- ------------------------------------------------------------
create sequence if not exists public.receipt_number_seq start 1;

create or replace function public.generate_receipt_number()
returns text
language plpgsql
as $$
declare
  next_number bigint;
  receipt_year text;
begin
  next_number := nextval('public.receipt_number_seq');
  receipt_year := to_char(current_date, 'YYYY');

  return 'GEC-R-' || receipt_year || '-' || lpad(next_number::text, 6, '0');
end;
$$;

-- ------------------------------------------------------------
-- Payments
-- Every money event / printable receipt is one payment record.
-- Free follow-up and waived consultation also create ₹0 payment records.
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),

  payment_type text not null,
  payment_status text not null,

  gross_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,

  payment_mode text not null,
  receipt_number text unique not null default public.generate_receipt_number(),

  paid_at timestamptz,

  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payments_type_check
    check (payment_type in ('Consultation', 'Additional Service', 'Refund', 'Adjustment', 'Membership')),

  constraint payments_status_check
    check (payment_status in ('Pending', 'Paid', 'Cancelled', 'Refunded', 'Partially Refunded')),

  constraint payments_mode_check
    check (payment_mode in ('Cash', 'UPI', 'Card', 'Bank Transfer', 'None')),

  constraint payments_amounts_check
    check (
      gross_amount >= 0
      and discount_amount >= 0
      and net_amount >= 0
      and net_amount = gross_amount - discount_amount
    )
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index if not exists idx_payments_visit_id on public.payments (visit_id);
create index if not exists idx_payments_patient_id on public.payments (patient_id);
create index if not exists idx_payments_paid_at on public.payments (paid_at);
create index if not exists idx_payments_payment_type on public.payments (payment_type);
create index if not exists idx_payments_payment_mode on public.payments (payment_mode);
create index if not exists idx_payments_payment_status on public.payments (payment_status);

-- ------------------------------------------------------------
-- Payment items
-- Line items printed on receipts.
-- item_name is a snapshot so old receipts do not change when service master changes.
-- ------------------------------------------------------------
create table if not exists public.payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  service_id uuid references public.services(id),

  item_name text not null,
  quantity integer not null default 1,

  unit_amount numeric(10,2) not null default 0,
  gross_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,

  sort_order integer not null default 1,
  created_at timestamptz not null default now(),

  constraint payment_items_quantity_check
    check (quantity > 0),

  constraint payment_items_amounts_check
    check (
      unit_amount >= 0
      and gross_amount >= 0
      and discount_amount >= 0
      and net_amount >= 0
      and net_amount = gross_amount - discount_amount
    )
);

create index if not exists idx_payment_items_payment_id on public.payment_items (payment_id);
create index if not exists idx_payment_items_service_id on public.payment_items (service_id);

-- ------------------------------------------------------------
-- Additional service requests
-- Doctor-side pending request before reception collects payment.
-- Payment is created only when money is collected.
-- ------------------------------------------------------------
create table if not exists public.additional_service_requests (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  patient_id uuid not null references public.patients(id),

  requested_by uuid references public.user_profiles(id),
  status text not null,

  gross_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,

  notes text,
  route_after_payment text not null,

  linked_payment_id uuid references public.payments(id),

  paid_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint additional_service_requests_status_check
    check (status in ('Payment Pending', 'Paid', 'Cancelled')),

  constraint additional_service_requests_route_check
    check (route_after_payment in ('Ready for Doctor', 'Needs Optometry Review')),

  constraint additional_service_requests_amounts_check
    check (
      gross_amount >= 0
      and discount_amount >= 0
      and net_amount >= 0
      and net_amount = gross_amount - discount_amount
    )
);

drop trigger if exists trg_additional_service_requests_updated_at on public.additional_service_requests;
create trigger trg_additional_service_requests_updated_at
before update on public.additional_service_requests
for each row execute function public.set_updated_at();

create index if not exists idx_additional_service_requests_visit_id
on public.additional_service_requests (visit_id);

create index if not exists idx_additional_service_requests_patient_id
on public.additional_service_requests (patient_id);

create index if not exists idx_additional_service_requests_status
on public.additional_service_requests (status);

create index if not exists idx_additional_service_requests_linked_payment_id
on public.additional_service_requests (linked_payment_id);

-- ------------------------------------------------------------
-- Additional service request items
-- Tests/services selected by doctor inside one request.
-- ------------------------------------------------------------
create table if not exists public.additional_service_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.additional_service_requests(id) on delete cascade,
  service_id uuid references public.services(id),

  service_name_snapshot text not null,
  amount numeric(10,2) not null default 0,

  sort_order integer not null default 1,
  created_at timestamptz not null default now(),

  constraint additional_service_request_items_amount_check
    check (amount >= 0)
);

create index if not exists idx_additional_service_request_items_request_id
on public.additional_service_request_items (request_id);

create index if not exists idx_additional_service_request_items_service_id
on public.additional_service_request_items (service_id);

-- ------------------------------------------------------------
-- Consultation check-in helper
-- Creates visit + consultation payment + receipt line item together.
-- Used by Reception check-in flow.
-- ------------------------------------------------------------
create or replace function public.create_consultation_check_in(
  p_patient_id uuid,
  p_visit_type text default 'New Consultation',
  p_visit_date date default current_date,
  p_gross_amount numeric default 0,
  p_discount_amount numeric default 0,
  p_payment_mode text default 'Cash',
  p_notes text default null
)
returns table (
  visit_id uuid,
  returned_patient_id uuid,
  returned_visit_date date,
  returned_token_number integer,
  returned_visit_type text,
  returned_status text,
  payment_id uuid,
  receipt_number text,
  payment_gross_amount numeric,
  payment_discount_amount numeric,
  payment_net_amount numeric,
  returned_payment_mode text,
  returned_paid_at timestamptz
)
language plpgsql
as $$
declare
  v_token_number integer;
  v_visit_id uuid;
  v_payment_id uuid;
  v_receipt_number text;
  v_net_amount numeric;
  v_service_id uuid;
  v_paid_at timestamptz;
begin
  if not exists (
    select 1
    from public.patients
    where id = p_patient_id
      and is_active = true
  ) then
    raise exception 'Active patient not found';
  end if;

  if p_gross_amount < 0 or p_discount_amount < 0 then
    raise exception 'Amounts cannot be negative';
  end if;

  if p_discount_amount > p_gross_amount then
    raise exception 'Discount cannot be more than gross amount';
  end if;

  v_net_amount := p_gross_amount - p_discount_amount;

  if v_net_amount > 0 and p_payment_mode = 'None' then
    raise exception 'Payment mode cannot be None when net amount is greater than zero';
  end if;

  if v_net_amount = 0 then
    p_payment_mode := 'None';
  end if;

  select id
  into v_service_id
  from public.services
  where service_name = 'Consultation Fee'
    and is_active = true
  limit 1;

  if v_service_id is null then
    raise exception 'Consultation Fee service not found';
  end if;

  perform pg_advisory_xact_lock(hashtext('visit-token-' || p_visit_date::text));

  v_token_number := public.get_next_visit_token(p_visit_date);

  insert into public.visits (
    patient_id,
    visit_date,
    token_number,
    visit_type,
    status,
    priority_level
  )
  values (
    p_patient_id,
    p_visit_date,
    v_token_number,
    p_visit_type,
    'Waiting',
    'Normal'
  )
  returning id into v_visit_id;

  v_paid_at := now();

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
    v_visit_id,
    p_patient_id,
    'Consultation',
    'Paid',
    p_gross_amount,
    p_discount_amount,
    v_net_amount,
    p_payment_mode,
    v_paid_at,
    p_notes
  )
  returning id, public.payments.receipt_number
  into v_payment_id, v_receipt_number;

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
    v_payment_id,
    v_service_id,
    'Consultation Fee',
    1,
    p_gross_amount,
    p_gross_amount,
    p_discount_amount,
    v_net_amount,
    1
  );

  return query
  select
    v_visit_id,
    p_patient_id,
    p_visit_date,
    v_token_number,
    p_visit_type,
    'Waiting'::text,
    v_payment_id,
    v_receipt_number,
    p_gross_amount,
    p_discount_amount,
    v_net_amount,
    p_payment_mode,
    v_paid_at;
end;
$$;
