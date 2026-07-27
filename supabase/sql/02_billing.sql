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
