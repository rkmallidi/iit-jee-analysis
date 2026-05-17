# IIT JEE Analysis Platform

A full-stack academic management and analytics platform for institutions preparing students for IIT JEE exams. Manage branches, programs, classes, sections, faculty, students, and exams — run OMR uploads, evaluate results, and drill into performance analytics — all through a modern, role-aware web interface.

---

## Tech Stack

| Layer      | Technology                                                      |
|------------|-----------------------------------------------------------------|
| Frontend   | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Recharts |
| Backend    | FastAPI (Python 3.11+) + SQLAlchemy 2.0                         |
| Database   | PostgreSQL 14+                                                  |
| Auth       | JWT (access + refresh tokens)                                   |
| Migrations | Alembic                                                         |

---

## Prerequisites

Make sure the following are installed and available on your system `PATH` before running the project.

### 1. Python 3.11+
Download from https://www.python.org/downloads/

During installation, check **"Add Python to PATH"**.

Verify:
```
python --version
```

### 2. Node.js 18+
Download from https://nodejs.org/

Verify:
```
node --version
npm --version
```

### 3. PostgreSQL 14+
Download from https://www.postgresql.org/download/windows/

During installation:
- Set the superuser (`postgres`) password — remember it.
- Keep the default port **5432**.

Verify (using pgAdmin or the `psql` shell):
```
psql --version
```

---

## First-Time Setup on a New Machine

Follow these steps **once** before using the application.

### Step 1 — Create the PostgreSQL database

Open **pgAdmin** or the **SQL Shell (psql)** that ships with PostgreSQL and run:

```sql
-- Connect as the postgres superuser first
CREATE USER jee_admin WITH PASSWORD 'jee_secret';
CREATE DATABASE iit_jee_analysis OWNER jee_admin;
GRANT ALL PRIVILEGES ON DATABASE iit_jee_analysis TO jee_admin;
```

### Step 2 — Clone / copy the project

Place the project folder anywhere on your machine (e.g. `C:\Projects\IIT_JEE_Analysis`).

### Step 3 — Run the application

Double-click **`run.bat`** in the project root. On first run it will:

1. Verify Python and Node.js are available
2. Create `backend/.env` from `.env.example` (only if no `.env` exists yet)
3. Install Python packages (`pip install -r requirements.txt`)
4. Run all Alembic database migrations — creates every table
5. Seed the database with all roles and the default **admin** user
6. Start the **FastAPI backend** on port **8000** in a new terminal window
7. Install npm packages (`npm install`, first run only)
8. Start the **Vite frontend** on port **5173** in a new terminal window
9. Open the application in your default browser

That's it. No further manual steps are needed.

> **Subsequent runs**: double-click `run.bat` again. It skips steps that are already done (no `.env` exists, `node_modules` present, etc.) and simply starts both servers.

---

## Accessing the Application

| Service            | URL                          |
|--------------------|------------------------------|
| Web Application    | http://localhost:5173         |
| REST API           | http://localhost:8000         |
| API Docs (Swagger) | http://localhost:8000/docs   |
| API Docs (ReDoc)   | http://localhost:8000/redoc  |

---

## Default Admin Login

```
Username : admin
Password : Admin@12345
```

> Change this password immediately after your first login.  
> Go to **Users** → find the admin user → click the edit (pencil) icon.

---

## Environment Variables

The backend reads its configuration from `backend/.env`. The file is auto-created from `.env.example` on first run. Key variables:

| Variable                      | Default Value                                                               | Description                        |
|-------------------------------|-----------------------------------------------------------------------------|------------------------------------|
| `DATABASE_URL`                | `postgresql+psycopg2://jee_admin:jee_secret@localhost:5432/iit_jee_analysis` | PostgreSQL connection string       |
| `JWT_SECRET_KEY`              | `change-me`                                                                 | **Change this in production!**     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                                                                        | JWT access token lifetime          |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `7`                                                                         | JWT refresh token lifetime         |
| `BOOTSTRAP_ADMIN_USERNAME`    | `admin`                                                                     | Default admin username (seed)      |
| `BOOTSTRAP_ADMIN_PASSWORD`    | `Admin@12345`                                                               | Default admin password (seed)      |
| `CORS_ORIGINS`                | `http://localhost:5173`                                                     | Allowed frontend origins           |

---

## User Roles & Access

| Role              | Dashboard | Master Data | Mappings | Students  | Exams     | OMR Upload | Results   | Analytics |
|-------------------|-----------|-------------|----------|-----------|-----------|------------|-----------|-----------|
| **Admin**         | All       | Full access | Full     | All       | Full      | Yes        | All       | All       |
| **Dean**          | Branch    | View only   | —        | Branch    | View      | —          | Branch    | Branch    |
| **Principal**     | Branch    | View only   | —        | Branch    | View      | Yes        | Branch    | Branch    |
| **Vice-Principal**| Branch    | View only   | —        | Branch    | View      | —          | Branch    | —         |
| **Operator**      | —         | —           | —        | —         | —         | Yes        | —         | —         |
| **Faculty**       | —         | —           | —        | —         | —         | —          | —         | —         |

