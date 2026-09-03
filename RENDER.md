# Deploy AgentFlow on Render

AgentFlow is two services: a FastAPI backend and a Next.js frontend. This repo includes a Blueprint at `render.yaml`.

## 1. Push to GitHub or GitLab

Render deploys from a Git remote. Commit this repo and push it, then connect that repository in Render.

## 2. Create services from the Blueprint (recommended)

1. Open [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New** -> **Blueprint**
3. Connect the repository that contains `render.yaml`
4. Apply the Blueprint

This creates:

- `agentflow-api` — Python / FastAPI (`agentflow/backend`)
- `agentflow-web` — Node / Next.js (`agentflow/frontend`)

`BACKEND_HOST` on the web service is wired from `agentflow-api`. The Next.js `/api` route prefixes it with `https://`. You can also set `BACKEND_URL` (full URL) to override it.

## 3. Set secrets

In **agentflow-api** -> **Environment**, fill in at least one provider key (leave both empty to run in offline mock mode):

| Key | Required | Notes |
| --- | --- | --- |
| `USER_GEMINI_API_KEY` | no | Google AI Studio key |
| `USER_LLM_API_KEY` | no | OpenAI-compatible key (DeepSeek, OpenRouter, etc.) |
| `USER_LLM_BASE_URL` | no | Default `https://api.deepseek.com/v1` |
| `USER_LLM_MODEL` | no | Default `deepseek-chat` |
| `LLM_PROVIDER` | no | `auto`, `offline`, `openai`, or `gemini` |
| `CORS_ORIGINS` | no | Default `*`. After first deploy you can set it to the web URL |

Do not commit `.env` files. Set values in the Render dashboard only.

## 4. Manual setup (if you skip the Blueprint)

### API service

- Type: **Web Service**
- Root directory: `agentflow/backend`
- Runtime: **Python 3**
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/health`

### Web service

- Type: **Web Service**
- Root directory: `agentflow/frontend`
- Runtime: **Node**
- Build: `npm ci && npm run build`
- Start: `npx next start --hostname 0.0.0.0 --port $PORT`
- Env: `BACKEND_URL` = the API service URL, e.g. `https://agentflow-api.onrender.com` (or set `BACKEND_HOST` to the API hostname)

## 5. After deploy

Open the **agentflow-web** URL. The UI proxies `/api/*` to the backend, including the live SSE stream.

SQLite on Render is stored on the instance disk and is wiped on every deploy/restart. That is fine for demos. For durable history, create a Render PostgreSQL database and set `DATABASE_URL` on `agentflow-api` to the internal connection string (`postgresql://...`).

Free web services spin down after idle time. The first request after idle can take 30–60 seconds.
