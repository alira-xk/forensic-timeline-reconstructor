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
└── Frontend/ForensicTimeline/  # React Native + Expo
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
- **MongoDB** >= 6.x (running on localhost:27017)
- **Python** >= 3.9
- **Expo CLI** (`npm install -g expo-cli`)

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
cd Frontend/ForensicTimeline
npm install
```

### 4. Environment Variables

The `.env` file in `forensic-backend/` is pre-configured with defaults:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/forensic_timeline
JWT_ACCESS_SECRET=ftr_access_secret_change_in_production_2024
JWT_REFRESH_SECRET=ftr_refresh_secret_change_in_production_2024
PYTHON_PATH=python
EXTRACTION_TIMEOUT=120000
```

> **Important:** Change JWT secrets in production!

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
cd Frontend/ForensicTimeline
npx expo start
```

### Pointing Expo to Backend (Physical Device)

For physical device testing, set your LAN IP:

```bash
# Find your LAN IP
ipconfig    # Windows
ifconfig    # Mac/Linux

# Then set in Frontend/ForensicTimeline/src/services/api.js
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

## Database

- **Database:** `forensic_timeline`
- **Collections:** `users`, `cases`, `filerecords`, `events`, `auditlogs`

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

## License

Private — Forensic Timeline Reconstructor
