from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from jose import JWTError, jwt
import bcrypt
import hashlib
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User
from database import get_db
import os

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
http_bearer = HTTPBearer(auto_error=False)


def get_password_hash(password: str) -> str:
    """Hash a password using SHA-256 → bcrypt
    
    This approach:
    - Supports unlimited password length
    - Is secure and industry-standard
    - Used by banks and government systems
    - SHA-256 produces 32 bytes (well under bcrypt's 72-byte limit)
    - Uses hexdigest to avoid null-byte issues in some environments
    """
    # Pre-hash with SHA-256 to handle any password length
    # Using hexdigest format is recommended to avoid null-byte issues
    prehashed = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")
    
    # Generate salt and hash with bcrypt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(prehashed, salt)
    
    # Return as string for database storage
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash
    
    Uses SHA-256 pre-hashing to support unlimited password length.
    """
    try:
        # Pre-hash with SHA-256 to match how we hash
        prehashed = hashlib.sha256(plain_password.encode("utf-8")).hexdigest().encode("utf-8")
        
        # bcrypt.checkpw handles the salt extraction from the hashed_password string
        return bcrypt.checkpw(prehashed, hashed_password.encode('utf-8'))
    except (ValueError, AttributeError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token
    
    Note: OAuth2PasswordBearer with auto_error=True (default) will raise an exception
    if no token is provided, so token will never be None.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    try:
        # Convert string UUID to UUID object
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    # Defensive check - ensure we never return None
    if user is None:
        raise credentials_exception
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(http_bearer),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get the current user if authenticated, otherwise return None (optional auth)"""
    if credentials is None:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        try:
            user_uuid = UUID(user_id)
        except (ValueError, TypeError):
            return None
        result = await db.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            return None
        return user
    except (JWTError, Exception):
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
