from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
from models import User
from schemas import DashboardStatsResponse
from services.permission_service import require_permission, Permission
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin/dashboard", tags=["admin"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.ANALYTICS_READ))
):
    """Get dashboard statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Total users
    total_users = await db.scalar(select(func.count(User.id)))
    
    # Active users
    active_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active == True)
    )
    
    # New users today
    new_users_today = await db.scalar(
        select(func.count(User.id)).where(
            and_(
                User.created_at >= today_start,
                User.created_at <= now
            )
        )
    )
    
    # New users this week
    new_users_this_week = await db.scalar(
        select(func.count(User.id)).where(
            and_(
                User.created_at >= week_start,
                User.created_at <= now
            )
        )
    )
    
    # Users by type
    user_type_result = await db.execute(
        select(User.user_type, func.count(User.id))
        .group_by(User.user_type)
    )
    users_by_type = {row[0] or "unknown": row[1] for row in user_type_result}
    
    # Users by role
    role_result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    users_by_role = {row[0] or "user": row[1] for row in role_result}
    
    return DashboardStatsResponse(
        total_users=total_users or 0,
        active_users=active_users or 0,
        new_users_today=new_users_today or 0,
        new_users_this_week=new_users_this_week or 0,
        users_by_type=users_by_type,
        users_by_role=users_by_role
    )
