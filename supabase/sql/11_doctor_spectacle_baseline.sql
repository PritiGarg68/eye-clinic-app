-- 11_doctor_spectacle_baseline.sql
-- Garg Eye Clinic OPD App
--
-- Hidden workflow snapshot used to compare:
--   O0 = optometrist spectacle draft last acknowledged by doctor
--   D  = doctor's current spectacle advice
--   O1 = latest optometrist spectacle draft
--
-- This is not a prescription/audit record and is never printed.

alter table public.doctor_consultations
add column if not exists optometrist_spectacle_baseline_json jsonb;

comment on column public.doctor_consultations.optometrist_spectacle_baseline_json is
'Latest optometrist spectacle draft acknowledged by the doctor; used only for three-way spectacle merge/conflict detection.';
