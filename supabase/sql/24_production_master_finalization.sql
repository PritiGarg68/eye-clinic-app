-- ============================================================
-- Migration 24: Production master data finalisation
-- Doctor-approved Garg Eye Clinic master data
-- ============================================================
-- Safe for fresh Production and current DEV:
-- approved rows are upserted/activated; obsolete unreferenced rows
-- are deleted; historically referenced obsolete master rows are
-- retained inactive so old records remain valid.
-- ============================================================

begin;

do $$
begin
  if (select count(*) from public.clinic_settings) <> 1 then
    raise exception 'Expected exactly one clinic_settings row before Production master finalisation.';
  end if;
end
$$;

update public.clinic_settings
set
  clinic_name = 'Garg Eye Clinic',
  doctor_name = 'Dr Priti Garg',
  qualification = 'MBBS, MS Ophthalmology',
  registration_number = 'DMC 13414',
  address = 'C-18 Sai Chowk, Madhu Vihar, Near Geetanjali Salon, 110092',
  phone = '+91 9810090866, +91 9910426490, 011-41043002',
  email = 'dr.pritigarg@gmail.com',
  default_consultation_fee = 1000;

create temporary table approved_patient_sources (
  source_name text primary key,
  sort_order integer not null
) on commit drop;

insert into approved_patient_sources (source_name, sort_order) values
  ('Walk-in', 1),
  ('Google', 2),
  ('Insta/Meta', 3),
  ('Existing Patient Referral', 4),
  ('Doctor Referral', 5),
  ('Family / Friend', 6),
  ('Signboard', 7),
  ('Camp', 8),
  ('Newspaper', 9),
  ('Other', 10);

insert into public.patient_sources (source_name, sort_order, is_active)
select source_name, sort_order, true
from approved_patient_sources
on conflict (source_name) do update
set sort_order = excluded.sort_order, is_active = true;

delete from public.patient_sources ps
where not exists (
  select 1 from approved_patient_sources a where a.source_name = ps.source_name
)
and not exists (
  select 1 from public.patients p where p.patient_source_id = ps.id
);

update public.patient_sources ps
set is_active = false
where not exists (
  select 1 from approved_patient_sources a where a.source_name = ps.source_name
);

create temporary table approved_services (
  service_name text primary key,
  service_category text not null,
  default_amount numeric(10,2) not null,
  route_after_payment text not null,
  sort_order integer not null
) on commit drop;

insert into approved_services (service_name, service_category, default_amount, route_after_payment, sort_order) values
  ('Consultation Fee', 'Consultation', 1000, 'Ready for Doctor', 1),
  ('OCT', 'Investigation', 3500, 'Ready for Doctor', 2),
  ('Fundus Photo', 'Investigation', 1500, 'Ready for Doctor', 3),
  ('Perimetry', 'Investigation', 2500, 'Ready for Doctor', 4),
  ('Chalazion', 'Procedure', 1000, 'Ready for Doctor', 5),
  ('A-Scan', 'Investigation', 1000, 'Ready for Doctor', 6),
  ('Corneal Pachymetry/CCT', 'Investigation', 1000, 'Ready for Doctor', 7),
  ('Angle Measurement', 'Investigation', 1500, 'Ready for Doctor', 8),
  ('Bandage Contact lens', 'Procedure', 1000, 'Ready for Doctor', 9),
  ('Foreign Body Removal', 'Procedure', 1000, 'Ready for Doctor', 10);

insert into public.services (service_name, service_category, default_amount, route_after_payment, sort_order, is_active)
select service_name, service_category, default_amount, route_after_payment, sort_order, true
from approved_services
on conflict (service_name) do update
set
  service_category = excluded.service_category,
  default_amount = excluded.default_amount,
  route_after_payment = excluded.route_after_payment,
  sort_order = excluded.sort_order,
  is_active = true;

delete from public.services s
where not exists (
  select 1 from approved_services a where a.service_name = s.service_name
)
and not exists (
  select 1 from public.payment_items pi where pi.service_id = s.id
)
and not exists (
  select 1 from public.additional_service_request_items asi where asi.service_id = s.id
);

