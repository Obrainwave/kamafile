"""Tests for onboarding service"""
import pytest
from uuid import uuid4
from services.onboarding_service import (
    get_or_create_session,
    handle_onboarding_step,
    assign_capability_level,
    get_welcome_message
)
from models import ConversationSession


@pytest.mark.asyncio
async def test_get_or_create_session_new(db_session):
    """Test creating a new session"""
    session = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="whatsapp"
    )
    
    assert session is not None
    assert session.user_identifier == "2341234567890"  # Normalized
    assert session.channel == "whatsapp"
    assert session.status == "enquiry"
    assert session.current_step is None


@pytest.mark.asyncio
async def test_get_or_create_session_existing(db_session):
    """Test retrieving existing session"""
    # Create first session
    session1 = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="whatsapp"
    )
    session_id = session1.id
    
    # Get same session again
    session2 = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="web"
    )
    
    assert session2.id == session_id
    assert session2.channel == "web"  # Updated to current channel


@pytest.mark.asyncio
async def test_handle_onboarding_step_welcome(db_session):
    """Test handling welcome step"""
    session = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="whatsapp"
    )
    session.status = "onboarding"
    session.current_step = "welcome"
    await db_session.commit()
    
    # Test general info response
    result = await handle_onboarding_step(
        db_session, session, "welcome", "general_info"
    )
    
    assert result["status"] == "enquiry"
    assert result["next_step"] is None
    assert "Great! I can answer" in result["message"]
    
    # Test personalised help response
    session.status = "onboarding"
    session.current_step = "welcome"
    result = await handle_onboarding_step(
        db_session, session, "welcome", "personalised_help"
    )
    
    assert result["status"] == "onboarding"
    assert result["next_step"] == "consent"


@pytest.mark.asyncio
async def test_handle_onboarding_step_consent(db_session):
    """Test handling consent step"""
    session = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="whatsapp"
    )
    session.status = "onboarding"
    session.current_step = "consent"
    session.step_data = {"welcome": {"response": "personalised_help"}}
    await db_session.commit()
    
    # Test consent yes
    result = await handle_onboarding_step(
        db_session, session, "consent", "consent_yes"
    )
    
    assert result["next_step"] == "goal"
    assert session.step_data["consent"]["given"] is True
    
    # Test consent no
    session.current_step = "consent"
    result = await handle_onboarding_step(
        db_session, session, "consent", "consent_no"
    )
    
    assert result["status"] == "enquiry"
    assert result["next_step"] is None


@pytest.mark.asyncio
async def test_handle_onboarding_step_complete(db_session):
    """Test completing onboarding flow"""
    session = await get_or_create_session(
        db_session,
        user_identifier="+2341234567890",
        channel="whatsapp"
    )
    session.status = "onboarding"
    session.current_step = "confidence"
    session.step_data = {
        "welcome": {"response": "personalised_help"},
        "consent": {"given": True},
        "goal": {"intent_primary": "check_applies"},
        "income_type": {"user_type": "salaried_only"}
    }
    await db_session.commit()
    
    result = await handle_onboarding_step(
        db_session, session, "confidence", "info_only"
    )
    
    assert result["completed"] is True
    assert result["status"] == "active"
    assert session.status == "active"
    
    # Check profile was created
    from sqlalchemy import select
    from models import UserProfile
    profile_result = await db_session.execute(
        select(UserProfile).where(UserProfile.session_id == session.id)
    )
    profile = profile_result.scalar_one_or_none()
    assert profile is not None
    assert profile.confidence_level == "info_only"


def test_assign_capability_level():
    """Test capability level assignment"""
    assert assign_capability_level("salaried_only", "low") == 1
    assert assign_capability_level("freelancer", "medium") == 2
    assert assign_capability_level("freelancer", "low") == 1
    assert assign_capability_level("business_staff", None) == 3
    assert assign_capability_level("unemployed", None) == 1


def test_get_welcome_message():
    """Test welcome message generation"""
    welcome = get_welcome_message()
    assert "message" in welcome
    assert "quick_replies" in welcome
    assert "next_step" in welcome
    assert len(welcome["quick_replies"]) == 2