> Non-admin users see **only the data for their assigned branch(es)**. Branch assignments are managed by Admin under the Mappings module.

---

## Modules

### Command Center (Dashboard)
Live KPI strip: total students, exams evaluated, average percentile, branch count. Recent exams table with publish status. Branch upload-readiness panel. All data scoped to the user's branch(es) for non-admin roles.

### Performance Analytics
Tabbed analytics view with score distribution charts, percentile band breakdown, subject radar, branch comparison table and stacked bar, top-10 performers leaderboard, and per-subject faculty performance bars.

### Student Report Card
Search for any student by name or admission number. View full exam history with rank-change arrows, MI (Most-Improved) badges, subject-level scores, percentile trends, and a faculty snapshot.

### Exams
Create and manage exam records (name, date, subject structure). Publish exams to make them visible. Upload OMR answer sheets per branch. Mark exams as evaluated after OMR processing.

### OMR Results (Branch Results)
Upload per-branch OMR files. View upload status per branch per exam. Non-admin users see only their own branch's rows.

### Students
Add students manually or bulk-upload via Excel (download a template first). Edit name and phone; admission number is immutable after creation. Non-admin users see only students in their branch.

### User Management *(Admin only)*
Create, edit, and deactivate users. Assign one or more roles per user. Reset any user's password via the key icon. Deletion is a soft-deactivate — all historical data is preserved.

### Master Data *(Admin only)*
- **Academic Years** — define exam cycles (e.g. 2024–25)
- **Branches** — physical centres with a name and code
- **Programs** — academic programs (e.g. JEE Main + Advanced 2-Year)
- **Classes** — year levels (e.g. Class XI, Class XII)
- **Sections** — section labels (e.g. Section A, Section B)

### Mappings *(Admin only)*
Build the full academic structure:

- **Branch ↔ Program** — assign which programs run at which branch
- **Branch Sections** — create section slots (Branch + Program + Class + Section)
- **Dean → Branch** — assign deans to branches (one dean can manage multiple)
- **Principal → Branch** — assign principals to branches
- **Vice-Principal → Branch** — assign vice-principals to branches
- **Operator → Branch** — assign operators to branches
- **Faculty → Section** — assign faculty to sections with subject (Maths / Chemistry / Physics)
- **Student → Section** — assign students to their section slot for the year
- **Overview Panel** — select any faculty, program, or branch to see a complete relational view of all assignments

### Settings
Per-user theme customisation: light / dark / system mode, 7 primary colour presets, and border radius options. Preferences are saved to the user's account and persist across sessions.

---

## Project Structure

```
IIT_JEE_Analysis/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/              # Route handlers (auth, users, entities, mappings, analytics)
│   │   ├── core/             # Config, database, security helpers
│   │   ├── crud/             # Database access layer
│   │   ├── models/           # SQLAlchemy ORM models
│   │   └── schemas/          # Pydantic request/response schemas
│   ├── migrations/           # Alembic migration files
│   ├── alembic.ini           # Alembic configuration
│   ├── seed.py               # Seeds roles and default admin user
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variable template
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI + layout components
│   │   ├── pages/            # One folder per screen
│   │   ├── store/            # Zustand state (auth + branch context)
│   │   ├── lib/              # Axios API client, utilities
│   │   └── types/            # TypeScript interfaces
│   └── package.json
├── run.bat                   # One-click Windows startup script
└── README.md
```

---

## Manual Start (without run.bat)

### Backend

```bash
cd backend

# Copy environment file (first time only)
copy .env.example .env

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations (creates all tables)
alembic upgrade head

# Seed roles and admin user (first time only)
python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### Frontend (in a new terminal)

```bash
cd frontend

# Install packages (first time only)
npm install

# Start the dev server
npm run dev
```

---

## Stopping the Application

Close the two terminal windows opened by `run.bat`:
- **JEE Backend** — the FastAPI server
- **JEE Frontend** — the Vite dev server

---

## Troubleshooting

### "Migration failed" on `alembic upgrade head`
PostgreSQL is not running or the credentials in `.env` are wrong.
- Make sure the PostgreSQL service is started (check Windows Services or pgAdmin).
- Verify the `DATABASE_URL` in `backend/.env` matches the user/password/database you created in the setup step.

### Port already in use
- Backend port 8000: `netstat -ano | findstr :8000` — kill the process using that PID.
- Frontend port 5173: `netstat -ano | findstr :5173` — kill the process, or edit `vite.config.ts` to use a different port.

### `pip install` fails
Try running the terminal as Administrator, or use a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### npm install fails
Delete `node_modules` and `package-lock.json` then retry:
```bash
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Login succeeds but the page is blank / redirected immediately
The user's role may not have permission for that page. Log in as **admin** and verify the user has the correct role assigned and that branch mappings are set up under the Mappings module.

### Branch data not appearing for non-admin user
The user must be assigned to a branch via the correct mapping table (Dean → Branch, Principal → Branch, etc.) in the Mappings module. After updating mappings, the user must log out and log back in for the branch context to refresh.
