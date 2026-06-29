BEGIN;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = current_schema()
    AND t.relname = 'attendance_records'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 1
    AND c.conkey[1] = (
      SELECT attnum
      FROM pg_attribute
      WHERE attrelid = t.oid
        AND attname = 'session_id'
      LIMIT 1
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      current_schema(),
      'attendance_records',
      constraint_name
    );
  END IF;

  constraint_name := NULL;

  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = current_schema()
    AND t.relname = 'attendance_records'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 1
    AND c.conkey[1] = (
      SELECT attnum
      FROM pg_attribute
      WHERE attrelid = t.oid
        AND attname = 'student_id'
      LIMIT 1
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      current_schema(),
      'attendance_records',
      constraint_name
    );
  END IF;

  constraint_name := NULL;

  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = current_schema()
    AND t.relname = 'attendance_sessions'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 1
    AND c.conkey[1] = (
      SELECT attnum
      FROM pg_attribute
      WHERE attrelid = t.oid
        AND attname = 'schedule_id'
      LIMIT 1
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      current_schema(),
      'attendance_sessions',
      constraint_name
    );
  END IF;

  constraint_name := NULL;

  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = current_schema()
    AND t.relname = 'attendance_sessions'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 1
    AND c.conkey[1] = (
      SELECT attnum
      FROM pg_attribute
      WHERE attrelid = t.oid
        AND attname = 'session_date'
      LIMIT 1
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      current_schema(),
      'attendance_sessions',
      constraint_name
    );
  END IF;
END $$;

COMMIT;
