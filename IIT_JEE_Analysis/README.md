# IIT JEE Analysis Platform

A full-stack academic management platform for institutions preparing students for IIT JEE exams. Manage branches, programs, classes, sections, faculty, and their complete mappings — all through a modern, role-aware web interface.

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend   | FastAPI (Python 3.11+) + SQLAlchemy 2.0         |
| Database  | PostgreSQL 14+                                  |
| Auth      | JWT (access + refresh tokens)                   |
| Migrations| Alembic                                         |

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

## Database Setup

After PostgreSQL is installed, create the application database and user.

Open **pgAdmin** or the **SQL Shell (psql)** that comes with PostgreSQL and run:

```sql
-- Connect as the postgres superuser first
CREATE USER jee_admin WITH PASSWORD 'jee_secret';
CREATE DATABASE iit_jee_analysis OWNER jee_admin;
GRANT ALL PRIVILEGES ON DATABASE iit_jee_analysis TO jee_admin;
```

> You only need to do this **once**. The `run.bat` script will create all tables and seed the initial data automatically on first run.

---

## Project Structure

```
IIT_JEE_Analysis/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/              # Route handlers (auth, users, entities, mappings)
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
│   │   ├── store/            # Zustand state (auth, theme)
│   │   ├── lib/              # Axios API client, utilities
│   │   └── types/            # TypeScript interfaces
│   └── package.json
├── run.bat                   # One-click Windows startup script
└── README.md
```

---

## Running the Application

### Quick Start (Windows)

Double-click **`run.bat`** in the project root.

The script will automatically:
1. Verify Python and Node.js are installed
2. Copy `.env.example` → `.env` if no `.env` exists
3. Install Python packages (`pip install -r requirements.txt`)
4. Run Alembic database migrations (`alembic upgrade head`)
5. Seed the database with roles and the default admin user
6. Start the **FastAPI backend** on port **8000** (in its own terminal window)
7. Install npm packages on first run (`npm install`)
8. Start the **Vite frontend** on port **5173** (in its own terminal window)
9. Open the app in your default browser

---

### Manual Start (if you prefer to run each service separately)

#### Step 1 — Backend

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

#### Step 2 — Frontend (in a new terminal)

```bash
cd frontend

# Install packages (first time only)
npm install

# Start the dev server
npm run dev
```

---

## Accessing the Application

| Service        | URL                          |
|----------------|------------------------------|
| Web Application| http://localhost:5173         |
| REST API       | http://localhost:8000         |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc)   | http://localhost:8000/redoc |

---

## Default Admin Login

```
Username : admin
Password : Admin@12345
```

> Change this password immediately after your first login by editing the user in the Users module.

---

## Environment Variables

The backend reads its configuration from `backend/.env`. The file is auto-created from `.env.example` on first run. Key variables:

| Variable                    | Default Value                                                               | Description                        |
|-----------------------------|-----------------------------------------------------------------------------|------------------------------------|
| `DATABASE_URL`              | `postgresql+psycopg2://jee_admin:jee_secret@localhost:5432/iit_jee_analysis` | PostgreSQL connection string       |
| `JWT_SECRET_KEY`            | `change-me`                                                                 | **Change this in production!**     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                                                                      | JWT access token lifetime          |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7`                                                                         | JWT refresh token lifetime         |
| `BOOTSTRAP_ADMIN_USERNAME`  | `admin`                                                                     | Default admin username             |
| `BOOTSTRAP_ADMIN_PASSWORD`  | `Admin@12345`                                                               | Default admin password             |
| `CORS_ORIGINS`              | `http://localhost:5173`                                                     | Allowed frontend origins           |

---

## User Roles

| Role           | Description                                                   |
|----------------|---------------------------------------------------------------|
| **Admin**      | Full access — manage users, roles, all modules and mappings   |
| **Dean**       | Mapped to one or more branches                                |
| **Principal**  | Mapped to a branch                                            |
| **Vice-Principal** | Branch-level management                                   |
| **Faculty**    | Assigned to sections; categorised as Maths, Chemistry or Physics |
| **Operator**   | Data entry and operational access                             |

---

## Modules

### User Management
Create, edit, and deactivate users. Assign one or more roles per user. Capture phone and WhatsApp numbers.

### Branch Management
Define physical branches (centres) with a name and code.

### Program Management
Define academic programs (e.g. JEE Main + Advanced — 2 Year).

### Class Management
Define class levels (e.g. Year 1 / Class XI, Year 2 / Class XII).

### Section Management
Define sections (e.g. Section A, Section B).

### Mappings
The core of the platform — build the full academic structure:

- **Branch ↔ Program** — Assign which programs run at which branches
- **Branch Sections** — Create section slots (Branch + Program + Class + Section)
- **Dean → Branch** — Assign deans to branches (one dean can manage multiple branches)
- **Principal → Branch** — Assign principals to branches
- **Faculty → Section** — Assign faculty to section slots with their subject (Maths / Chemistry / Physics)
- **Overview Panel** — Select any faculty, program, or branch and see a complete relational view of all assignments

### Settings
Per-user theme customisation: light/dark/system mode, 7 primary colour presets, and border radius options. Theme preferences are saved to the user's account.

---

## Stopping the Application

Close the two terminal windows that were opened by `run.bat`:
- **JEE Backend** — the FastAPI server
- **JEE Frontend** — the Vite dev server

---

## Troubleshooting

### "Migration failed" on `alembic upgrade head`
PostgreSQL is not running or the credentials in `.env` are wrong.
- Make sure the PostgreSQL service is started (check Windows Services or pgAdmin).
- Verify the `DATABASE_URL` in `backend/.env` matches the user/password/database you created.

### Port already in use
- Backend port 8000 in use: `netstat -ano | findstr :8000` — kill the process using that PID.
- Frontend port 5173 in use: `netstat -ano | findstr :5173` — kill the process, or edit `vite.config.ts` to use a different port.

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
