-- ==============================================================================
-- Staff Attendance & Field Work Order Tracking System
-- PostgreSQL Schema (schema.sql)
-- ==============================================================================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS daily_work_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'lead', 'technician')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEAMS TABLE (Daily team instances)
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TEAM_MEMBERS JUNCTION TABLE
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);

-- 4. ATTENDANCE TABLE
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
    CONSTRAINT unique_user_attendance UNIQUE (user_id, work_date)
);

-- 5. DAILY_WORK_LOGS TABLE
CREATE TABLE daily_work_logs (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    installations_count INTEGER DEFAULT 0,
    troubleshoot_count INTEGER DEFAULT 0,
    notes TEXT
);

-- ==============================================================================
-- INDEXES for query performance
-- ==============================================================================
CREATE INDEX idx_teams_work_date ON teams(work_date);
CREATE INDEX idx_attendance_work_date ON attendance(work_date);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_daily_work_logs_work_date ON daily_work_logs(work_date);
CREATE INDEX idx_daily_work_logs_team_id ON daily_work_logs(team_id);

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Staff Members
INSERT INTO users (name, role, status) VALUES
  ('Marcus Vance', 'lead', 'active'),
  ('Elena Rostova', 'lead', 'active'),
  ('Carlos Mendez', 'lead', 'active'),
  ('Devon Wright', 'technician', 'active'),
  ('Aisha Patel', 'technician', 'active'),
  ('Liam O''Connor', 'technician', 'active'),
  ('Sofia Chen', 'technician', 'active'),
  ('Jamal Washington', 'technician', 'active'),
  ('Maya Lin', 'technician', 'active'),
  ('Lucas Silva', 'technician', 'active'),
  ('Hannah Abbott', 'technician', 'active'),
  ('Noah Miller', 'technician', 'inactive');

-- Sample Teams (past 5 days)
INSERT INTO teams (team_name, work_date) VALUES
  ('Team Alpha', CURRENT_DATE - INTERVAL '4 days'),
  ('Team Beta',  CURRENT_DATE - INTERVAL '4 days'),
  ('Team Alpha', CURRENT_DATE - INTERVAL '3 days'),
  ('Team Beta',  CURRENT_DATE - INTERVAL '3 days'),
  ('Team Alpha', CURRENT_DATE - INTERVAL '2 days'),
  ('Team Beta',  CURRENT_DATE - INTERVAL '2 days'),
  ('Team Alpha', CURRENT_DATE - INTERVAL '1 day'),
  ('Team Beta',  CURRENT_DATE - INTERVAL '1 day'),
  ('Team Alpha', CURRENT_DATE),
  ('Team Beta',  CURRENT_DATE);

-- Team Members for each team
-- Day -4: Alpha (users 1,4,5,6), Beta (users 2,7,8,9)
INSERT INTO team_members (team_id, user_id) VALUES
  (1, 1), (1, 4), (1, 5), (1, 6),
  (2, 2), (2, 7), (2, 8), (2, 9),
  (3, 1), (3, 4), (3, 5), (3, 6),
  (4, 2), (4, 7), (4, 8), (4, 9),
  (5, 1), (5, 4), (5, 5), (5, 10),
  (6, 3), (6, 7), (6, 8), (6, 9),
  (7, 1), (7, 4), (7, 5), (7, 6),
  (8, 2), (8, 7), (8, 8), (8, 11),
  (9, 1), (9, 4), (9, 5), (9, 6),
  (10, 2), (10, 7), (10, 8), (10, 9);

-- Attendance records
INSERT INTO attendance (user_id, work_date, status) VALUES
  (1, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (4, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (5, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (6, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (2, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (7, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (8, CURRENT_DATE - INTERVAL '4 days', 'leave'),
  (9, CURRENT_DATE - INTERVAL '4 days', 'present'),
  (1, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (4, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (5, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (6, CURRENT_DATE - INTERVAL '3 days', 'absent'),
  (2, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (7, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (8, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (9, CURRENT_DATE - INTERVAL '3 days', 'present'),
  (1, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (4, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (5, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (10, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (3, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (7, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (8, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (9, CURRENT_DATE - INTERVAL '2 days', 'present'),
  (1, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (4, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (5, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (6, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (2, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (7, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (8, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (11, CURRENT_DATE - INTERVAL '1 day', 'present'),
  (1, CURRENT_DATE, 'present'),
  (4, CURRENT_DATE, 'present'),
  (5, CURRENT_DATE, 'present'),
  (6, CURRENT_DATE, 'present'),
  (2, CURRENT_DATE, 'present'),
  (7, CURRENT_DATE, 'present'),
  (8, CURRENT_DATE, 'present'),
  (9, CURRENT_DATE, 'present');

-- Daily Work Logs
INSERT INTO daily_work_logs (team_id, work_date, installations_count, troubleshoot_count, notes) VALUES
  (1, CURRENT_DATE - INTERVAL '4 days', 11, 3, 'North sector residential drops - all completed.'),
  (2, CURRENT_DATE - INTERVAL '4 days', 8,  5, 'South commercial zone, 2 priority escalations resolved.'),
  (3, CURRENT_DATE - INTERVAL '3 days', 9,  4, 'Standard residential deployment in Sector 3.'),
  (4, CURRENT_DATE - INTERVAL '3 days', 7,  6, 'Heavy troubleshoot day - ONT firmware issues.'),
  (5, CURRENT_DATE - INTERVAL '2 days', 13, 2, 'Excellent day - hit 13 residential installs.'),
  (6, CURRENT_DATE - INTERVAL '2 days', 10, 3, 'Mixed commercial/residential, clean execution.'),
  (7, CURRENT_DATE - INTERVAL '1 day',  12, 3, 'Residential fiber drops - strong output.'),
  (8, CURRENT_DATE - INTERVAL '1 day',  6,  7, 'Signal degradation sweep - multiple re-splices.'),
  (9, CURRENT_DATE, 10, 4, 'Active day - on target for zone completion.'),
  (10, CURRENT_DATE, 9, 3, 'Commercial Gigabit installs in progress.');
