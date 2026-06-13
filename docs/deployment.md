# Deployment

This project now has GitHub Actions for CI and deployment.

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests. It checks:

- Backend install, Python extractor dependencies, and Jest tests.
- Frontend install, TypeScript typecheck, and Expo web export.

## Backend

Use Render, Railway, Fly.io, or another Node host for `forensic-backend`.

Recommended backend settings:

- Root directory: `forensic-backend`
- Build command: `npm ci && python -m pip install -r python-engine/requirements.txt`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in the hosting dashboard:

- `NODE_ENV=production`
- `PORT` if your host requires it
- `MONGODB_URI` with a MongoDB Atlas connection string
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLERK_SECRET_KEY` from the Clerk Dashboard API keys page
- AI values such as `AI_PROVIDER=groq`, `GROQ_API_KEY`, and `GROQ_MODEL`

For Render deploy hooks, add this GitHub repository secret:

- `RENDER_DEPLOY_HOOK_URL`

Then `.github/workflows/deploy-backend-render.yml` can trigger backend redeploys after tests pass.

## Frontend

The frontend can deploy as a static Expo web build using GitHub Pages.

In GitHub repository settings:

- Pages source: GitHub Actions
- Repository variable: `EXPO_PUBLIC_API_URL=https://your-backend-domain/api`
- Repository variable: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...` from Clerk

Then run the `Deploy Frontend to GitHub Pages` workflow manually, or push frontend changes to `main`.
