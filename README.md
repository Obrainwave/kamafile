# Kamafile

Full-stack application with FastAPI backend and React + TypeScript frontend.

## Project Structure

```
kamafile/
├── backend/              # FastAPI backend
│   ├── main.py          # Main application file
│   ├── database.py      # Database configuration
│   ├── redis_client.py  # Redis client
│   ├── Dockerfile       # Docker image definition
│   ├── docker-compose.yml # Docker Compose config
│   └── requirements.txt
└── frontend/            # React + TypeScript frontend
    ├── src/
    └── package.json
```

## Tech Stack

### Backend
- **FastAPI 0.123.4** - Modern, fast Python web framework
- **PostgreSQL 16** - Relational database
- **Redis 7** - In-memory data store
- **SQLAlchemy 2.0** - Async ORM
- **Uvicorn** - ASGI server
- **Docker** - Containerization
- **Python 3.12+**

### Frontend
- **React 19** - Latest React version
- **TypeScript 5.7** - Type safety
- **Material UI v7.3.6** - Latest Material UI components
- **Vite 6** - Fast build tool
- **Axios** - HTTP client

## Quick Start

### Backend Setup (Docker - Recommended)

1. Navigate to backend directory:
```bash
cd backend
```

2. (Optional) Create a `.env` file with your configuration:
```bash
cp .env.example .env
```

3. Start all services with Docker Compose:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on port `5432`
- Redis on port `6379`
- FastAPI backend on port `8000`

Backend API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`
Health check at `http://localhost:8000/health`

**Docker Commands:**
```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build
```

### Backend Setup (Local Development)

If you prefer to run without Docker:

1. Make sure PostgreSQL and Redis are running locally

2. Navigate to backend directory:
```bash
cd backend
```

3. Create virtual environment:
```bash
python -m venv venv
```

4. Activate virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

5. Install dependencies:
```bash
pip install -r requirements.txt
```

6. Set environment variables:
```bash
export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/kamafile"
export REDIS_URL="redis://localhost:6379/0"
```

7. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Development

- Backend runs on port **8000**
- Frontend runs on port **3000**
- Frontend is configured to proxy API requests to the backend

## License

MIT
