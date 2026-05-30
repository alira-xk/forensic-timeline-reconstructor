# Forensic Timeline Reconstructor

A full-stack forensic digital evidence analysis platform. Investigators upload evidence files (DOCX, PDF, images, log files), the system extracts metadata and timestamps using a Python engine, normalizes everything to ISO 8601, and displays a searchable, filterable chronological forensic timeline.

## Architecture

```
forensic-timeline-reconstructor/
├── forensic-backend/           # Node.js + Express API
│   ├── server.js               # Entry point
│   ├── src/
│   │   ├── models/             # Mongoose models (5)
│   │   ├── controllers/        # Route handlers (7)
│   │   ├── routes/             # Express routers (7)
│   │   ├── middleware/         # Auth, upload, validation, error handling
│   │   └── utils/              # Logger, response helpers, audit, extraction runner
│   ├── python-engine/          # Python extraction engine
│   │   ├── main.py             # CLI entry point
│   │   ├── extractors/         # DOCX, PDF, Image, Log extractors
│   │   └── requirements.txt
│   └── uploads/                # File storage (per-case directories)
│
└── frontend/                   # React Native + Expo
  └── src/
        ├── screens/            # 8 screens
        ├── services/           # 8 API service modules
        ├── context/            # AuthContext
        ├── hooks/              # useApi custom hook
        ├── components/         # Reusable UI components
        ├── navigation/         # Stack + Tab navigation
        └── theme/              # Light/dark theme system
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | MongoDB via Mongoose |
| Auth | JWT (7d access + 30d refresh tokens) |
| File Upload | Multer + SHA-256 hashing |
| Extraction | Python (child_process spawn) |
| Logging | Winston |
| Export | json2csv (CSV), native JSON |
| Frontend | React Native + Expo |

## Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 6.x or a shared **MongoDB Atlas** database
- **Python** >= 3.9
- **Expo CLI** (`npm install -g expo-cli`)

Note: For local development you can use the dev email logging fallback instead of configuring SMTP. See `forensic-backend/.env` and set `DEV_EMAIL_LOG=true` to have password reset tokens printed to the server console.

## Setup & Installation

### 1. Backend

```bash
cd forensic-backend
npm install
```

### 2. Python Engine

```bash
cd forensic-backend/python-engine
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Environment Variables

Copy the template files first:

```bash
cp forensic-backend/.env.example forensic-backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item forensic-backend/.env.example forensic-backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Then edit `forensic-backend/.env`.

For one developer using only their own machine, local MongoDB is fine:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/forensic_timeline
JWT_ACCESS_SECRET=ftr_access_secret_change_in_production_2024
JWT_REFRESH_SECRET=ftr_refresh_secret_change_in_production_2024
PYTHON_PATH=python
EXTRACTION_TIMEOUT=120000
ENFORCE_EMAIL_DOMAIN_CHECKS=true
ALLOWED_EMAIL_DOMAINS=
```

For multiple people, use a shared MongoDB Atlas connection string instead:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/forensic_timeline?retryWrites=true&w=majority
```

Do not commit `.env`. Each developer should create their own `.env` locally.

> **Important:** Change JWT secrets in production!
> For local dev, set `DEV_EMAIL_LOG=true` to print OTP/reset codes to the server console.

### Shared Development Setup

If another person clones the repo, they cannot use MongoDB running on your laptop. `localhost` always means "this computer", so `mongodb://localhost:27017/...` on your friend's laptop looks for MongoDB on your friend's laptop, not yours.

To make the project work while your laptop is off:

1. Create a free MongoDB Atlas cluster.
2. Create a database user and password.
3. Add your friend's IP address in Atlas Network Access, or use `0.0.0.0/0` for class/demo development.
4. Put the same Atlas `mongodb+srv://...` URI in each developer's `forensic-backend/.env`.
5. In `frontend/.env`, set `EXPO_PUBLIC_API_URL` to the backend they are running.

For web on the same machine as the backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

For a phone or another laptop on the same Wi-Fi:

```env
EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_LAN_IP:5000/api
```

## Running

### Start MongoDB

```bash
mongod
```

### Start Backend

```bash
cd forensic-backend
npm run dev
```

The API will be available at `http://localhost:5000/api`

