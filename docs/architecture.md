# AI Architecture Assistant — Project Architecture

## 🧠 Overview
AI-powered SaaS that connects to a GitHub repository, parses its structure, and generates a clear `architecture.md` explaining its architecture, file/folder structure, and relationships.

## 🧰 Tech Stack
- **Frontend:** React (Next.js) + TypeScript + TailwindCSS
- **Backend:** Node.js (Express) + TypeScript
- **Database:** Supabase (PostgreSQL + Auth)
- **Storage:** Supabase Storage
- **AI:** OpenAI GPT models via API
- **Testing:** Jest (backend) / Vitest + Testing Library (frontend)
- **Hosting:** Vercel (frontend), Render/Fly.io (backend)

---

## 🗂️ Folder Structure
/apps
/web → React frontend (Next.js)
/api → Node backend (Express)
/api/src/routes → REST endpoints
/api/src/services→ Business logic
/packages
/common → Shared types, utilities, and prompt templates
/docs → Documentation (architecture.md, task.md)


---

## 🧩 Database Models

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email | text | User email |
| created_at | timestamp | Auto timestamp |

### `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| repo_name | text | e.g. "user/repo" |
| installation_id | text | GitHub installation id |
| created_at | timestamp | Auto timestamp |

### `snapshots`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | References projects.id |
| markdown | text | Generated architecture.md content |
| created_at | timestamp | Auto timestamp |

---

## 🧱 Service Layers

| Service | Responsibility |
|----------|----------------|
| **AuthService** | GitHub OAuth handling |
| **ProjectService** | CRUD for project records |
| **RepoParserService** | Fetches repo tree and normalizes file data |
| **LLMService** | Calls OpenAI with prompts |
| **SnapshotService** | Saves architecture snapshots to DB |

---

## 🧠 State Management

- Frontend state lives in **React Query** for API cache & project data.
- Global app state managed with Zustand or Context API (lightweight, persistent).
- Auth handled via **Supabase Auth** session.

---

## 🧪 Testing Framework

- **Backend:** Jest + Supertest
- **Frontend:** Vitest + React Testing Library
- Integration tests simulate:  
  `OAuth → RepoParser → LLM → Snapshot creation`

---

## 🧱 Design Patterns & Conventions

- **Architecture:** Clean layered (Routes → Services → DB)
- **Naming Rules:**
  - Services end with `Service.ts`
  - Tests mirror filename, e.g. `RepoParserService.test.ts`
  - Variables use `camelCase`
  - Components use `PascalCase`
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`)
- **Branches:** `feature/xxx`, `fix/xxx`

---

## 🔐 Security

- GitHub tokens stored in Supabase encrypted.
- LLM prompts sanitized.
- API routes authenticated with Supabase JWT.

---

## 🧭 Project Workflow

1. Every new feature begins as a `task.md` file.
2. Cursor reads both `architecture.md` + `task.md` to plan changes.
3. Code follows the **Coding Protocol**:
   - Minimal changes per step
   - Modular, testable code
   - Stop after each step
4. You test → commit → move to next step.

---

## 🧩 Coding Protocol (for all agents + devs)

- Write **only** what’s needed for the current step.
- Never refactor or touch unrelated files.
- Always add or update tests.
- Stop after each step — wait for validation.
- If manual configuration (API keys, Auth, etc.) is needed, tell the user clearly.

