# Staff Attendance & Field Work Order Tracking System

A full-stack web application built with **Node.js**, **Express**, **PostgreSQL** (`pg`), and **React** + **Tailwind CSS**.

## Architecture

```
site/
├── server/                         # Backend (Express + pg)
│   ├── schema.sql                  # PostgreSQL DDL with tables, constraints & seed data
│   ├── package.json                # Server dependencies & scripts
│   ├── server.js                   # Express app entry point
│   ├── .env.example                # Environment variable template
│   ├── db/
│   │   └── index.js                # pg.Pool connection pooler with query/transaction helpers
│   ├── controllers/
│   │   ├── staffController.js      # GET /api/staff, POST /api/staff
│   │   ├── attendanceController.js # POST /api/attendance (bulk), GET /api/attendance
│   │   ├── teamController.js       # POST /api/teams/daily-log (transactional)
│   │   └── reportController.js     # GET /api/reports/daily, GET /api/reports/summary
│   ├── routes/
│   │   ├── staffRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── teamRoutes.js
│   │   └── reportRoutes.js
│   └── scripts/
│       └── seed.js                 # Database initialization script
│
├── client/                         # Frontend (React + Tailwind CSS)
│   └── index.html                  # Single Page Application with API integration
│
├── docker-compose.yml              # PostgreSQL 16 container with auto schema init
└── README.md                       # This file
```

---

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | Staff members with roles (`admin`, `lead`, `technician`) and status (`active`, `inactive`). |
| `teams` | Daily team instances with team_name and work_date. |
| `team_members` | Junction table linking 3 to 5 staff IDs to a daily team (FK cascade). |
| `attendance` | Daily attendance per user (`present`, `absent`, `leave`), unique on `(user_id, work_date)`. |
| `daily_work_logs` | Installations completed, troubleshoot cases resolved, and notes per team per day. |

All queries use **parameterized SQL** (`$1, $2, ...`) to prevent SQL injection.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/staff` | Fetch all active staff members |
| `POST` | `/api/staff` | Add a new staff member |
| `POST` | `/api/attendance` | Bulk log daily attendance for an array of staff |
| `GET` | `/api/attendance?date=YYYY-MM-DD` | Get attendance records for a specific date |
| `POST` | `/api/teams/daily-log` | **Transactional** (`BEGIN`/`COMMIT`): Create team -> insert 3 to 5 members -> log work -> upsert attendance |
| `GET` | `/api/reports/daily?date=YYYY-MM-DD` | Aggregated daily report with teams, members, installs, troubleshoots |
| `GET` | `/api/reports/summary?timeframe=daily\|weekly\|monthly` | Aggregated totals per team over selected interval |
| `GET` | `/api/health` | Health check |

---

## Quick Start

### Option A: Docker + Node.js (Recommended)

#### 1. Start PostgreSQL with Docker

```bash
docker compose up -d
```

This launches PostgreSQL 16 on port 5432 and automatically runs `server/schema.sql` to create tables and seed data.

#### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env` if needed (defaults work with Docker):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fieldops
PORT=5000
```

#### 3. Install Dependencies & Start Server

```bash
cd server
npm install
npm run dev
```

The API server starts at `http://localhost:5000`.

#### 4. Open the Frontend

Open `client/index.html` in your browser, **or** navigate to `http://localhost:5000` (the server serves client files statically).

---

### Option B: Local PostgreSQL (No Docker)

#### 1. Create Database

```bash
createdb fieldops
```

#### 2. Run Schema & Seed Data

```bash
psql -d fieldops -f server/schema.sql
```

Or using the Node.js seed script:
```bash
cd server
npm install
node scripts/seed.js
```

#### 3. Configure & Start

```bash
cd server
cp .env.example .env
# Edit DATABASE_URL if your PostgreSQL credentials differ
npm run dev
```

---

### Option C: Frontend Only (Demo Mode)

The React frontend works **without any backend**. Simply open `client/index.html` in your browser. It automatically detects that the API is unreachable and falls back to an in-memory demo dataset with realistic sample data.

---

## Frontend Features

### Daily Log Entry Form
- Date selector (defaults to today)
- Team name input
- Multi-select for 3 to 5 staff members with real-time validation badge
- Per-member attendance status override (Present / Absent / Leave)
- Number inputs for installations completed and troubleshoot cases
- Transactional submit to `POST /api/teams/daily-log`

### Performance Dashboard
- Timeframe filter: Today, This Week, This Month
- Team filter dropdown
- KPI summary cards: Total Installations, Total Troubleshoots, Active Teams, Avg Installs/Day
- Team performance summary table (aggregated by timeframe)
- Daily detail table listing each team, assigned members, installs, troubleshoots, and notes

---

## Code Quality

- **Modular file structure**: `/routes`, `/controllers`, `/db`
- **Parameterized SQL**: All queries use `$1, $2, ...` placeholders - no string interpolation
- **Transactional integrity**: `POST /api/teams/daily-log` uses `BEGIN` / `COMMIT` / `ROLLBACK`
- **Centralized error handling**: Express error middleware catches all unhandled errors
- **Input validation**: Server-side checks for required fields, valid enums, and array length constraints
- **CORS enabled**: Cross-origin requests supported for separate frontend hosting
