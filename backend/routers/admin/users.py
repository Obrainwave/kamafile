from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import List, Optional
from uuid import UUID
from models import User, AdminLog
from schemas import UserResponse, UserUpdate
from schemas import UserStatsResponse
from services.permission_service import require_permission, Permission, require_admin_role
from auth import get_current_user
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/api/admin/users", tags=["admin"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    user_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.USER_READ))
):
    """List users with filtering and pagination"""
    query = select(User)
    
    # Apply filters
    conditions = []
    if search:
        conditions.append(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.phone_number.ilike(f"%{search}%")
            )
        )
    if role:
        conditions.append(User.role == role)
    if user_type:
        conditions.append(User.user_type == user_type)
    if is_active is not None:
        conditions.append(User.is_active == is_active)
    if is_verified is not None:
        conditions.append(User.is_verified == is_verified)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Pagination
    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.get("/stats", response_model=UserStatsResponse)
async def user_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.ANALYTICS_READ))
):
    """Get user statistics"""
    # Total counts
    total_users = await db.scalar(select(func.count(User.id)))
    active_users = await db.scalar(select(func.count(User.id)).where(User.is_active == True))
    verified_users = await db.scalar(select(func.count(User.id)).where(User.is_verified == True))
    
    # Group by user_type
    user_type_result = await db.execute(
        select(User.user_type, func.count(User.id))
        .group_by(User.user_type)
    )
    by_type = {row[0] or "unknown": row[1] for row in user_type_result}
    
    # Group by role
    role_result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    by_role = {row[0] or "user": row[1] for row in role_result}
    
    return UserStatsResponse(
        total=total_users or 0,
        active=active_users or 0,
        verified=verified_users or 0,
        by_type=by_type,
        by_role=by_role
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.USER_READ))
):
    """Get a specific user by ID"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.USER_WRITE))
):
    """Update a user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-demotion from super_admin
    if user_id == admin_user.id and user_data.role and user_data.role != "super_admin" and admin_user.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role from super_admin"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    # Log admin action
    admin_log = AdminLog(
        admin_id=admin_user.id,
        action="user:update",
        resource_type="user",
        resource_id=str(user_id),
        details={"updated_fields": list(update_data.keys())},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(admin_log)
    await db.commit()
    
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.USER_DELETE))
):
    """Delete a user (soft delete by deactivating)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Soft delete by deactivating
    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()
    
    # Log admin action
    admin_log = AdminLog(
        admin_id=admin_user.id,
        action="user:delete",
        resource_type="user",
        resource_id=str(user_id),
        details={"deleted_user_email": user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(admin_log)
    await db.commit()
    
    return None
