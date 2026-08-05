-- 07_follow_up_entitlements.sql
-- Garg Eye Clinic OPD App
-- Free follow-up entitlement tracking
--
-- One doctor-created entitlement allows one future free follow-up visit
-- until the doctor-selected valid_until date.

create table if not exists public.patient_follow_up_entitlements (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null references public.patients(id),
  source_visit_id uuid references public.visits(id),
  source_consultation_id uuid references public.doctor_consultations(id),

  valid_until date not null,
  status text not null default 'Active',

  used_visit_id uuid references public.visits(id),
  used_at timestamptz,

  cancelled_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patient_follow_up_entitlements_status_check
    check (status in ('Active', 'Used', 'Cancelled', 'Expired')),

  constraint patient_follow_up_entitlements_used_check
    check (
      (status = 'Used' and used_visit_id is not null and used_at is not null)
      or
      (status <> 'Used')
    )
);

drop trigger if exists trg_patient_follow_up_entitlements_updated_at
on public.patient_follow_up_entitlements;

create trigger trg_patient_follow_up_entitlements_updated_at
before update on public.patient_follow_up_entitlements
for each row execute function public.set_updated_at();

create index if not exists idx_follow_up_entitlements_patient_id
on public.patient_follow_up_entitlements (patient_id);

create index if not exists idx_follow_up_entitlements_source_visit_id
on public.patient_follow_up_entitlements (source_visit_id);

create index if not exists idx_follow_up_entitlements_status_valid_until
on public.patient_follow_up_entitlements (status, valid_until);

create unique index if not exists idx_follow_up_entitlements_one_active_per_source_visit
on public.patient_follow_up_entitlements (source_visit_id)
where status = 'Active';

-- Doctor completion helper:
-- If doctor selected a free follow-up valid-until date, create/update one active entitlement.
-- If doctor removed the date, cancel any active entitlement from that source visit.
create or replace function public.upsert_free_follow_up_entitlement_for_visit(
  p_visit_id uuid
)
returns table (
  entitlement_id uuid,
  patient_id uuid,
  valid_until date,
  status text
)
language plpgsql
as $$
declare
  v_consultation public.doctor_consultations%rowtype;
  v_existing_entitlement_id uuid;
begin
  select *
  into v_consultation
  from public.doctor_consultations dc
  where dc.visit_id = p_visit_id
  order by dc.updated_at desc
  limit 1;

  if not found then
    raise exception 'Doctor consultation not found for visit.';
  end if;

  if v_consultation.free_follow_up_valid_until is null then
    update public.patient_follow_up_entitlements e
    set
      status = 'Cancelled',
      cancelled_at = now(),
      updated_at = now(),
      notes = coalesce(e.notes, '') || case when e.notes is null then '' else E'\\n' end || 'Cancelled because doctor removed free follow-up date.'
    where e.source_visit_id = p_visit_id
      and e.status = 'Active';

    return;
  end if;

  select e.id
  into v_existing_entitlement_id
  from public.patient_follow_up_entitlements e
  where e.source_visit_id = p_visit_id
    and e.status = 'Active'
  limit 1;

  if v_existing_entitlement_id is not null then
    update public.patient_follow_up_entitlements e
    set
      patient_id = v_consultation.patient_id,
      source_consultation_id = v_consultation.id,
      valid_until = v_consultation.free_follow_up_valid_until,
      updated_at = now(),
      notes = 'Created/updated from doctor consultation.'
    where e.id = v_existing_entitlement_id;
  else
    insert into public.patient_follow_up_entitlements (
      patient_id,
      source_visit_id,
      source_consultation_id,
      valid_until,
      status,
      notes
    )
    values (
      v_consultation.patient_id,
      p_visit_id,
      v_consultation.id,
      v_consultation.free_follow_up_valid_until,
      'Active',
      'Created from doctor consultation.'
    )
    returning id into v_existing_entitlement_id;
  end if;

  return query
  select
    e.id as entitlement_id,
    e.patient_id,
    e.valid_until,
    e.status
  from public.patient_follow_up_entitlements e
  where e.id = v_existing_entitlement_id;
end;
$$;

-- Reception helper:
-- Finds one active, valid, unused free follow-up entitlement for a patient.
create or replace function public.get_active_free_follow_up_entitlement(
  p_patient_id uuid,
  p_as_of_date date default current_date
)
returns table (
  entitlement_id uuid,
  returned_patient_id uuid,
  source_visit_id uuid,
  valid_until date,
  status text
)
language sql
as $$
  select
    e.id as entitlement_id,
    e.patient_id as returned_patient_id,
    e.source_visit_id,
    e.valid_until,
    e.status
  from public.patient_follow_up_entitlements e
  where e.patient_id = p_patient_id
    and e.status = 'Active'
    and e.valid_until >= p_as_of_date
    and e.used_visit_id is null
  order by e.valid_until asc, e.created_at asc
  limit 1;
$$;

-- Reception consume helper:
-- Marks the active entitlement as Used and links it to the new free-follow-up visit.
create or replace function public.consume_free_follow_up_entitlement(
  p_patient_id uuid,
  p_used_visit_id uuid,
  p_as_of_date date default current_date
)
returns table (
  entitlement_id uuid,
  returned_patient_id uuid,
  used_visit_id uuid,
  valid_until date,
  status text
)
language plpgsql
as $$
declare
  v_entitlement public.patient_follow_up_entitlements%rowtype;
begin
  select *
  into v_entitlement
  from public.patient_follow_up_entitlements e
  where e.patient_id = p_patient_id
    and e.status = 'Active'
    and e.valid_until >= p_as_of_date
    and e.used_visit_id is null
  order by e.valid_until asc, e.created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No active free follow-up entitlement found for this patient.';
  end if;

  update public.patient_follow_up_entitlements e
  set
    status = 'Used',
    used_visit_id = p_used_visit_id,
    used_at = now(),
    updated_at = now()
  where e.id = v_entitlement.id;

  return query
  select
    e.id as entitlement_id,
    e.patient_id as returned_patient_id,
    e.used_visit_id,
    e.valid_until,
    e.status
  from public.patient_follow_up_entitlements e
  where e.id = v_entitlement.id;
end;
$$;

