# Project Conversation & Changes Summary

Date: 2026-05-28

## Purpose
- This document captures the conversation history summary, technical findings, and a concise list of changes made so far to the repository.

## High-level Summary
- Performed a full repo audit (frontend, two backends, python extraction engine).
- Identified platform mismatches (web APIs used in React Native), duplicate backend folders, and missing password-reset flow and tests.
- Implemented several cross-stack improvements focusing on authentication, email OTP, reset-code flow, and frontend storage compatibility.

## Key Changes (files created/edited)
- Created: [forensic-backend/src/utils/emailService.js](forensic-backend/src/utils/emailService.js) — nodemailer helper for OTP emails.
- Created: [forensic-backend/.env](forensic-backend/.env) — example env variables (template).
- Created: [forensic-backend/test/auth.e2e.test.js](forensic-backend/test/auth.e2e.test.js) — E2E auth tests using mongodb-memory-server + supertest.
- Created: [.github/workflows/ci.yml](.github/workflows/ci.yml) — CI workflow to run backend tests on push/PR.
- Edited: [forensic-backend/src/models/User.js](forensic-backend/src/models/User.js) — extended user schema to support OTP/refresh token patterns.
- Edited: [forensic-backend/src/controllers/auth.controller.js](forensic-backend/src/controllers/auth.controller.js) — align signup/verify/resend/login flows.
- Edited: [forensic-backend/src/routes/auth.routes.js](forensic-backend/src/routes/auth.routes.js) — route alignment for auth endpoints.
- Edited: [forensic-backend/package.json](forensic-backend/package.json) — package updates for backend utilities.
- Edited: [forensic-backend/src/controllers/timeline.controller.js](forensic-backend/src/controllers/timeline.controller.js) — small alignment changes to timeline controller.
- Created: [frontend/src/auth/authStorage.ts](frontend/src/auth/authStorage.ts) — AsyncStorage wrapper with localStorage fallback.
- Edited: [frontend/package.json](frontend/package.json) — added AsyncStorage dependency.
- Edited: [frontend/src/services/api.ts](frontend/src/services/api.ts) — centralized API wrapper; includes token from authStorage.
- Edited: [frontend/src/auth/authService.ts](frontend/src/auth/authService.ts) — use authStorage; adapt signup/login flows.
- Edited: [frontend/src/auth/AuthContext.tsx](frontend/src/auth/AuthContext.tsx) — context uses new storage API.
- Edited: [frontend/src/screens/LoginScreen.tsx](frontend/src/screens/LoginScreen.tsx) — updated UI flow to match OTP/resend/forgot.
- Edited: [frontend/src/screens/SignUpScreen.tsx](frontend/src/screens/SignUpScreen.tsx) — updated signup to trigger OTP flow.
- Created: [frontend/src/screens/ForgotPasswordScreen.tsx](frontend/src/screens/ForgotPasswordScreen.tsx) — UI to request reset token.
- Created: [frontend/src/screens/ResetPasswordScreen.tsx](frontend/src/screens/ResetPasswordScreen.tsx) — UI to set new password with token.
- Edited: [frontend/src/navigation/index.tsx](frontend/src/navigation/index.tsx) — adjusted navigation stack to include OTP/reset screens.
- Edited: [frontend/src/services/caseService.ts](frontend/src/services/caseService.ts) — minor normalization changes.
- Edited: [forensic-backend/src/controllers/auth.controller.js](forensic-backend/src/controllers/auth.controller.js) — enforced OTP verification, added reset-code flow, and email-domain validation (allowlist + MX check).
- Edited: [forensic-backend/src/routes/auth.routes.js](forensic-backend/src/routes/auth.routes.js) — added OTP routes and reset-code validation.
- Edited: [forensic-backend/src/models/User.js](forensic-backend/src/models/User.js) — added OTP and verification fields.
- Edited: [frontend/src/auth/authService.ts](frontend/src/auth/authService.ts) — added OTP verify/resend handling and sign-up OTP response handling.
- Edited: [frontend/src/auth/AuthContext.tsx](frontend/src/auth/AuthContext.tsx) — exposed OTP verify/resend methods.
- Edited: [frontend/src/screens/ForgotPasswordScreen.tsx](frontend/src/screens/ForgotPasswordScreen.tsx) — updated copy for 6-digit reset code.
- Edited: [frontend/src/screens/ResetPasswordScreen.tsx](frontend/src/screens/ResetPasswordScreen.tsx) — updated input to 6-digit reset code.
- Edited: [frontend/src/types/navigation.ts](frontend/src/types/navigation.ts) — added OTP verification route type.
- Edited: [frontend/src/navigation/index.tsx](frontend/src/navigation/index.tsx) — registered OTP verification screen.

Notes: a legacy `backend/` folder also exists; it was not removed — consolidation is recommended to avoid divergence.
Note: legacy `backend/` has now been archived to `archive/backend-legacy/` to avoid accidental divergence while consolidation proceeds.

## Why these changes
- Ensure React Native compatibility by removing `localStorage` usage and providing `AsyncStorage`.
- Enable OTP email verification using `nodemailer` (requires SMTP credentials set in `.env`).
- Replace long reset token links with a 6-digit reset code to improve usability.
- Add real-email validation to block dummy domains (allowlist + MX check).

## Pending / Next Steps
- Verify SMTP credentials and confirm reset code delivery in production-like environment.
- Consolidate `backend/` and `forensic-backend/` into a single backend directory and reconcile routes/models.
	- Legacy `backend/` has been archived at `archive/backend-legacy/`. Next step: merge any missing, unique code from the archive into `forensic-backend/` and remove duplicates.
- Replace remaining web-only APIs (e.g., `window.confirm`) with RN equivalents like `Alert`.
- Verify Python engine spawn path (`PYTHON_PATH` and `PYTHON_ENGINE_PATH`) and run an end-to-end extraction test.
- Add automated tests (unit + integration) for auth and extraction flows.

### Recent verification status
- Added tests and CI files, but running `npm ci` and tests in this environment failed due to package resolution / registry errors (ETARGET for `supertest`) when installing dev dependencies. This is an environment issue — please run `npm ci` locally to complete test execution.
- Python engine invocation failed earlier because `python` was not available on PATH in this environment — install Python and run the extraction tests locally.
- SMTP verification failed earlier due to invalid credentials; current flow uses SMTP for OTP and reset-code delivery.

## Quick local run notes
1. Set environment in `forensic-backend/.env` with real values (do NOT commit secrets):

```bash
# example
PORT=5000
MONGODB_URI=mongodb://localhost:27017/forensic
JWT_SECRET=your_jwt_secret
EMAIL_USER=your.smtp.user@example.com
EMAIL_PASS=your_smtp_password
PYTHON_PATH=python3
PYTHON_ENGINE_PATH=./python-engine/main.py
```

2. Start backend (in `forensic-backend/`):

```bash
cd forensic-backend
npm install
npm run start
```

3. Start frontend (React Native / Expo):

```bash
cd frontend
npm install
expo start
```

## Changes log and references
- This summary was generated from the conversation and the edits performed in the workspace during the session. For a full transcript of the chat actions and tool outputs, see the local transcript file in VS Code workspace storage (not committed to repo).

## Contact / Handoff
- If you want, I can now implement the backend password-reset endpoints and run the extraction end-to-end. Which should I do next?

---
Generated by the assistant during an interactive workspace session.
