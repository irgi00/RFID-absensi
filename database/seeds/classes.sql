INSERT INTO classes (code, name, study_program, cohort_year, is_active)
VALUES
  ('15.5A.01', 'Kelas 15.5A.01', NULL, NULL, TRUE),
  ('15.5B.01', 'Kelas 15.5B.01', NULL, NULL, TRUE),
  ('15.5C.01', 'Kelas 15.5C.01', NULL, NULL, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
