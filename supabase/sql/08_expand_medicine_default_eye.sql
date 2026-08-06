-- 08_expand_medicine_default_eye.sql
-- Garg Eye Clinic OPD App
-- Align medicine_master default_eye options with the Doctor medicine editor.

alter table public.medicine_master
drop constraint if exists medicine_master_default_eye_check;

alter table public.medicine_master
add constraint medicine_master_default_eye_check
check (
  default_eye is null
  or default_eye in (
    'OD',
    'OS',
    'OU',
    'Both Eyes',
    'Right Eye',
    'Left Eye',
    'Oral',
    'Other'
  )
);
