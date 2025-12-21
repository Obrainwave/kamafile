"""Tests for OTP service"""
import pytest
from services.otp_service import generate_otp, verify_otp, get_otp_expiry


@pytest.mark.asyncio
async def test_generate_otp():
    """Test OTP generation"""
    phone = "+2341234567890"
    otp, success = await generate_otp(phone)
    
    assert success is True
    assert len(otp) == 6
    assert otp.isdigit()


@pytest.mark.asyncio
async def test_verify_otp_valid():
    """Test valid OTP verification"""
    phone = "+2341234567890"
    otp, _ = await generate_otp(phone)
    
    is_valid = await verify_otp(phone, otp)
    assert is_valid is True


@pytest.mark.asyncio
async def test_verify_otp_invalid():
    """Test invalid OTP verification"""
    phone = "+2341234567890"
    await generate_otp(phone)
    
    is_valid = await verify_otp(phone, "000000")
    assert is_valid is False


@pytest.mark.asyncio
async def test_verify_otp_expired():
    """Test that OTP is deleted after verification"""
    phone = "+2341234567890"
    otp, _ = await generate_otp(phone)
    
    # Verify once - should succeed
    is_valid = await verify_otp(phone, otp)
    assert is_valid is True
    
    # Verify again - should fail (OTP deleted)
    is_valid = await verify_otp(phone, otp)
    assert is_valid is False


@pytest.mark.asyncio
async def test_get_otp_expiry():
    """Test getting OTP expiry"""
    phone = "+2341234567890"
    await generate_otp(phone)
    
    expiry = await get_otp_expiry(phone)
    assert expiry is not None
    assert expiry > 0
    assert expiry <= 300  # Should be <= 5 minutes