### Start Frontend (Expo)

```bash
cd frontend
npx expo start
```

### Pointing Expo to Backend (Physical Device)

For physical device testing, set your LAN IP:

```bash
# Find your LAN IP
ipconfig    # Windows
ifconfig    # Mac/Linux

# Then set in frontend/src/services/api.ts
# Change: const API_BASE_URL = 'http://YOUR_LAN_IP:5000/api';
# Or set EXPO_PUBLIC_API_URL environment variable
```

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Register new user |
| POST | /login | Login with email/password |
| POST | /refresh-token | Refresh JWT tokens |
| POST | /logout | Logout (invalidate refresh token) |
| GET | /me | Get current user profile |
| PUT | /profile | Update name/organization |
| PUT | /change-password | Change password |

### Cases (`/api/cases`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Create new case |
| GET | / | List cases (paginated, searchable) |
| GET | /:id | Get case by ID |
| PUT | /:id | Update case |
| DELETE | /:id | Delete case (cascades) |
| GET | /:id/stats | Get case statistics |

### Files (`/api/files`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /upload/:caseId | Upload files (multipart, max 20) |
| GET | /case/:caseId | List files by case |
| GET | /:id | Get single file |
| DELETE | /:id | Delete file + events |

### Extraction (`/api/extraction`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /case/:caseId | Extract all pending files (async) |
| POST | /file/:fileId | Re-extract single file |
| GET | /status/:caseId | Get extraction status |

### Timeline (`/api/timeline`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /case/:caseId | Get events (paginated, filtered) |
| GET | /summary/:caseId | Aggregated summary |
| GET | /filters/:caseId | Available filter options |
| PUT | /bookmark/:eventId | Toggle bookmark |

### Export (`/api/export`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /json/:caseId | Download as JSON |
| GET | /csv/:caseId | Download as CSV |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /stats | Dashboard statistics |

