BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
    CREATE TYPE card_status AS ENUM ('ACTIVE', 'INACTIVE', 'LOST');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'LATE', 'ABSENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_log_status') THEN
    CREATE TYPE scan_log_status AS ENUM ('SUCCESS', 'REJECTED', 'UNREGISTERED', 'DUPLICATE', 'ERROR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_response_code') THEN
    CREATE TYPE scan_response_code AS ENUM (
      'PRESENT',
      'LATE',
      'ALREADY_ATTENDED',
      'CARD_NOT_REGISTERED',
      'CARD_INACTIVE',
      'NO_ACTIVE_SCHEDULE',
      'NOT_YOUR_CLASS',
      'ATTENDANCE_CLOSED',
      'DEVICE_NOT_REGISTERED',
      'SERVER_ERROR'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  study_program VARCHAR(120),
  cohort_year INTEGER CHECK (cohort_year IS NULL OR cohort_year BETWEEN 2000 AND 2100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nim VARCHAR(30) NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfid_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  uid VARCHAR(64) NOT NULL,
  card_label VARCHAR(100),
  status card_status NOT NULL DEFAULT 'ACTIVE',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rfid_cards_uid_not_blank CHECK (length(trim(uid)) > 0),
  CONSTRAINT rfid_cards_deactivated_after_issue CHECK (
    deactivated_at IS NULL OR deactivated_at >= issued_at
  )
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  credits SMALLINT NOT NULL CHECK (credits > 0 AND credits <= 12),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(120),
  floor VARCHAR(30),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  device_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  api_key_hash TEXT NOT NULL,
  description TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT devices_device_code_not_blank CHECK (length(trim(device_code)) > 0)
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES courses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  day_of_week VARCHAR(10) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  on_time_cutoff TIME NOT NULL,
  late_cutoff TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT class_schedules_day_check CHECK (
    day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
  ),
  CONSTRAINT class_schedules_time_order CHECK (
    start_time < end_time
    AND start_time <= on_time_cutoff
    AND on_time_cutoff <= late_cutoff
    AND late_cutoff <= end_time
  )
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  session_date DATE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  on_time_deadline_at TIMESTAMPTZ NOT NULL,
  late_deadline_at TIMESTAMPTZ NOT NULL,
  status session_status NOT NULL DEFAULT 'UPCOMING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_sessions_unique_schedule_date UNIQUE (schedule_id, session_date),
  CONSTRAINT attendance_sessions_time_order CHECK (
    start_at < end_at
    AND start_at <= on_time_deadline_at
    AND on_time_deadline_at <= late_deadline_at
    AND late_deadline_at <= end_at
  )
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status attendance_status NOT NULL,
  scanned_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_records_unique_session_student UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS rfid_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(64) NOT NULL,
  device_code VARCHAR(50) NOT NULL,
  device_id UUID REFERENCES devices(id) ON UPDATE CASCADE ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON UPDATE CASCADE ON DELETE SET NULL,
  card_id UUID REFERENCES rfid_cards(id) ON UPDATE CASCADE ON DELETE SET NULL,
  schedule_id UUID REFERENCES class_schedules(id) ON UPDATE CASCADE ON DELETE SET NULL,
  attendance_session_id UUID REFERENCES attendance_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL,
  attendance_record_id UUID REFERENCES attendance_records(id) ON UPDATE CASCADE ON DELETE SET NULL,
  log_status scan_log_status NOT NULL,
  response_code scan_response_code NOT NULL,
  message TEXT NOT NULL,
  raw_payload JSONB,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rfid_scan_logs_uid_not_blank CHECK (length(trim(uid)) > 0),
  CONSTRAINT rfid_scan_logs_device_code_not_blank CHECK (length(trim(device_code)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS rfid_cards_one_active_card_per_student_idx
  ON rfid_cards(student_id)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS rfid_cards_unique_active_uid_idx
  ON rfid_cards(uid)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS students_class_id_idx
  ON students(class_id);

CREATE INDEX IF NOT EXISTS students_is_active_idx
  ON students(is_active);

CREATE INDEX IF NOT EXISTS devices_room_id_idx
  ON devices(room_id);

CREATE INDEX IF NOT EXISTS devices_is_active_idx
  ON devices(is_active);

CREATE INDEX IF NOT EXISTS class_schedules_lookup_idx
  ON class_schedules(room_id, day_of_week, is_active, start_time, end_time);

CREATE INDEX IF NOT EXISTS attendance_sessions_status_idx
  ON attendance_sessions(session_date, status);

CREATE INDEX IF NOT EXISTS attendance_records_student_idx
  ON attendance_records(student_id, status);

CREATE INDEX IF NOT EXISTS attendance_records_session_idx
  ON attendance_records(session_id);

CREATE INDEX IF NOT EXISTS rfid_scan_logs_scanned_at_idx
  ON rfid_scan_logs(scanned_at DESC);

CREATE INDEX IF NOT EXISTS rfid_scan_logs_device_code_idx
  ON rfid_scan_logs(device_code, scanned_at DESC);

CREATE INDEX IF NOT EXISTS rfid_scan_logs_uid_idx
  ON rfid_scan_logs(uid, scanned_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_admins ON admins;
CREATE TRIGGER set_updated_at_admins
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_classes ON classes;
CREATE TRIGGER set_updated_at_classes
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_students ON students;
CREATE TRIGGER set_updated_at_students
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rfid_cards ON rfid_cards;
CREATE TRIGGER set_updated_at_rfid_cards
BEFORE UPDATE ON rfid_cards
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_courses ON courses;
CREATE TRIGGER set_updated_at_courses
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_lecturers ON lecturers;
CREATE TRIGGER set_updated_at_lecturers
BEFORE UPDATE ON lecturers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rooms ON rooms;
CREATE TRIGGER set_updated_at_rooms
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_devices ON devices;
CREATE TRIGGER set_updated_at_devices
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_class_schedules ON class_schedules;
CREATE TRIGGER set_updated_at_class_schedules
BEFORE UPDATE ON class_schedules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_attendance_sessions ON attendance_sessions;
CREATE TRIGGER set_updated_at_attendance_sessions
BEFORE UPDATE ON attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_attendance_records ON attendance_records;
CREATE TRIGGER set_updated_at_attendance_records
BEFORE UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Akun admin awal dibuat melalui script aplikasi agar password selalu di-hash
-- pada saat provisioning dan tidak perlu disimpan sebagai seed statis.

COMMIT;
