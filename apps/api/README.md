# API Backend

This is the backend API for the AI Architecture Assistant, built with Express.js and TypeScript.

## Features

- GitHub OAuth integration
- Project management
- Supabase database integration
- RESTful API endpoints

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth app client ID
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth app client secret
   - `GITHUB_REDIRECT_URI`: OAuth redirect URI (default: http://localhost:3000/auth/github/callback)
   - `LLM_PROVIDER`: `openai` (default) or `ollama`
   - `OPENAI_API_KEY`: Required when `LLM_PROVIDER=openai`
   - `OLLAMA_BASE_URL`: Optional, defaults to `http://localhost:11434`
   - `OLLAMA_MODEL`: Optional, defaults to `llama3`

### Database Setup

Run the SQL script in `docs/supabase-schema.sql` using the Supabase SQL editor (or the Supabase CLI) to create the required `projects` and `snapshots` tables before starting the API. The service role key expects these tables to exist.

### Using Ollama Instead of OpenAI

If you have [Ollama](https://ollama.com) running locally, you can set `LLM_PROVIDER=ollama` to bypass OpenAI. Ensure the selected model (default `llama3`) is pulled (`ollama pull llama3`) and that the Ollama server is running (`ollama serve`).

## Development

```bash
pnpm dev
```

## Testing

```bash
pnpm test
```

## API Endpoints

### Authentication
- `GET /api/auth/github/url` - Get GitHub OAuth URL
- `POST /api/auth/github/callback` - Handle GitHub OAuth callback

### Projects
- `GET /api/projects` - Get all projects for a user
- `GET /api/projects/:id` - Get a specific project

### Health
- `GET /health` - Health check endpoint
