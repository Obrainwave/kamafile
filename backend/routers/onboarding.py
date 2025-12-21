"""Unified onboarding router for WhatsApp and Web"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from database import get_db
from models import ConversationSession, ConversationMessage, UserProfile
from schemas import (
    OnboardingStartRequest,
    OnboardingStepRequest,
    OnboardingStepResponse,
    OnboardingStatusResponse,
    LinkSessionRequest,
    LinkSessionResponse,
    OTPRequestResponse
)
from services.onboarding_service import (
    get_or_create_session,
    find_session_by_identifier,
    handle_onboarding_step,
    get_welcome_message
)
from services.whatsapp_service import send_whatsapp_message, format_phone_number, normalize_phone_number
from services.otp_service import generate_otp, verify_otp, get_otp_expiry
from datetime import datetime

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/start", response_model=OnboardingStepResponse)
async def start_onboarding(
    request: OnboardingStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a new onboarding session or resume existing one"""
    # Normalize user identifier
    clean_identifier = normalize_phone_number(request.user_identifier) if request.channel == "whatsapp" else request.user_identifier
    
    # Get or create session
    session = await get_or_create_session(
        db, 
        clean_identifier, 
        channel=request.channel,
        user_id=request.user_id
    )
    
    # Check if there's an existing active onboarding session
    if session.status == "onboarding" and session.current_step:
        # Resume existing onboarding
        step_def = get_welcome_message() if session.current_step == "consent" else None
        if not step_def and session.current_step in ["consent", "goal", "income_type", "income_complexity", "confidence"]:
            from services.onboarding_service import ONBOARDING_STEPS
            step_def = ONBOARDING_STEPS.get(session.current_step, {})
        
        return OnboardingStepResponse(
            session_id=session.id,
            step=session.current_step,
            message=step_def.get("message", "Let's continue where we left off.") if step_def else "Let's continue.",
            quick_replies=step_def.get("quick_replies") if step_def else None,
            completed=False,
            status=session.status
        )
    
    # Start new onboarding with consent step (per guidelines)
    welcome = get_welcome_message()
    session.status = "onboarding"
    session.current_step = "consent"
    session.last_activity = datetime.utcnow()
    await db.commit()
    
    # Store consent message
    bot_message = ConversationMessage(
        session_id=session.id,
        message_type="bot",
        content=welcome["message"],
        message_metadata={"quick_replies": welcome["quick_replies"]}
    )
    db.add(bot_message)
    await db.commit()
    
    return OnboardingStepResponse(
        session_id=session.id,
        step="consent",
        message=welcome["message"],
        quick_replies=welcome["quick_replies"],
        completed=False,
        status="onboarding"
    )


@router.post("/step", response_model=OnboardingStepResponse)
async def process_onboarding_step(
    request: OnboardingStepRequest,
    db: AsyncSession = Depends(get_db)
):
    """Process an onboarding step response"""
    # Get session
    result = await db.execute(
        select(ConversationSession).where(ConversationSession.id == request.session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store user message
    user_message = ConversationMessage(
        session_id=session.id,
        message_type="user",
        content=request.response,
        message_metadata=request.data
    )
    db.add(user_message)
    
    # Process step or active question
    if session.status == "active":
        # Handle active questions (Step 3: Personalised guidance)
        from services.onboarding_service import handle_active_question
        result = await handle_active_question(db, session, request.response)
    else:
        # Process onboarding step
        if not request.step:
            raise HTTPException(status_code=400, detail="Step is required for onboarding status")
        result = await handle_onboarding_step(
            db, session, request.step, request.response, request.data
        )
    
    # Store bot response
    bot_message = ConversationMessage(
        session_id=session.id,
        message_type="bot",
        content=result["message"],
        message_metadata={"quick_replies": result.get("quick_replies")}
    )
    db.add(bot_message)
    await db.commit()
    
    return OnboardingStepResponse(
        session_id=session.id,
        step=result.get("next_step") if session.status != "active" else None,
        message=result["message"],
        quick_replies=result.get("quick_replies"),
        completed=result.get("completed", False),
        status=session.status
    )


@router.get("/status/{session_id}", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    session_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get current onboarding status"""
    result = await db.execute(
        select(ConversationSession).where(ConversationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return OnboardingStatusResponse(
        session_id=session.id,
        status=session.status,
        current_step=session.current_step,
        channel=session.channel,
        user_identifier=session.user_identifier,
        step_data=session.step_data
    )


@router.post("/link/request-otp", response_model=OTPRequestResponse)
async def request_link_otp(
    phone_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Request OTP to link session across channels"""
    # Normalize phone number
    clean_phone = normalize_phone_number(phone_number)
    
    # Check if session exists
    session = await find_session_by_identifier(db, clean_phone)
    
    if not session:
        raise HTTPException(
            status_code=404, 
            detail="No active session found for this phone number"
        )
    
    # Generate OTP
    otp, success = await generate_otp(clean_phone)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate OTP"
        )
    
    # Send OTP via WhatsApp if session was from WhatsApp
    if session.channel == "whatsapp":
        formatted_phone = format_phone_number(clean_phone)
        message = f"Your verification code is: {otp}\n\nUse this code to continue on the web."
        send_whatsapp_message(formatted_phone, message)
    
    return OTPRequestResponse(
        otp_sent=True,
        expires_in=300,  # 5 minutes
        message="OTP sent successfully" if session.channel == "whatsapp" else f"Your OTP is: {otp}"
    )


@router.post("/link/verify", response_model=LinkSessionResponse)
async def verify_link_otp(
    request: LinkSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP and link session to new channel"""
    # Normalize phone number
    clean_phone = normalize_phone_number(request.phone_number)
    
    # Verify OTP
    is_valid = await verify_otp(clean_phone, request.otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP"
        )
    
    # Find existing session
    session = await find_session_by_identifier(db, clean_phone)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No session found for this phone number"
        )
    
    # Update session to new channel
    session.channel = request.target_channel
    session.last_activity = datetime.utcnow()
    await db.commit()
    
    return LinkSessionResponse(
        session_id=session.id,
        linked=True,
        message=f"Session linked successfully. You can now continue on {request.target_channel}."
    )


@router.get("/find/{user_identifier}")
async def find_session(
    user_identifier: str,
    db: AsyncSession = Depends(get_db)
):
    """Find existing session by user identifier (for cross-channel lookup)"""
    session = await find_session_by_identifier(db, user_identifier)
    
    if not session:
        return {"found": False, "session_id": None}
    
    return {
        "found": True,
        "session_id": str(session.id),
        "status": session.status,
        "current_step": session.current_step,
        "channel": session.channel
    }
