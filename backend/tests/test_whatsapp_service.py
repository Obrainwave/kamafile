"""Tests for WhatsApp service"""
import pytest
from services.whatsapp_service import (
    format_phone_number,
    parse_phone_number,
    normalize_phone_number,
    send_whatsapp_message,
    is_twilio_configured
)


def test_format_phone_number():
    """Test phone number formatting"""
    # Test with whatsapp: prefix
    assert format_phone_number("whatsapp:+2341234567890") == "whatsapp:+2341234567890"
    
    # Test without prefix
    assert format_phone_number("+2341234567890") == "whatsapp:+2341234567890"
    
    # Test Nigerian number without country code
    assert format_phone_number("08123456789") == "whatsapp:+2348123456789"
    assert format_phone_number("8123456789") == "whatsapp:+2348123456789"
    
    # Test with spaces and dashes
    assert format_phone_number("+234 123 456 7890") == "whatsapp:+2341234567890"
    assert format_phone_number("+234-123-456-7890") == "whatsapp:+2341234567890"


def test_parse_phone_number():
    """Test parsing phone number from WhatsApp format"""
    assert parse_phone_number("whatsapp:+2341234567890") == "+2341234567890"
    assert parse_phone_number("+2341234567890") == "+2341234567890"


def test_normalize_phone_number():
    """Test phone number normalization"""
    assert normalize_phone_number("whatsapp:+2341234567890") == "+2341234567890"
    assert normalize_phone_number("+2341234567890") == "+2341234567890"


def test_send_whatsapp_message_mock():
    """Test sending WhatsApp message in mock mode"""
    # This will work even without Twilio credentials (mock mode)
    success, message_sid = send_whatsapp_message(
        "+2341234567890",
        "Test message"
    )
    assert success is True
    assert message_sid is not None


def test_send_whatsapp_message_with_quick_replies():
    """Test sending message with quick replies"""
    quick_replies = [
        {"title": "Option 1", "payload": "opt1"},
        {"title": "Option 2", "payload": "opt2"}
    ]
    success, message_sid = send_whatsapp_message(
        "+2341234567890",
        "Choose an option:",
        quick_replies
    )
    assert success is True
