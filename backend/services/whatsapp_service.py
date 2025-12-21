"""WhatsApp service for sending messages via Twilio (sandbox and production)"""
import os
import logging
from typing import List, Dict, Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from dotenv import load_dotenv

# Load environment variables (in case this module is imported before main.py)
# Try multiple paths to handle both local and Docker environments
load_dotenv()  # Current directory
load_dotenv('.env')  # Explicit .env in current directory
load_dotenv('/app/.env')  # Docker container path

logger = logging.getLogger(__name__)

# Twilio configuration from environment variables
# Works with both sandbox and production - just change credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = os.getenv(
    "TWILIO_WHATSAPP_FROM", 
    "whatsapp:+14155238886"  # Default Twilio sandbox number
)

# Log Twilio configuration status (without exposing secrets)
logger.info("=" * 60)
logger.info("🔧 Twilio Configuration Check:")
logger.info(f"   TWILIO_ACCOUNT_SID: {'✅ Set' if TWILIO_ACCOUNT_SID else '❌ NOT SET'}")
logger.info(f"   TWILIO_AUTH_TOKEN: {'✅ Set' if TWILIO_AUTH_TOKEN else '❌ NOT SET'}")
logger.info(f"   TWILIO_WHATSAPP_FROM: {TWILIO_WHATSAPP_FROM}")
logger.info("=" * 60)

# Initialize Twilio client (None if credentials not set - will use mock mode)
_twilio_client: Optional[Client] = None

if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("✅ Twilio client initialized successfully")
        logger.info(f"   Account SID: {TWILIO_ACCOUNT_SID[:10]}...")
        logger.info(f"   From number: {TWILIO_WHATSAPP_FROM}")
    except Exception as e:
        logger.error(f"❌ Warning: Failed to initialize Twilio client: {e}")
else:
    logger.warning("⚠️  Twilio credentials not found - running in MOCK mode")
    logger.warning(f"   TWILIO_ACCOUNT_SID: {'Set' if TWILIO_ACCOUNT_SID else 'NOT SET'}")
    logger.warning(f"   TWILIO_AUTH_TOKEN: {'Set' if TWILIO_AUTH_TOKEN else 'NOT SET'}")


def is_twilio_configured() -> bool:
    """Check if Twilio is properly configured"""
    return _twilio_client is not None


def send_whatsapp_message(
    to: str,
    message: str,
    quick_replies: Optional[List[Dict[str, str]]] = None
) -> tuple[bool, Optional[str]]:
    """
    Send WhatsApp message via Twilio
    
    Args:
        to: Phone number in format 'whatsapp:+234...' or '+234...'
        message: Message text
        quick_replies: Optional list of quick reply buttons (for future use)
        
    Returns:
        tuple: (success: bool, message_sid: Optional[str])
    """
    logger.info(f"📨 send_whatsapp_message called")
    logger.info(f"   To: {to}")
    logger.info(f"   Message length: {len(message)}")
    logger.info(f"   Twilio configured: {is_twilio_configured()}")
    
    if not _twilio_client:
        # Mock mode - log instead of sending
        logger.warning("⚠️  Twilio not configured - running in MOCK mode")
        logger.info(f"[WhatsApp Mock] To: {to}")
        logger.info(f"[WhatsApp Mock] Message: {message[:100]}...")
        if quick_replies:
            logger.info(f"[WhatsApp Mock] Quick Replies: {quick_replies}")
        return True, "mock_message_sid"
    
    try:
        # Ensure phone number has whatsapp: prefix
        formatted_to = format_phone_number(to)
        logger.info(f"   Formatted To: {formatted_to}")
        logger.info(f"   From: {TWILIO_WHATSAPP_FROM}")
        
        # Format message with quick replies if provided
        formatted_message = message
        if quick_replies:
            # Append quick reply options to message
            # Note: Twilio WhatsApp Business API supports interactive messages
            # For now, we'll append as text. Can be enhanced later with TwiML
            reply_text = "\n\n"
            for i, reply in enumerate(quick_replies, 1):
                title = reply.get("title", reply.get("payload", ""))
                reply_text += f"{i}. {title}\n"
            formatted_message += reply_text
            logger.info(f"   Added quick replies to message")
        
        logger.info(f"   Sending via Twilio API...")
        message_obj = _twilio_client.messages.create(
            body=formatted_message,
            from_=TWILIO_WHATSAPP_FROM,
            to=formatted_to
        )
        
        logger.info(f"✅ Twilio API call successful!")
        logger.info(f"   Message SID: {message_obj.sid}")
        logger.info(f"   Status: {message_obj.status}")
        
        return True, message_obj.sid
    except TwilioException as e:
        logger.error(f"❌ Twilio error sending WhatsApp message: {e}")
        logger.error(f"   Error code: {getattr(e, 'code', 'N/A')}")
        logger.error(f"   Error message: {getattr(e, 'msg', str(e))}")
        return False, None
    except Exception as e:
        logger.error(f"❌ Unexpected error sending WhatsApp message: {e}", exc_info=True)
        return False, None


def format_phone_number(phone: str) -> str:
    """
    Format phone number for WhatsApp (whatsapp:+234...)
    Works with or without whatsapp: prefix
    """
    # Remove any existing whatsapp: prefix
    phone = phone.replace("whatsapp:", "").strip()
    
    # Remove spaces, dashes, parentheses
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Ensure it starts with +
    if not phone.startswith("+"):
        # Assume Nigerian number if no country code
        if phone.startswith("0"):
            phone = "+234" + phone[1:]
        elif len(phone) == 10:
            phone = "+234" + phone
        else:
            phone = "+" + phone
    
    # Add whatsapp: prefix
    return f"whatsapp:{phone}"


def parse_phone_number(whatsapp_phone: str) -> str:
    """
    Extract clean phone number from WhatsApp format
    Returns: +234... format
    """
    return whatsapp_phone.replace("whatsapp:", "").strip()


def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number for storage (removes whatsapp: prefix)
    Returns: +234... format
    """
    return parse_phone_number(phone)