update public.services s
set is_active = false
where not exists (
  select 1 from approved_services a where a.service_name = s.service_name
);

create temporary table approved_frequencies (
  frequency_label text primary key,
  sort_order integer not null
) on commit drop;

insert into approved_frequencies (frequency_label, sort_order) values
  ('Once daily', 1),
  ('Twice daily', 2),
  ('Three times daily', 3),
  ('Four times daily', 4),
  ('At bedtime', 5),
  ('Every 2 hours', 6),
  ('Every 4 hours', 7),
  ('As advised', 8);

insert into public.frequency_master (frequency_label, sort_order, is_active)
select frequency_label, sort_order, true from approved_frequencies
on conflict (frequency_label) do update
set sort_order = excluded.sort_order, is_active = true;

delete from public.frequency_master fm
where not exists (
  select 1 from approved_frequencies a where a.frequency_label = fm.frequency_label
);

create temporary table approved_durations (
  duration_label text primary key,
  sort_order integer not null
) on commit drop;

insert into approved_durations (duration_label, sort_order) values
  ('3 days', 1),
  ('5 days', 2),
  ('1 week', 3),
  ('2 weeks', 4),
  ('10 days', 5),
  ('3 weeks', 6),
  ('1 month', 7),
  ('6 weeks', 8),
  ('As advised', 9);

insert into public.duration_master (duration_label, sort_order, is_active)
select duration_label, sort_order, true from approved_durations
on conflict (duration_label) do update
set sort_order = excluded.sort_order, is_active = true;

delete from public.duration_master dm
where not exists (
  select 1 from approved_durations a where a.duration_label = dm.duration_label
);

create temporary table approved_templates (
  template_type text not null,
  template_text text not null,
  sort_order integer not null,
  primary key (template_type, template_text)
) on commit drop;

insert into approved_templates (template_type, template_text, sort_order) values
  ('Chief Complaint', 'Blurring of Vision', 1),
  ('Chief Complaint', 'Redness', 2),
  ('Chief Complaint', 'Watering', 3),
  ('Chief Complaint', 'Itching', 4),
  ('Chief Complaint', 'Pain', 5),
  ('Chief Complaint', 'Headache', 6),
  ('Chief Complaint', 'Heaviness', 7),
  ('Chief Complaint', 'Follow-up visit', 8),
  ('History', 'Diabetes', 1),
  ('History', 'Hypertension', 2),
  ('History', 'Drug allergy', 3),
  ('History', 'Previous eye surgery', 4),
  ('History', 'Family history of glaucoma', 5),
  ('History', 'Wearing glasses since childhood', 6),
  ('Finding', 'Conjunctival congestion', 1),
  ('Finding', 'Dry eye changes', 2),
  ('Finding', 'Early cataract changes', 3),
  ('Finding', 'Lens clear', 4),
  ('Finding', 'Fundus within normal limits', 5),
  ('Finding', 'IOP within normal limits', 6),
  ('Diagnosis', 'Dry eye', 1),
  ('Diagnosis', 'Refractive error', 2),
  ('Diagnosis', 'Cataract', 3),
  ('Diagnosis', 'Allergic conjunctivitis', 4),
  ('Diagnosis', 'Conjunctivitis', 5),
  ('Diagnosis', 'Glaucoma suspect', 6),
  ('Advice', 'Continue drops as advised', 1),
  ('Advice', 'Avoid rubbing eyes', 2),
  ('Advice', 'Use lubricating eye drops regularly', 3),
  ('Advice', 'Review with reports', 4),
  ('Advice', 'Follow up if symptoms worsen', 5),
  ('Advice', 'Regular follow-up advised', 6),
  ('Spectacle Advice', 'Distance glasses advised', 1),
  ('Spectacle Advice', 'Near glasses advised', 2),
  ('Spectacle Advice', 'Bifocal advised', 3),
  ('Spectacle Advice', 'Progressive lenses advised', 4),
  ('Spectacle Advice', 'Use glasses regularly', 5),
  ('Spectacle Advice', 'Use glasses for distance only', 6),
  ('Spectacle Advice', 'Use glasses for near work only', 7),
  ('Spectacle Advice', 'Continue current glasses', 8),
  ('Spectacle Advice', 'Change glasses as prescribed', 9),
  ('Spectacle Advice', 'Anti-glare coating advised', 10),
  ('Spectacle Advice', 'Photochromic lenses may be considered', 11),
  ('Spectacle Advice', 'Review after adaptation', 12),
  ('Instruction', 'Shake well before use', 1),
  ('Instruction', 'Apply one drop in affected eye', 2),
  ('Instruction', 'Maintain 5 minute gap between drops', 3),
  ('Instruction', 'Do not stop medicine without review', 4);

