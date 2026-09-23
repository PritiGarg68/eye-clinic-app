-- ============================================================
-- Migration 22: Harden public function / RPC execution
-- ============================================================
--
-- Security goals:
-- - Remove anonymous and PUBLIC execution of application functions.
-- - Retain authenticated execution required by the clinic app.
-- - Retain service_role execution for administrative/server use.
-- - Add explicit Doctor/Admin checks to Doctor-only RPC actions
--   where underlying table RLS also permits Reception updates.
-- - Functions remain SECURITY INVOKER, so table RLS continues
--   to apply to all database work performed inside them.
-- ============================================================


-- ============================================================
-- Doctor-only RPC: free follow-up entitlement maintenance
-- ============================================================

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
  if not exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  ) then
    raise exception 'Doctor/Admin access required.'
      using errcode = '42501';
  end if;

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
      notes = coalesce(e.notes, '') ||
        case when e.notes is null then '' else E'\n' end ||
        'Cancelled because doctor removed free follow-up date.'
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


-- ============================================================
-- Doctor-only RPC: cancel pending refund advice
-- ============================================================

create or replace function public.cancel_refund_request(
  p_request_id uuid
)
returns void
language plpgsql
as $$
declare
  v_request public.refund_requests%rowtype;
begin
  if not exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  ) then
    raise exception 'Doctor/Admin access required.'
      using errcode = '42501';
  end if;

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


-- ============================================================
-- Remove PUBLIC and anonymous EXECUTE access
-- ============================================================

revoke execute on function public.generate_patient_uhid()
from public, anon;

revoke execute on function public.generate_receipt_number()
from public, anon;

revoke execute on function public.get_next_visit_token(date)
from public, anon;

revoke execute on function public.create_consultation_check_in(
  uuid, text, date, numeric, numeric, text, text
)
from public, anon;

revoke execute on function public.update_reception_check_in(
  uuid, text, integer, text, text, numeric, numeric, text
)
from public, anon;

revoke execute on function public.collect_additional_service_payment(
  uuid, text
)
from public, anon;

revoke execute on function public.upsert_free_follow_up_entitlement_for_visit(
  uuid
)
from public, anon;

revoke execute on function public.get_active_free_follow_up_entitlement(
  uuid, date
)
from public, anon;

revoke execute on function public.consume_free_follow_up_entitlement(
  uuid, uuid, date
)
from public, anon;

revoke execute on function public.create_refund_request(
  uuid, numeric, text, text
)
from public, anon;

revoke execute on function public.process_refund_request(
  uuid, text
)
from public, anon;

revoke execute on function public.cancel_refund_request(
  uuid
)
from public, anon;


-- ============================================================
-- Explicit application/server EXECUTE grants
-- ============================================================
-- These functions remain SECURITY INVOKER.
-- Underlying table RLS therefore still controls what each
-- authenticated clinic role may actually read or modify.
-- ============================================================

grant execute on function public.generate_patient_uhid()
to authenticated, service_role;

grant execute on function public.generate_receipt_number()
to authenticated, service_role;

grant execute on function public.get_next_visit_token(date)
to authenticated, service_role;

grant execute on function public.create_consultation_check_in(
  uuid, text, date, numeric, numeric, text, text
)
to authenticated, service_role;

grant execute on function public.update_reception_check_in(
  uuid, text, integer, text, text, numeric, numeric, text
)
to authenticated, service_role;

grant execute on function public.collect_additional_service_payment(
  uuid, text
)
to authenticated, service_role;

grant execute on function public.upsert_free_follow_up_entitlement_for_visit(
  uuid
)
to authenticated, service_role;

grant execute on function public.get_active_free_follow_up_entitlement(
  uuid, date
)
to authenticated, service_role;

grant execute on function public.consume_free_follow_up_entitlement(
  uuid, uuid, date
)
to authenticated, service_role;

grant execute on function public.create_refund_request(
  uuid, numeric, text, text
)
to authenticated, service_role;

grant execute on function public.process_refund_request(
  uuid, text
)
to authenticated, service_role;

grant execute on function public.cancel_refund_request(
  uuid
)
to authenticated, service_role;


-- Trigger helper does not need direct client RPC access.
revoke execute on function public.set_updated_at()
from authenticated, anon, public;

grant execute on function public.set_updated_at()
to service_role;
