"""Tests for onboarding router"""
import pytest
from fastapi.testclient import TestClient
from uuid import uuid4


def test_start_onboarding_new_session(client):
    """Test starting a new onboarding session"""
    response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "web",
            "user_identifier": "test@example.com"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data.get("step") == "welcome" or data.get("next_step") == "welcome"
    assert data["status"] == "onboarding"
    assert "message" in data
    assert "quick_replies" in data


def test_start_onboarding_whatsapp(client):
    """Test starting onboarding from WhatsApp"""
    response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "whatsapp",
            "user_identifier": "+2341234567890"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["channel"] == "whatsapp" or "session_id" in data


def test_process_onboarding_step(client):
    """Test processing an onboarding step"""
    # First start a session
    start_response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "web",
            "user_identifier": "test@example.com"
        }
    )
    session_id = start_response.json()["session_id"]
    
    # Process welcome step
    step_response = client.post(
        "/api/onboarding/step",
        json={
            "session_id": session_id,
            "step": "welcome",
            "response": "personalised_help"
        }
    )
    
    assert step_response.status_code == 200
    data = step_response.json()
    assert data.get("next_step") == "consent" or data.get("step") == "consent"
    assert data["status"] == "onboarding"


def test_get_onboarding_status(client):
    """Test getting onboarding status"""
    # Start a session
    start_response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "web",
            "user_identifier": "test@example.com"
        }
    )
    session_id = start_response.json()["session_id"]
    
    # Get status
    status_response = client.get(f"/api/onboarding/status/{session_id}")
    
    assert status_response.status_code == 200
    data = status_response.json()
    assert data["session_id"] == session_id
    assert data["status"] == "onboarding"
    assert data["channel"] == "web"


def test_find_session_by_identifier(client):
    """Test finding session by identifier"""
    # Start a session
    start_response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "whatsapp",
            "user_identifier": "+2341234567890"
        }
    )
    session_id = start_response.json()["session_id"]
    
    # Find session
    find_response = client.get("/api/onboarding/find/+2341234567890")
    
    assert find_response.status_code == 200
    data = find_response.json()
    assert data["found"] is True
    assert data["session_id"] == session_id


def test_link_session_request_otp(client):
    """Test requesting OTP for cross-channel linking"""
    # Start a WhatsApp session first
    start_response = client.post(
        "/api/onboarding/start",
        json={
            "channel": "whatsapp",
            "user_identifier": "+2341234567890"
        }
    )
    
    # Request OTP
    otp_response = client.post(
        "/api/onboarding/link/request-otp?phone_number=%2B2341234567890"
    )
    
    assert otp_response.status_code == 200
    data = otp_response.json()
    assert data["otp_sent"] is True
    assert data["expires_in"] == 300
