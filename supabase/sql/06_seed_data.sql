-- 06_seed_data.sql
-- Garg Eye Clinic OPD App
-- Starter seed data for clinic settings, services, sources, and clinical masters

-- ------------------------------------------------------------
-- Clinic settings
-- ------------------------------------------------------------
insert into public.clinic_settings (
  clinic_name,
  doctor_name,
  qualification,
  registration_number,
  address,
  phone,
  email,
  default_consultation_fee
)
select
  'Garg Eye Clinic',
  'Dr Priti Garg',
  'MBBS, MS Ophthalmology',
  'DMC 13414',
  'C-18 Sai Chowk, Madhu Vihar, Near Geetanjali Salon, 110092',
  '+91 9810090866, +91 9910426490, 011-41043002',
  'dr.pritigarg@gmail.com',
  1000
where not exists (
  select 1 from public.clinic_settings
);

-- ------------------------------------------------------------
-- Patient sources
-- ------------------------------------------------------------
insert into public.patient_sources (source_name, sort_order)
values
  ('Walk-in', 1),
  ('Google', 2),
  ('Existing Patient Referral', 3),
  ('Doctor Referral', 4),
  ('Family / Friend', 5),
  ('Signboard', 6),
  ('Camp', 7),
  ('Other', 8)
on conflict (source_name) do nothing;

-- ------------------------------------------------------------
-- Services
-- Amounts are starter values and can be edited later.
-- Old receipts will use payment_items snapshots.
-- ------------------------------------------------------------
insert into public.services (
  service_name,
  service_category,
  default_amount,
  sort_order
)
values
  ('Consultation Fee', 'Consultation', 1000, 1),
  ('OCT', 'Investigation', 1500, 2),
  ('Fundus Photo', 'Investigation', 800, 3),
  ('Perimetry', 'Investigation', 1500, 4),
  ('IOP', 'Investigation', 0, 5),
  ('Other Procedure', 'Procedure', 0, 6)
on conflict do nothing;

-- ------------------------------------------------------------
-- Frequency master
-- ------------------------------------------------------------
insert into public.frequency_master (frequency_label, sort_order)
values
  ('Once daily', 1),
  ('Twice daily', 2),
  ('Three times daily', 3),
  ('Four times daily', 4),
  ('At bedtime', 5),
  ('Every 2 hours', 6),
  ('Every 4 hours', 7),
  ('As advised', 8)
on conflict (frequency_label) do nothing;

-- ------------------------------------------------------------
-- Duration master
-- ------------------------------------------------------------
insert into public.duration_master (duration_label, sort_order)
values
  ('3 days', 1),
  ('5 days', 2),
  ('1 week', 3),
  ('2 weeks', 4),
  ('3 weeks', 5),
  ('1 month', 6),
  ('6 weeks', 7),
  ('As advised', 8)
on conflict (duration_label) do nothing;

-- ------------------------------------------------------------
-- Clinical templates
-- ------------------------------------------------------------

-- Chief Complaint
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('Chief Complaint', 'Diminution of vision', 1),
  ('Chief Complaint', 'Redness', 2),
  ('Chief Complaint', 'Watering', 3),
  ('Chief Complaint', 'Itching', 4),
  ('Chief Complaint', 'Pain', 5),
  ('Chief Complaint', 'Headache', 6),
  ('Chief Complaint', 'Routine eye check-up', 7),
  ('Chief Complaint', 'Follow-up visit', 8)
on conflict do nothing;

-- History / Relevant Background
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('History', 'Diabetes', 1),
  ('History', 'Hypertension', 2),
  ('History', 'Drug allergy', 3),
  ('History', 'Previous eye surgery', 4),
  ('History', 'Family history of glaucoma', 5),
  ('History', 'Wearing glasses since childhood', 6)
on conflict do nothing;

-- Findings
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('Finding', 'Conjunctival congestion', 1),
  ('Finding', 'Dry eye changes', 2),
  ('Finding', 'Early cataract changes', 3),
  ('Finding', 'Lens clear', 4),
  ('Finding', 'Fundus within normal limits', 5),
  ('Finding', 'IOP within normal limits', 6)
on conflict do nothing;

-- Diagnosis
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('Diagnosis', 'Dry eye', 1),
  ('Diagnosis', 'Refractive error', 2),
  ('Diagnosis', 'Cataract', 3),
  ('Diagnosis', 'Allergic conjunctivitis', 4),
  ('Diagnosis', 'Conjunctivitis', 5),
  ('Diagnosis', 'Glaucoma suspect', 6)
on conflict do nothing;

-- Advice
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('Advice', 'Continue drops as advised', 1),
  ('Advice', 'Avoid rubbing eyes', 2),
  ('Advice', 'Use lubricating eye drops regularly', 3),
  ('Advice', 'Review with reports', 4),
  ('Advice', 'Follow up if symptoms worsen', 5),
  ('Advice', 'Regular follow-up advised', 6)
on conflict do nothing;

-- Instructions
insert into public.clinical_templates (template_type, template_text, sort_order)
values
  ('Instruction', 'Shake well before use', 1),
  ('Instruction', 'Apply one drop in affected eye', 2),
  ('Instruction', 'Maintain 5 minute gap between drops', 3),
  ('Instruction', 'Do not stop medicine without review', 4)
on conflict do nothing;

-- ------------------------------------------------------------
-- Starter medicines
-- These are placeholders. Dr Priti can replace/add real common medicines later.
-- ------------------------------------------------------------
insert into public.medicine_master (
  medicine_name,
  default_eye,
  default_frequency,
  default_duration,
  default_instructions,
  sort_order
)
values
  ('Lubricating eye drops', 'OU', 'Four times daily', '1 month', 'Use regularly as advised', 1),
  ('Antiallergic eye drops', 'OU', 'Twice daily', '2 weeks', 'Use as advised', 2),
  ('Antibiotic eye drops', 'OU', 'Four times daily', '1 week', 'Use as advised', 3)
on conflict do nothing;
