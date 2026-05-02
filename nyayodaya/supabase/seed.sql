-- Seed departments
insert into departments (name, code) values
  ('Public Works Department', 'PWD'),
  ('Bruhat Bengaluru Mahanagara Palike', 'BBMP'),
  ('Revenue Department', 'REVENUE'),
  ('Department of Health and Family Welfare', 'HEALTH'),
  ('Department of Public Instruction', 'EDUCATION'),
  ('Karnataka Forest Department', 'FOREST'),
  ('Department of Urban Development', 'URBAN'),
  ('Karnataka State Pollution Control Board', 'KSPCB')
on conflict (code) do nothing;

-- Seed demo cases for development
insert into cases (
  case_number, court, order_date, respondent_department_id,
  key_directives, absolute_deadline, relative_deadline_text,
  comply_recommendation, comply_reasoning, responsible_officer,
  contempt_risk, confidence_case_number, confidence_department,
  confidence_deadline, confidence_directive, confidence_overall,
  status
) values (
  'WP/14829/2024',
  'Karnataka High Court',
  '2024-03-15',
  (select id from departments where code = 'PWD'),
  '["Repair the pothole-ridden stretch of NH-48 between Tumkur Road and Yeshwanthpur junction", "Submit compliance report with photographic evidence"]',
  '2024-04-14',
  'within 30 days from the date of this order',
  'comply',
  'The court has issued a clear directive with a specific deadline. Non-compliance risks contempt proceedings. The repair work is within PWD''s mandate and budget.',
  'Principal Secretary, PWD',
  'high',
  95.00, 90.00, 95.00, 88.00, 92.00,
  'pending_verification'
),
(
  'PIL/2341/2024',
  'Karnataka High Court',
  '2024-03-20',
  (select id from departments where code = 'BBMP'),
  '["Clear all unauthorized construction on footpaths along MG Road corridor", "File status report within 6 weeks"]',
  '2024-05-01',
  'within 6 weeks from the date of this order',
  'comply',
  'PIL involving public interest and pedestrian safety. Court has explicitly warned of contempt if order is not complied with.',
  'Commissioner, BBMP',
  'high',
  92.00, 95.00, 90.00, 85.00, 90.50,
  'verified'
),
(
  'WP/9876/2024',
  'Karnataka High Court',
  '2024-03-10',
  (select id from departments where code = 'FOREST'),
  '["Remove encroachments from Bannerghatta forest reserve boundary", "File demarcation report"]',
  '2024-06-10',
  'within 3 months from the date of this order',
  'comply',
  'Forest encroachment case with environmental implications. Court has emphasized urgency given seasonal concerns.',
  'Principal Chief Conservator of Forests',
  'medium',
  88.00, 85.00, 88.00, 82.00, 85.75,
  'verified'
);
