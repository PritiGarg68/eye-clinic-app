-- 14_doctor_spectacle_reviewed.sql
-- Garg Eye Clinic OPD App
--
-- Once the doctor edits any part of Final Spectacle Advice, the entire
-- spectacle prescription is treated as doctor-reviewed.
--
-- Later optometrist changes must then be shown to the doctor for review
-- and must not silently overwrite any doctor-final spectacle value.

alter table public.doctor_consultations
add column if not exists doctor_spectacle_reviewed boolean not null default false;

comment on column public.doctor_consultations.doctor_spectacle_reviewed is
'True once the doctor edits any final spectacle field or spectacle remarks. After this point later optometrist spectacle changes must not auto-overwrite doctor values.';

-- Backfill existing consultations where the saved doctor-final spectacle
-- prescription differs from the stored optometrist baseline.
--
-- This preserves the intended reviewed state for existing draft/completed
-- consultations created before this boolean column existed.
update public.doctor_consultations dc
set doctor_spectacle_reviewed = true
from public.spectacle_prescriptions sp
where sp.visit_id = dc.visit_id
  and dc.optometrist_spectacle_baseline_json is not null
  and sp.spectacle_json is distinct from dc.optometrist_spectacle_baseline_json;
