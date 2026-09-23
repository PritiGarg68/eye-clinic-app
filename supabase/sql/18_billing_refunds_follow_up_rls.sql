-- 18_billing_refunds_follow_up_rls.sql
-- Garg Eye Clinic OPD App
-- RLS for billing, additional services, refunds, and free follow-up entitlements.
--
-- Broad role boundaries only.
-- Detailed workflow rules remain enforced by existing app logic and RPCs.
--
-- Doctor/Admin:
--   full operational access required by clinical/admin workflows
--
-- Receptionist:
--   billing, reports, Patient Records, refund processing,
--   additional-service payment, and free-follow-up consumption
--
-- Optometrist:
--   no access to billing/refund/follow-up financial tables


-- ============================================================
-- Payments
-- ============================================================

alter table public.payments
enable row level security;

drop policy if exists "Doctor and reception can read payments"
on public.payments;

create policy "Doctor and reception can read payments"
on public.payments
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

drop policy if exists "Doctor and reception can create payments"
on public.payments;

create policy "Doctor and reception can create payments"
on public.payments
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

drop policy if exists "Doctor and reception can update payments"
on public.payments;

create policy "Doctor and reception can update payments"
on public.payments
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


-- ============================================================
-- Payment items
-- ============================================================

alter table public.payment_items
enable row level security;

drop policy if exists "Doctor and reception can read payment items"
on public.payment_items;

create policy "Doctor and reception can read payment items"
on public.payment_items
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

drop policy if exists "Doctor and reception can create payment items"
on public.payment_items;

create policy "Doctor and reception can create payment items"
on public.payment_items
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

drop policy if exists "Doctor and reception can update payment items"
on public.payment_items;

create policy "Doctor and reception can update payment items"
on public.payment_items
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


-- ============================================================
-- Additional service requests
-- ============================================================

alter table public.additional_service_requests
enable row level security;

drop policy if exists "Doctor and reception can read additional service requests"
on public.additional_service_requests;

create policy "Doctor and reception can read additional service requests"
on public.additional_service_requests
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

drop policy if exists "Doctor can create additional service requests"
on public.additional_service_requests;

create policy "Doctor can create additional service requests"
on public.additional_service_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor and reception can update additional service requests"
on public.additional_service_requests;

create policy "Doctor and reception can update additional service requests"
on public.additional_service_requests
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


-- ============================================================
-- Additional service request items
-- ============================================================

alter table public.additional_service_request_items
enable row level security;

drop policy if exists "Doctor and reception can read additional service request items"
on public.additional_service_request_items;

create policy "Doctor and reception can read additional service request items"
on public.additional_service_request_items
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

drop policy if exists "Doctor can create additional service request items"
on public.additional_service_request_items;

create policy "Doctor can create additional service request items"
on public.additional_service_request_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor can delete additional service request items"
on public.additional_service_request_items;

create policy "Doctor can delete additional service request items"
on public.additional_service_request_items
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
-- Refund requests
-- ============================================================

alter table public.refund_requests
enable row level security;

drop policy if exists "Doctor and reception can read refund requests"
on public.refund_requests;

create policy "Doctor and reception can read refund requests"
on public.refund_requests
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

drop policy if exists "Doctor can create refund requests"
on public.refund_requests;

create policy "Doctor can create refund requests"
on public.refund_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor and reception can update refund requests"
on public.refund_requests;

create policy "Doctor and reception can update refund requests"
on public.refund_requests
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


-- ============================================================
-- Free follow-up entitlements
-- ============================================================

alter table public.patient_follow_up_entitlements
enable row level security;

drop policy if exists "Doctor and reception can read follow-up entitlements"
on public.patient_follow_up_entitlements;

create policy "Doctor and reception can read follow-up entitlements"
on public.patient_follow_up_entitlements
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

drop policy if exists "Doctor can create follow-up entitlements"
on public.patient_follow_up_entitlements;

create policy "Doctor can create follow-up entitlements"
on public.patient_follow_up_entitlements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.is_active = true
      and up.role = 'Doctor/Admin'
  )
);

drop policy if exists "Doctor and reception can update follow-up entitlements"
on public.patient_follow_up_entitlements;

create policy "Doctor and reception can update follow-up entitlements"
on public.patient_follow_up_entitlements
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
