from enum import Enum
from typing import Set, Optional
from fastapi import Depends, HTTPException, status
from models import User
from auth import get_current_user


class Permission(str, Enum):
    """Permission constants for RBAC"""
    # User permissions
    USER_READ = "users:read"
    USER_WRITE = "users:write"
    USER_DELETE = "users:delete"
    
    # Content permissions
    CONTENT_READ = "content:read"
    CONTENT_WRITE = "content:write"
    CONTENT_DELETE = "content:delete"
    
    # Analytics permissions
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"
    
    # RAG permissions
    RAG_READ = "rag:read"
    RAG_WRITE = "rag:write"
    RAG_DELETE = "rag:delete"
    
    # System permissions
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_LOGS = "system:logs"


# Define role permissions
ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "super_admin": set(Permission),  # All permissions
    "admin": {
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_DELETE,
        Permission.CONTENT_READ,
        Permission.CONTENT_WRITE,
        Permission.CONTENT_DELETE,
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_EXPORT,
        Permission.RAG_READ,
        Permission.RAG_WRITE,
    },
    "moderator": {
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.CONTENT_READ,
        Permission.CONTENT_WRITE,
        Permission.ANALYTICS_READ,
    },
    "support": {
        Permission.USER_READ,
        Permission.ANALYTICS_READ,
    }
}


def check_permission(user: User, permission: Permission) -> bool:
    """Check if user has a specific permission"""
    if user.role == "super_admin":
        return True
    
    # Get base permissions for role
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    
    # Add custom permissions if any
    if user.permissions:
        custom_perms = {Permission(p) for p in user.permissions if p in [p.value for p in Permission]}
        user_permissions.update(custom_perms)
    
    return permission in user_permissions


def require_permission(permission: Permission):
    """FastAPI dependency to require a specific permission"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        if not check_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value}"
            )
        return current_user
    return permission_checker


def require_admin_role():
    """FastAPI dependency to require admin role"""
    async def admin_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in ["admin", "super_admin", "moderator", "support"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user
    return admin_checker


# Optional user function moved to auth.py for better implementation