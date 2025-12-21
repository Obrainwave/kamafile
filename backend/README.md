# Kamafile Backend

FastAPI backend for the Kamafile application with PostgreSQL and Redis.

## Tech Stack

- **FastAPI 0.123.4** - Modern, fast Python web framework
- **PostgreSQL 16** - Relational database
- **Redis 7** - In-memory data store
- **SQLAlchemy 2.0** - Async ORM
- **Docker** - Containerization

## Prerequisites

- Docker and Docker Compose installed
- Python 3.12+ (for local development)

## Quick Start with Docker (Recommended)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file (optional, defaults are set in docker-compose.yml):
```bash
# Copy the example file
cp .env.example .env
# Edit .env with your preferred settings
```

3. Build and start all services:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on port `5432`
- Redis on port `6379`
- FastAPI backend on port `8000`

4. Access the API:
- API: `http://localhost:8000`
- API Documentation (Swagger): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## Docker Commands

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild containers
docker-compose up --build

# Restart a specific service
docker-compose restart backend
```

## Local Development (Without Docker)

1. Make sure PostgreSQL and Redis are running locally

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Set environment variables (or create `.env` file):
```bash
export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/kamafile"
export REDIS_URL="redis://localhost:6379/0"
```

6. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Database Configuration

The application uses async SQLAlchemy with PostgreSQL. Database models should be defined in separate files and imported in `main.py`.

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - Database name
- `DATABASE_URL` - Full database connection URL
- `REDIS_URL` - Redis connection URL

## Creating an Admin User

After deployment, you need to create an admin user to access the admin dashboard.

**Quick Start:**
```bash
# For Docker
docker exec -it kamafile_backend python scripts/create_admin.py

# For Local
cd backend && python scripts/create_admin.py
```

**Default Admin Credentials:**
- Email: `super@kamafile.com`
- Password: `123456`
- ⚠️ **Change this password immediately after first login!**

For detailed instructions, custom credentials, and troubleshooting, see **[CREATE_ADMIN.md](./CREATE_ADMIN.md)**

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── database.py          # Database configuration and session
├── redis_client.py      # Redis client configuration
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker Compose configuration
├── requirements.txt     # Python dependencies
├── scripts/             # Utility scripts
│   └── create_admin.py  # Admin user creation script
├── CREATE_ADMIN.md      # Admin creation guide
└── .env.example         # Environment variables template
```