insert into public.clinical_templates (template_type, template_text, sort_order, is_active)
select template_type, template_text, sort_order, true from approved_templates
on conflict (template_type, template_text) do update
set sort_order = excluded.sort_order, is_active = true;

delete from public.clinical_templates ct
where not exists (
  select 1
  from approved_templates a
  where a.template_type = ct.template_type
    and a.template_text = ct.template_text
);

create temporary table approved_medicines (
  medicine_name text primary key,
  default_eye text,
  default_frequency text,
  default_duration text,
  default_instructions text,
  sort_order integer not null
) on commit drop;

insert into approved_medicines (medicine_name, default_eye, default_frequency, default_duration, default_instructions, sort_order) values
  ('Hylosoft', 'OU', 'Four times daily', '1 month', 'Use regularly as advised', 1),
  ('Mosi - LP', 'OU', 'Four times daily', '10 days', 'Use as advised', 2),
  ('Olopat', 'OU', 'Twice daily', '2 weeks', 'Use as advised', 3);

insert into public.medicine_master (medicine_name, default_eye, default_frequency, default_duration, default_instructions, sort_order, is_active)
select medicine_name, default_eye, default_frequency, default_duration, default_instructions, sort_order, true
from approved_medicines
on conflict (medicine_name) do update
set
  default_eye = excluded.default_eye,
  default_frequency = excluded.default_frequency,
  default_duration = excluded.default_duration,
  default_instructions = excluded.default_instructions,
  sort_order = excluded.sort_order,
  is_active = true;

delete from public.medicine_master mm
where not exists (
  select 1 from approved_medicines a where a.medicine_name = mm.medicine_name
)
and not exists (
  select 1 from public.consultation_medicines cm where cm.medicine_id = mm.id
);

update public.medicine_master mm
set is_active = false
where not exists (
  select 1 from approved_medicines a where a.medicine_name = mm.medicine_name
);

do $$
begin
  if (select count(*) from public.patient_sources where is_active) <> 10 then
    raise exception 'Expected 10 active patient sources after Production master finalisation.';
  end if;
  if (select count(*) from public.services where is_active) <> 10 then
    raise exception 'Expected 10 active services after Production master finalisation.';
  end if;
  if (select count(*) from public.services where is_active and service_category = 'Consultation') <> 1 then
    raise exception 'Expected exactly one active Consultation service after Production master finalisation.';
  end if;
  if not exists (
    select 1 from public.services
    where is_active and service_name = 'Consultation Fee'
      and service_category = 'Consultation' and default_amount = 1000
  ) then
    raise exception 'Approved Consultation Fee master was not applied correctly.';
  end if;
  if (select count(*) from public.frequency_master where is_active) <> 8 then
    raise exception 'Expected 8 active frequencies after Production master finalisation.';
  end if;
  if (select count(*) from public.duration_master where is_active) <> 9 then
    raise exception 'Expected 9 active durations after Production master finalisation.';
  end if;
  if (select count(*) from public.clinical_templates where is_active) <> 48 then
    raise exception 'Expected 48 active clinical templates after Production master finalisation.';
  end if;
  if (select count(*) from public.medicine_master where is_active) <> 3 then
    raise exception 'Expected 3 active medicines after Production master finalisation.';
  end if;
end
$$;

commit;
