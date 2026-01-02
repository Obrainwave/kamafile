from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from database import init_db, engine
from redis_client import check_redis_connection, close_redis
from sqlalchemy import text
from routers import auth
from routers.admin import users, dashboard, banners
from routers import onboarding, whatsapp
# Import models to ensure tables are created
from models import User, AdminLog, Banner, ConversationSession, UserProfile, ConversationMessage  # noqa: F401
import traceback
import logging
from dotenv import load_dotenv
import os

# Load environment variables from .env file
# Try multiple paths to handle both local and Docker environments
load_dotenv()  # Current directory
load_dotenv('.env')  # Explicit .env in current directory
load_dotenv('/app/.env')  # Docker container path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Suppress Uvicorn warnings for invalid HTTP requests (common with Twilio)
# But keep INFO level for our application logs
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("h11").setLevel(logging.ERROR)


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

# Add request logging middleware to debug webhook issues
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Log incoming request (don't access headers/body in a way that breaks parsing)
    try:
        path = str(request.url.path)
        method = request.method
        client = request.client.host if request.client else 'unknown'
        logger.info(f"📥 INCOMING REQUEST: {method} {path} from {client}")
    except Exception:
        pass  # Don't fail on logging
    
    # Process request
    try:
        response = await call_next(request)
        # Log response
        try:
            status = response.status_code
            logger.info(f"📤 RESPONSE: {status} for {method} {path}")
        except Exception:
            pass
        return response
    except Exception as e:
        logger.error(f"❌ ERROR in request handler: {e}", exc_info=True)
        # Return a valid HTTP response even on error
        try:
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
        except Exception:
            # Last resort - return minimal valid response
            from fastapi.responses import Response
            return Response(
                content='{"error": "Internal server error"}',
                status_code=500,
                media_type="application/json"
            )

# Configure CORS - must be added before routes
# Allow origins from environment variable or default to localhost for development
allowed_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
# Also allow production domain
if "https://dev.kamafile.com" not in allowed_origins:
    allowed_origins.append("https://dev.kamafile.com")

# Add explicit OPTIONS handler for preflight requests
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    """Handle OPTIONS preflight requests explicitly"""
    origin = request.headers.get("origin")
    if origin in allowed_origins or "*" in allowed_origins:
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": origin or "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        )
    return JSONResponse(content={}, status_code=403)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "*"],
    expose_headers=["*"],
    max_age=3600,
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


@app.get("/api")
@app.get("/api/")
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


# Include routers - they already have /api prefix in their router definitions
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(banners.router)
app.include_router(onboarding.router)
app.include_router(whatsapp.router)