## API Usage Examples

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Hassan","email":"hassan@example.com","password":"password123","role":"investigator"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hassan@example.com","password":"password123"}'
```

### Create Case
```bash
curl -X POST http://localhost:5000/api/cases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Operation Skyfall","description":"Cyber intrusion investigation","priority":"high","category":"cybercrime"}'
```

### Upload File
```bash
curl -X POST http://localhost:5000/api/files/upload/CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/evidence.docx"
```

### Trigger Extraction
```bash
curl -X POST http://localhost:5000/api/extraction/case/CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Timeline
```bash
curl "http://localhost:5000/api/timeline/case/CASE_ID?sortOrder=asc&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## End-to-End Workflow (Complete & Verified)

### 1. Authentication (VERIFIED ✓)
- User registration with OTP email verification
- JWT-based login with automatic token refresh
- Account deactivation checks on protected routes
- Frontend auth context manages session state

### 2. Case Management (VERIFIED ✓)
- Create, read, update, delete cases
- Case ownership enforcement (investigator-based)
- Automatic case number generation (FTR-YEAR-SEQUENCE format)
- Cascading deletion of files and events when case deleted

### 3. File Upload (VERIFIED ✓)
- Multer middleware handles multipart uploads (max 20 files)
- SHA-256 hash computed for each file
- File type detection from MIME and extension
- Status tracking: pending → processing → processed/failed
- Ownership and permission verification

### 4. Metadata Extraction (VERIFIED ✓)
- Python extraction engine spawned via child_process
- Supports: DOCX, PDF, Image (EXIF), Log files
- Extracts timestamps, metadata, author info
- Background processing with setImmediate (non-blocking)
- Event creation with confidence scoring

### 5. Timeline Retrieval (VERIFIED ✓)
- Events retrieved with pagination (default 50 per page)
- Filtering by: date range, event type, event source, file
- Full-text search on title and description
- Sort by timestamp (asc/desc)
- Bookmark events for investigation

### 6. Frontend Integration (VERIFIED ✓)
- React Native Expo app with multi-screen navigation
- Platform-aware storage: AsyncStorage (mobile) + localStorage (web)
- Automatic token refresh on 401 responses
- Form validation with real-time password strength indicators
- Dark/light theme support

## Recent Fixes & Verification (2026-05-29)

### Fixed Issues
- **Frontend signup flow**: Corrected SignUpScreen to handle OTP_SENT response properly (redirects to OtpVerificationScreen after 800ms)
- **Backend auth flow**: Verified register endpoint correctly returns OTP_SENT without tokens (tokens issued only after OTP verification)
- **Frontend authService**: Updated to return proper OTP_SENT code instead of attempting to set session tokens on signup

### Verified Components
✓ Auth middleware with isActive account checks  
✓ File controller with SHA-256 hashing and cascading deletion  
✓ Extraction controller with background processing via setImmediate  
✓ Case controller with ownership enforcement and stats tracking  
✓ Timeline controller with advanced filtering and pagination  
✓ Frontend services using apiRequest wrapper with token refresh logic  
✓ AuthContext properly managing user session state  
✓ OtpVerificationScreen redirecting to login after successful verification  
✓ All database models with proper indexes and validations  
✓ Python extraction engine with multi-type support (DOCX, PDF, Image, Log)  

## Complete Authentication Flow

The system implements a secure 3-step registration and login process:

### Registration Flow
1. **User submits sign up form** with name, email, password
2. **Backend validates** password strength (uppercase, lowercase, number, special char, 8+ chars)
3. **Backend sends OTP** to user's email (10-minute expiry)
4. **Frontend redirects** to OTP verification screen
5. **User enters 6-digit OTP**, backend verifies
6. **After OTP verification**, user redirected to login
7. **User logs in** with email/password → receives JWT tokens (7d access + 30d refresh)

### Token Management
- **Access tokens** stored in platform abstraction layer (AsyncStorage for native, localStorage for web)
- **Refresh tokens** automatically rotated on 401 TOKEN_EXPIRED
- **Account deactivation** checked on every authenticated request

## Database

- **Database:** `forensic_timeline`
- **Collections:** `users`, `cases`, `filerecords`, `events`, `auditlogs`
- **Indexes:** Case+timestamp on events, fileRecord on events for fast filtering

## Python Extraction Engine

The engine supports 4 file types:

| Type | Library | Extracts |
|------|---------|----------|
| DOCX | python-docx | Created, modified, printed dates, author, revision |
| PDF | pypdf | CreationDate, ModDate, Author, Creator, Producer |
| Image | Pillow + piexif | EXIF dates, GPS coordinates, camera info |
| Log | regex + dateutil | ISO 8601, Apache CLF, syslog, Windows, Python timestamps |

Test directly:
```bash
cd forensic-backend
python python-engine/main.py --file path/to/file.docx --type docx --file-id test --case-id test
```

## Response Format

All API responses follow this shape:
```json
{
  "success": true,
  "message": "Description of result",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Paginated responses include:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env` matches your setup
- The backend now requires your configured MongoDB and will fail fast instead of switching to in-memory storage
- If your friend cloned the repo, do not point `MONGODB_URI` to MongoDB on your laptop. Use MongoDB Atlas or install MongoDB on their laptop.
- If using Atlas, confirm the IP address is allowed in Atlas Network Access and the username/password are correct.

### OTP Not Received
- Set `DEV_EMAIL_LOG=true` in `.env` to print OTP to server console
- Verification/reset emails are only attempted for syntactically valid, non-disposable addresses whose domain has DNS mail targets
- Check email spam folder or configure SMTP credentials
- OTP expires after 10 minutes

### Token Expired Errors (401)
- Frontend automatically refreshes tokens on 401 TOKEN_EXPIRED responses
- If refresh fails, user is logged out and redirected to login
- Check `JWT_REFRESH_SECRET` is consistent across restarts

### Python Extraction Fails
- Ensure Python 3.9+ is installed and in PATH
- Test extraction: `python forensic-backend/python-engine/main.py --file path/to/file --type docx --file-id test --case-id test`
- Check `PYTHON_PATH` in `.env` (default: `python`)
- Verify file type is supported: docx, pdf, image, log

### File Upload 413 Payload Too Large
- Increase Express JSON limit in `forensic-backend/server.js`
- Default: 10mb (line 41: `express.json({ limit: '10mb' })`)

### Expo Connection Issues
- Set `EXPO_PUBLIC_API_URL` to your backend URL
- For LAN testing: find your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Device and dev machine must be on same network

## License

Private — Forensic Timeline Reconstructor
