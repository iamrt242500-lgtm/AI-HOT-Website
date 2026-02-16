# Pulse Backend (FastAPI)

Revenue Dashboard API for Ad-driven Sites

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Development Server

```bash
# From backend/ directory
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or using the main.py directly:

```bash
python app/main.py
```

### 4. Access API Documentation

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── routers/             # API route handlers
│   │   ├── __init__.py
│   │   └── health.py        # Health check endpoints
│   ├── models/              # SQLAlchemy models
│   │   └── __init__.py
│   └── schemas/             # Pydantic schemas
│       └── __init__.py
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md
```

## 🔌 API Endpoints

### Health Check
- `GET /api/v1/health` - System health status
- `GET /api/v1/health/db` - Database health status

### Auth (Dev)
- `POST /api/v1/auth/login` - Dev login (auto-create user)
- `GET /api/v1/auth/me` - Current user

### Sites
- `POST /api/v1/sites` - Create site
- `GET /api/v1/sites` - List sites
- `GET /api/v1/sites/{site_id}` - Get site

### Connections
- `GET /api/v1/connections/ga4/properties` - Mock GA4 properties
- `GET /api/v1/connections/adsense/accounts` - Mock AdSense accounts
- `POST /api/v1/connections` - Create/Upsert connection
- `GET /api/v1/connections?site_id={id}` - List site connections
- `DELETE /api/v1/connections/{connection_id}` - Delete connection

## 🛠️ Development

### Running Tests

```bash
pytest
```

### Code Style

Follow PEP 8 guidelines. Use type hints where possible.

## 📝 Current Scope (Task 1-7)

- [x] Authentication (dev JWT)
- [x] Site onboarding APIs
- [x] GA4/AdSense mock connection APIs
- [x] SQLAlchemy models + Alembic initial migration
- [ ] Automated test suite expansion
