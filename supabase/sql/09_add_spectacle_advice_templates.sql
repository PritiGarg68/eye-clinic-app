-- Add Spectacle Advice as a supported clinical-template category.

alter table public.clinical_templates
drop constraint if exists clinical_templates_type_check;

alter table public.clinical_templates
add constraint clinical_templates_type_check
check (
  template_type in (
    'Chief Complaint',
    'History',
    'Finding',
    'Diagnosis',
    'Advice',
    'Spectacle Advice',
    'Instruction'
  )
);

insert into public.clinical_templates (
  template_type,
  template_text,
  sort_order
)
values
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
  ('Spectacle Advice', 'Review after adaptation', 12)
on conflict (template_type, template_text) do nothing;
