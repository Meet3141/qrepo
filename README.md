# QRepo — Smart Question Repository & AI-Powered Paper Generator

[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20%2F%201.5-8E75C2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)

**QRepo** is an enterprise-grade academic platform designed for universities and colleges to streamline question banking, syllabus document processing, AI-driven question generation, examination paper assembly, and multi-tier departmental review workflows.

Equipped with **Google Gemini AI**, QRepo automatically generates context-aware, Bloom's Taxonomy-aligned examination questions directly from course syllabus documents, enforces pedagogical difficulty balance, facilitates collaborative faculty reviews, and compiles export-ready examination papers complete with answer keys.

---

## Table of Contents

- [Key Features](#key-features)
- [Role-Based Access Control](#role-based-access-control-rbac)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Step-by-Step Setup Guide](#step-by-step-setup-guide)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Default Demo Credentials](#default-demo-credentials)
- [Environment Configuration Reference](#environment-configuration-reference)
- [API Endpoints Overview](#api-endpoints-overview)
- [Running Tests & Linting](#running-tests--linting)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Key Features

### 🤖 1. AI-Powered Question Generation & Validation
- **Google Gemini LLM Integration**: Generates contextually accurate questions based on ingested syllabus and reference materials using Google's official `google-genai` SDK.
- **Pedagogical Alignment**: Supports all cognitive levels of **Bloom's Taxonomy** (*Remember, Understand, Apply, Analyze, Evaluate, Create*).
- **Multiple Question Types**:
  - Multiple Choice Questions (MCQ) with 4 plausible options, single correct answer, and explanation.
  - Short Answer Questions with comprehensive answer guidelines.
  - True / False Questions with detailed conceptual reasoning.
  - Fill-in-the-Blanks Questions with unambiguous single-phrase answers.
- **Difficulty Grading**: Strict distribution tagging (*Easy, Medium, Hard*).
- **Automated Validation & Quality Scoring**: Checks for factual hallucination, relevance, duplicate options, and clarity.

### 🔍 2. Collaborative Question Draft Review Studio
- **Differential Review Actions**:
  - **ACCEPT**: Commits generated drafts directly to the verified Question Bank.
  - **EDIT**: In-place edits for question prompt, choices, answers, Bloom level, and difficulty with differential change tracking.
  - **REJECT**: Dismisses low-quality drafts with mandatory rejection reason and star rating for feedback loops.
- **Review History**: Full audit trail of who approved, modified, or rejected drafts.

### 📄 3. Curriculum & Document Ingestion Engine
- **Course & Unit Hierarchy**: Organize coursework by Departments, Subjects (with code and assigned faculty), and Units.
- **Document Text Extraction**: Upload course outlines, lecture notes, and reference books (`.pdf`, `.docx`, `.txt` up to 10 MB).
- **Status Lifecycle**: Automated extraction status tracking (`PENDING` ➔ `PROCESSING` ➔ `COMPLETED` / `FAILED`).
- **Context Grounding**: AI generation extracts relevant unit text chunks directly from processed documents.

### 📝 4. Intelligent Examination Paper Generator
- **Custom Blueprint & Section Templates**: Build full papers divided into customizable sections (e.g., Section A: 10 MCQs, Section B: 5 Short Answer questions).
- **Difficulty Distribution Controls**: Configure target ratios (e.g., 30% Easy, 50% Medium, 20% Hard) with instant client-side validation.
- **Print-Ready PDF Compilation**: Generates professional institutional examination papers using **ReportLab**, with options to include or omit marking schemes and answer keys.

### 📊 5. Departmental & Academic Analytics
- **Admin System Overview**: Platform usage statistics, storage consumption vs. quotas, active users, and real-time activity log stream.
- **Faculty Analytics**: Subject coverage heatmaps, difficulty balance radar, and draft approval metrics.
- **HOD Oversight**: Departmental examination paper status and pending review queues.

---

## Role-Based Access Control (RBAC)

QRepo implements granular, database-backed role-based permissions across 4 distinct institutional roles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QRepo Access Matrix                             │
├─────────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│ Feature         │ Admin        │ HOD          │ Faculty      │ Student │
├─────────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│ User Management │ Full CRUD    │ No           │ No           │ No      │
│ Role & Matrix   │ Full CRUD    │ No           │ No           │ No      │
│ Faculty Roster  │ Full CRUD    │ Dept View/Mod│ No           │ No      │
│ System Logs     │ View         │ No           │ No           │ No      │
│ AI Health Check │ View         │ No           │ No           │ No      │
│ Paper Approvals │ View / Review│ Approve/Rej  │ Submit Only  │ No      │
│ Question Gen    │ Yes          │ Yes          │ Assigned Sub │ No      │
│ Draft Review    │ Yes          │ Yes          │ Assigned Sub │ No      │
│ Document Upload │ Yes          │ Yes          │ Assigned Sub │ No      │
│ Build Papers    │ Yes          │ Yes          │ Assigned Sub │ No      │
│ View Syllabus   │ Yes          │ Yes          │ Yes          │ Yes     │
└─────────────────┴──────────────┴──────────────┴──────────────┴─────────┘
```

- 🛡️ **Administrator (`Admin`)**: Manages institutional accounts, departments, dynamic permissions matrix, system audit logs, storage quotas, and Gemini AI health monitoring.
- 🎓 **Head of Department (`HOD`)**: Manages faculty assignments, monitors department subjects, and approves or rejects submitted examination papers.
- 👨‍🏫 **Faculty (`Faculty`)**: Manages assigned subjects/units, uploads course documents, triggers AI question generation, reviews question drafts, builds examination papers, and exports print-ready PDFs.
- 🧑‍🎓 **Student (`Student`)**: Explores subjects, units, syllabus outlines, and course study materials.

---

## System Architecture

```
                    ┌────────────────────────────────────────┐
                    │               Web Browser              │
                    │        (React 19 + Tailwind CSS)       │
                    └───────────────────┬────────────────────┘
                                        │ HTTP / JSON (Axios)
                                        │ Bearer JWT Auth
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          FastAPI Application           │
                    │   (Async REST API, Uvicorn, Python)    │
                    └───────┬───────────┬────────────┬───────┘
                            │           │            │
            SQLAlchemy 2.0  │           │ Ingestion  │ Google GenAI SDK
                            ▼           ▼            ▼
               ┌────────────────┐ ┌───────────┐ ┌───────────────┐
               │   PostgreSQL   │ │ Local     │ │ Google Gemini │
               │   (+ pgvector) │ │ Storage   │ │ 2.0 / 1.5 Pro │
               └────────────────┘ └───────────┘ └───────────────┘
```

---

## Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Server**: [Uvicorn](https://www.uvicorn.org/) (ASGI)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) & [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Vector Search Ready**: [pgvector](https://github.com/pgvector/pgvector-python)
- **AI / LLM Integration**: [Google GenAI SDK](https://github.com/google/generative-ai-python) (`google-genai`)
- **PDF Generation**: [ReportLab](https://www.reportlab.com/)
- **Authentication & Security**: [python-jose](https://github.com/mpdavis/python-jose) (JWT), [passlib](https://passlib.readthedocs.io/) & [bcrypt](https://pypi.org/project/bcrypt/)
- **Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (with Session & Role Guards)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/) & [Material Symbols](https://fonts.google.com/icons)
- **HTTP Client**: [Axios](https://axios-http.com/) (with Bearer Interceptor & Centralized Toast Error Mapping)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## Repository Structure

```
qrepo/
├── backend/
│   ├── alembic/                 # Database migration scripts & environment
│   ├── alembic.ini              # Alembic configuration
│   ├── app/
│   │   ├── ai/                  # Gemini provider, prompts, validation & schemas
│   │   ├── analytics/           # Platform & faculty analytics endpoints
│   │   ├── api/                 # API router aggregation & dependencies
│   │   ├── auth/                # JWT auth, user models, RBAC & security
│   │   ├── core/                # App config, logging, and global exception handlers
│   │   ├── db/                  # Session management, base model & seed scripts
│   │   ├── department/          # Department models, repository & routes
│   │   ├── document/            # File upload, storage, and text extractors
│   │   ├── papers/              # Paper generation, templates, PDF compiler
│   │   ├── permissions/         # Granular permission matrix & roles
│   │   ├── shared/              # Standard API response wrappers & enums
│   │   ├── subject/             # Subjects & units management
│   │   ├── users/               # Administrative user management & export
│   │   └── main.py              # FastAPI app initialization, CORS & lifespan
│   ├── media/                   # Local file storage (documents & extracted text)
│   ├── requirements.txt         # Backend Python dependencies
│   ├── scripts/                 # Verification & user seed scripts
│   ├── tests/                   # Test suite (AI engine, generation, API endpoints)
│   └── .env.example             # Backend environment template
│
├── frontend/
│   ├── public/                  # Static assets & SVG icons
│   ├── src/
│   │   ├── api/                 # Axios client, auth, session & endpoint modules
│   │   ├── components/          # Reusable UI, Layout, TopBar, Sidebar & Modals
│   │   ├── pages/               # Role-specific dashboard & workflow views
│   │   ├── utils/               # Formatting & utility helpers
│   │   ├── App.jsx              # Routes declaration & role-based route guards
│   │   ├── index.css            # Tailwind CSS configuration & design tokens
│   │   └── main.jsx             # React entry point
│   ├── package.json             # Frontend dependencies & scripts
│   ├── vite.config.js           # Vite build configuration
│   └── .env.example             # Frontend environment template
│
└── README.md                    # Project documentation
```

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **Python**: `3.10` or higher (`3.11` recommended)
2. **Node.js**: `18.x` or higher (`20.x` LTS recommended) & `npm`
3. **PostgreSQL**: `14.x` or higher running locally or accessible via network. *(Alternatively, SQLite can be used for rapid development)*
4. **Google Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).

---

## Step-by-Step Setup Guide

### 1. Clone Repository

```bash
git clone https://github.com/Meet3141/qrepo.git
cd qrepo
```

---

### 2. Backend Setup

#### A. Navigate to backend directory
```bash
cd backend
```

#### B. Create and activate a Python virtual environment

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**On Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### C. Install dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### D. Configure Environment Variables
Copy the `.env.example` file to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

Open `.env` and fill in your database credentials and Gemini API key:
```ini
# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/qrepo

# Security
SECRET_KEY=generate-a-secure-random-secret-key-here-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Google Gemini AI
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

> **Note:** If testing quickly without PostgreSQL, you can use SQLite:  
> `DATABASE_URL=sqlite:///./qrepo.db`

#### E. Run Database Migrations
Initialize the schema, tables, and constraints using Alembic:
```bash
alembic upgrade head
```

#### F. Seed Initial Roles and Test Accounts
Seed the 4 core institutional roles (`Admin`, `HOD`, `Faculty`, `Student`):
```bash
python -m app.db.seed
```

Create default demo accounts for all roles:
```bash
python scripts/seed_test_users.py
```

#### G. Start the Backend Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once started, the backend is available at:
- **API Base URL**: `http://localhost:8000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Alternative ReDoc UI**: `http://localhost:8000/redoc`

---

### 3. Frontend Setup

#### A. Navigate to frontend directory
Open a new terminal window:
```bash
cd qrepo/frontend
```

#### B. Install NPM dependencies
```bash
npm install
```

#### C. Configure Environment Variables
Copy `.env.example` to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

The default configuration points to the local backend:
```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### D. Start the Development Server
```bash
npm run dev
```

Open your browser and navigate to:  
👉 **`http://localhost:5173`**

---

## Default Demo Credentials

When seeded via `python scripts/seed_test_users.py`, the following demo accounts are available:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Admin** | `admin@test.com` | `Pass123!` | Users, Roles, Permissions Matrix, System Logs, AI Health |
| **HOD** | `hod@test.com` | `Pass123!` | Faculty Roster, Paper Approvals, Department Analytics |
| **Faculty** | `faculty@test.com` | `Pass123!` | Subjects, Unit Documents, AI Question Gen, Paper Builder |
| **Student** | `student@test.com` | `Pass123!` | Subject & Unit Syllabus Explorer, Course Materials |

> 🔒 **Password Complexity Policy**: Passwords must be 8–100 characters long and contain at least one letter, one number, and one special character (e.g. `Pass123!`).

---

## Environment Configuration Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | SQLAlchemy connection URI (e.g., `postgresql://user:pass@localhost:5432/qrepo`) |
| `SECRET_KEY` | **Yes** | — | Secret key used for signing JWT tokens |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Token expiration time in minutes |
| `DOCUMENT_STORAGE_DIR` | No | `media/documents` | Directory where uploaded files are stored |
| `MAX_DOCUMENT_SIZE` | No | `10485760` (10 MB) | Maximum permitted file upload size in bytes |
| `STORAGE_QUOTA_BYTES` | No | `None` | Optional disk quota limit shown on admin dashboard |
| `AI_PROVIDER` | No | `gemini` | AI generation provider engine |
| `GEMINI_API_KEY` | **Yes*** | — | API key from Google AI Studio (*required for AI features) |
| `GEMINI_MODEL` | **Yes*** | `gemini-2.0-flash` | Gemini model ID (`gemini-2.0-flash` or `gemini-1.5-pro`) |
| `GEMINI_TEMPERATURE` | No | `0.4` | LLM temperature control (0.0 to 1.0) |
| `GEMINI_MAX_OUTPUT_TOKENS` | No | `8192` | Maximum output tokens per generation request |
| `GEMINI_TIMEOUT_SECONDS` | No | `60` | Network request timeout to Gemini API |
| `GEMINI_MAX_RETRIES` | No | `2` | Automatic retry attempts on rate limits/network glitches |
| `AI_CONTEXT_MAX_CHARS` | No | `12000` | Max context characters passed from syllabus documents |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:8000/api/v1` | URL pointing to the FastAPI backend |

---

## API Endpoints Overview

All routes are prefixed with `/api/v1`:

### 🔐 Authentication & Session
- `POST /auth/login` — Authenticate user and receive JWT access token.
- `POST /auth/register` — Register a student account.
- `GET /auth/me` — Retrieve current authenticated user profile and role.

### 👥 Users & Roles (Admin)
- `GET /users` — List platform users with search and pagination.
- `POST /users` — Create institutional user account.
- `PUT /users/{id}` — Update user profile or role.
- `DELETE /users/{id}` — Suspend or deactivate account.
- `GET /users/export` — Export users list as CSV.
- `GET /roles` — List available system roles.

### 🏢 Departments & Faculty (Admin & HOD)
- `GET /departments` / `POST /departments` — Manage academic departments.
- `GET /faculty` — List faculty members with department filters.
- `POST /faculty` — Create and assign faculty member.
- `PATCH /faculty/{id}` — Update faculty department or status.
- `GET /faculty/export` — Export faculty roster as CSV.

### 🛡️ Permissions Matrix (Admin)
- `GET /permissions/me` — Effective permissions for current user.
- `GET /permissions/matrix` — Full role-permission mapping.
- `PUT /permissions/matrix` — Update granular permission settings.
- `POST /permissions/matrix/reset` — Reset matrix to system defaults.

### 📚 Subjects & Units
- `GET /subjects` — List all subjects.
- `POST /subjects` — Create subject and assign faculty.
- `PUT /subjects/{id}` — Update subject details or assigned faculty.
- `DELETE /subjects/{id}` — Delete subject (cascades to units and documents).
- `GET /subjects/{id}/units` — List units for a subject.
- `POST /subjects/{id}/units` — Create unit within a subject.
- `PUT /units/{id}` / `DELETE /units/{id}` — Update or delete unit.

### 📁 Document Management
- `GET /units/{id}/documents` — List documents uploaded under a unit.
- `POST /units/{id}/documents` — Upload syllabus or reference file (`.pdf`, `.docx`, `.txt`).
- `POST /documents/{id}/process` — Trigger text extraction pipeline.
- `GET /documents/{id}/download` — Download original document file.
- `DELETE /documents/{id}` — Delete document and associated extracted content.

### 🤖 AI Question Generation & Review
- `POST /ai/questions/generate` — Generate questions using Gemini AI grounded in unit syllabus.
- `GET /ai/generations` — List previous generation runs by subject.
- `GET /ai/generations/{id}` — Inspect generation run results and question drafts.
- `POST /ai/drafts/{id}/review` — Review question draft (`ACCEPT`, `EDIT`, or `REJECT`).
- `GET /ai/health` — Check Gemini API provider status and latency.

### 📝 Examination Papers
- `GET /papers` — List examination papers with status filter (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`).
- `POST /papers` — Build new examination paper from question bank with difficulty balance.
- `GET /papers/{id}` — Get paper details, sections, and questions.
- `POST /papers/{id}/submit` — Submit paper for HOD approval.
- `POST /papers/{id}/review` — HOD review action (Approve or Reject with feedback).
- `GET /papers/{id}/pdf` — Download print-ready PDF examination paper (with or without answer key).

### 📈 Analytics & Logs
- `GET /analytics/admin/overview` — Admin high-level KPIs and platform health.
- `GET /analytics/admin/activity` — Real-time platform activity log stream.
- `GET /analytics/faculty/overview` — Faculty metrics (papers, drafts, questions).

---

## Running Tests & Linting

### Backend Tests
Execute unit and integration test suites:

```bash
cd backend

# Run AI engine unit tests
python -m unittest tests/test_ai_engine.py

# Run AI generation integration tests
python -m unittest tests/test_ai_generation.py

# Run full platform API test suite
python -m unittest tests/test_platform_api.py
```

### Frontend Linting & Build Verification

```bash
cd frontend

# Run Oxlint
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Troubleshooting & FAQs

### 1. `AI question generation is not configured on this server` (503)
- Ensure you have added `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-2.0-flash` to your `backend/.env` file.
- Check API health directly in the admin interface under **Settings ➔ AI Configuration** or via `GET /api/v1/ai/health`.

### 2. `Invalid credentials` on Login
- Verify you ran the seeding script: `python backend/scripts/seed_test_users.py`.
- The default seed accounts all use the password `Pass123!`.

### 3. Database connection errors (`psycopg2.OperationalError`)
- Ensure PostgreSQL is running on `localhost:5432`.
- Verify the database exists (`CREATE DATABASE qrepo;`).
- If you prefer to test without PostgreSQL, switch `DATABASE_URL` in `backend/.env` to `sqlite:///./qrepo.db`.

### 4. CORS Errors in the Browser
- The backend default allows `http://localhost:5173`.
- If you run the frontend on another port, update `allow_origins` in `backend/app/main.py`.

### 5. Document Upload Rejected
- Supported formats are **PDF** (`.pdf`), **Word** (`.docx`), and **Plain Text** (`.txt`).
- Legacy `.doc` binary format is not supported; convert to `.docx` or `.pdf` before uploading.
- Maximum file size is 10 MB per document.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
