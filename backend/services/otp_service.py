"""OTP service for cross-channel session linking"""
import random
import os
from typing import Optional, Tuple
from redis_client import get_redis

# OTP configuration
OTP_LENGTH = 6
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))  # 5 minutes default


async def generate_otp(phone_number: str) -> Tuple[str, bool]:
    """
    Generate and store OTP for phone number
    
    Args:
        phone_number: Phone number to generate OTP for
        
    Returns:
        tuple: (otp_code, success)
    """
    try:
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store in Redis with expiry
        redis = await get_redis()
        key = f"otp:{phone_number}"
        await redis.setex(key, OTP_EXPIRY_SECONDS, otp)
        
        return otp, True
    except Exception as e:
        print(f"Error generating OTP: {e}")
        return "", False


async def verify_otp(phone_number: str, otp: str) -> bool:
    """
    Verify OTP for phone number
    
    Args:
        phone_number: Phone number
        otp: OTP code to verify
        
    Returns:
        bool: True if OTP is valid
    """
    try:
        redis = await get_redis()
        key = f"otp:{phone_number}"
        stored_otp = await redis.get(key)
        
        if stored_otp:
            # Redis returns bytes, decode if needed
            stored_otp_str = stored_otp.decode() if isinstance(stored_otp, bytes) else stored_otp
            if stored_otp_str == otp:
                # Delete OTP after successful verification
                await redis.delete(key)
                return True
        return False
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return False


async def get_otp_expiry(phone_number: str) -> Optional[int]:
    """
    Get remaining TTL for OTP
    
    Args:
        phone_number: Phone number
        
    Returns:
        Optional[int]: Remaining seconds, or None if OTP doesn't exist
    """
    try:
        redis = await get_redis()
        key = f"otp:{phone_number}"
        ttl = await redis.ttl(key)
        return ttl if ttl > 0 else None
    except Exception as e:
        print(f"Error getting OTP expiry: {e}")
        return None
