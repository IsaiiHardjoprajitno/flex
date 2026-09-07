-- ==============================================================================
-- Field Operations & Performance Tracking System - Supabase / PostgreSQL Schema
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS / STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Technician', 'Lead', 'Supervisor', 'Admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    skills TEXT[] DEFAULT '{}',
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DAILY ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS daily_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'On Leave', 'Late', 'Half Day')),
    check_in_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_staff_daily_attendance UNIQUE (staff_id, date)
);

-- 4. TEAMS (DAILY ASSIGNMENT) TABLE
CREATE TABLE IF NOT EXISTS daily_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_id UUID NOT NULL REFERENCES staff(id),
    vehicle_zone VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_name_date UNIQUE (team_name, date)
);

-- 4b. TEAM MEMBERS JUNCTION TABLE (3-5 Technicians per team)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES daily_teams(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_staff UNIQUE (team_id, staff_id)
);

-- 5. PERFORMANCE LOGS: INSTALLATIONS
CREATE TABLE IF NOT EXISTS installation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES daily_teams(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity_completed INTEGER NOT NULL CHECK (quantity_completed >= 0),
    install_type VARCHAR(100) DEFAULT 'Standard Fiber', -- e.g. 'Residential Fiber', 'Commercial Fiber', 'Mesh Upgrade'
    location_zone VARCHAR(100),
    hours_spent NUMERIC(4,2) DEFAULT 8.0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PERFORMANCE LOGS: TROUBLESHOOT CASES
CREATE TABLE IF NOT EXISTS troubleshoot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES daily_teams(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    cases_resolved INTEGER NOT NULL CHECK (cases_resolved >= 0),
    category VARCHAR(100) NOT NULL, -- e.g. 'Optical Signal', 'Cabling/Drop', 'Modem/ONT Config', 'Hardware Replacement'
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROLLUP & ANALYTICS VIEWS
-- ==============================================================================

-- 1. Daily Team Performance Summary View
CREATE OR REPLACE VIEW view_daily_team_performance AS
SELECT 
    t.id AS team_id,
    t.team_name,
    t.date,
    s.name AS lead_name,
    COUNT(DISTINCT tm.staff_id) AS total_crew_size,
    COALESCE(SUM(i.quantity_completed), 0) AS total_installations,
    COALESCE(SUM(tr.cases_resolved), 0) AS total_troubleshoots
FROM daily_teams t
JOIN staff s ON t.lead_id = s.id
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN installation_logs i ON t.id = i.team_id AND t.date = i.date
LEFT JOIN troubleshoot_logs tr ON t.id = tr.team_id AND t.date = tr.date
GROUP BY t.id, t.team_name, t.date, s.name;

-- 2. Weekly & Monthly Rollup View
CREATE OR REPLACE VIEW view_team_rollups AS
SELECT 
    t.team_name,
    DATE_TRUNC('week', t.date) AS week_start,
    DATE_TRUNC('month', t.date) AS month_start,
    SUM(COALESCE(i.quantity_completed, 0)) AS weekly_installations,
    SUM(COALESCE(tr.cases_resolved, 0)) AS weekly_troubleshoots,
    COUNT(DISTINCT t.date) AS active_days
FROM daily_teams t
LEFT JOIN installation_logs i ON t.id = i.team_id
LEFT JOIN troubleshoot_logs tr ON t.id = tr.team_id
GROUP BY t.team_name, DATE_TRUNC('week', t.date), DATE_TRUNC('month', t.date);

-- 3. Individual Technician Participation View
CREATE OR REPLACE VIEW view_technician_participation AS
SELECT 
    s.id AS staff_id,
    s.name AS staff_name,
    s.role,
    COUNT(DISTINCT tm.team_id) AS total_shifts,
    COALESCE(SUM(i.quantity_completed), 0) AS total_attributed_installs,
    COALESCE(SUM(tr.cases_resolved), 0) AS total_attributed_troubleshoots
FROM staff s
LEFT JOIN team_members tm ON s.id = tm.staff_id
LEFT JOIN daily_teams dt ON tm.team_id = dt.id
LEFT JOIN installation_logs i ON dt.id = i.team_id
LEFT JOIN troubleshoot_logs tr ON dt.id = tr.team_id
GROUP BY s.id, s.name, s.role;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE troubleshoot_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view data
CREATE POLICY "Authenticated users can read staff" ON staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read attendance" ON daily_attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read teams" ON daily_teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert logs" ON installation_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert troubleshoots" ON troubleshoot_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
