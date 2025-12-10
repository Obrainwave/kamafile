from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from database import init_db, engine
from redis_client import check_redis_connection, close_redis
from sqlalchemy import text
from routers import auth
# Import models to ensure tables are created
from models import User  # noqa: F401
import traceback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    await init_db()
    yield
    # Shutdown: Close connections
    await engine.dispose()
    await close_redis()


app = FastAPI(
    title="Kamafile API",
    description="Backend API for Kamafile application",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - must be added before routes
# Temporarily allow all origins to debug CORS issue
# TODO: Restrict to specific origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add exception handler to ensure CORS headers are added even on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure CORS headers are always present"""
    import logging
    logging.error(f"Unhandled exception: {exc}")
    logging.error(traceback.format_exc())
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.get("/")
async def root():
    return JSONResponse({"message": "Welcome to Kamafile API", "status": "running"})


@app.get("/health")
async def health_check():
    """Health check endpoint that verifies database and Redis connections"""
    db_status = "unknown"
    redis_status = "unknown"
    
    # Check PostgreSQL connection
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Check Redis connection
    try:
        redis_connected = await check_redis_connection()
        redis_status = "connected" if redis_connected else "disconnected"
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    overall_status = "healthy" if db_status == "connected" and redis_status == "connected" else "unhealthy"
    
    return JSONResponse({
        "status": overall_status,
        "database": db_status,
        "redis": redis_status
    })


@app.get("/api/test")
async def test_endpoint():
    return JSONResponse({"message": "API is working correctly"})


# Include routers
app.include_router(auth.router)
