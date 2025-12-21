from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List
from uuid import UUID
from database import get_db
from models import Banner
from schemas import BannerCreate, BannerUpdate, BannerResponse
from services.permission_service import require_permission, Permission
from auth import get_current_user
from models import User

router = APIRouter(prefix="/api/admin/banners", tags=["admin"])


@router.get("", response_model=List[BannerResponse])
async def get_banners(
    db: AsyncSession = Depends(get_db),
    active_only: bool = False
):
    """Get all banners (public endpoint for homepage)"""
    query = select(Banner)
    if active_only:
        query = query.where(Banner.is_active == True)
    query = query.order_by(Banner.order, Banner.created_at)
    
    result = await db.execute(query)
    banners = result.scalars().all()
    return banners


@router.get("/public", response_model=List[BannerResponse])
async def get_public_banners(
    db: AsyncSession = Depends(get_db)
):
    """Get active banners for public homepage (no auth required)"""
    query = select(Banner).where(Banner.is_active == True).order_by(Banner.order, Banner.created_at)
    result = await db.execute(query)
    banners = result.scalars().all()
    return banners


@router.post("", response_model=BannerResponse, status_code=status.HTTP_201_CREATED)
async def create_banner(
    banner_data: BannerCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Create a new banner"""
    banner = Banner(**banner_data.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.get("/{banner_id}", response_model=BannerResponse)
async def get_banner(
    banner_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_READ))
):
    """Get a specific banner"""
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner


@router.patch("/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: UUID,
    banner_data: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Update a banner"""
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = banner_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(banner, field, value)
    
    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_permission(Permission.CONTENT_WRITE))
):
    """Delete a banner"""
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    await db.execute(delete(Banner).where(Banner.id == banner_id))
    await db.commit()
    return None
