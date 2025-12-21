"""WhatsApp webhook handler for Twilio"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import ConversationMessage
from services.whatsapp_service import parse_phone_number, format_phone_number, send_whatsapp_message
from services.onboarding_service import get_or_create_session, handle_onboarding_step, get_welcome_message
from schemas import OnboardingStartRequest, OnboardingStepRequest
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Twilio WhatsApp webhook endpoint
    Receives incoming messages and processes them through unified onboarding
    """
    # Log immediately when webhook is called
    logger.info("=" * 80)
    logger.info("🚀 WHATSAPP WEBHOOK CALLED!")
    logger.info(f"   Method: {request.method}")
    logger.info(f"   URL: {request.url}")
    logger.info(f"   Path: {request.url.path}")
    logger.info(f"   Client: {request.client.host if request.client else 'unknown'}")
    
    # Check if this is ngrok warning page request (shouldn't happen, but handle gracefully)
    user_agent = request.headers.get("user-agent", "")
    if "ngrok" in user_agent.lower() and "browser" in user_agent.lower():
        logger.warning("⚠️  Received request that looks like ngrok browser warning page")
    
    logger.info("=" * 80)
    
    try:
        # Get form data from Twilio (application/x-www-form-urlencoded)
        # Twilio sends form data, so we always try to parse as form first
        logger.info("📋 Attempting to parse form data...")
        try:
            form_data = await request.form()
            logger.info(f"✅ Form data parsed successfully: {list(form_data.keys())}")
        except Exception as form_error:
            # If form parsing fails, try to read raw body
            logger.warning(f"Failed to parse form data: {form_error}")
            try:
                body_bytes = await request.body()
                if not body_bytes:
                    # Empty request - likely a status callback
                    return Response(
                        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                        media_type="application/xml"
                    )
                # Try to parse manually if needed (unlikely but handle gracefully)
                logger.warning("Received non-form data webhook, returning empty response")
                return Response(
                    content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                    media_type="application/xml"
                )
            except Exception as body_error:
                logger.error(f"Failed to read request body: {body_error}")
                return Response(
                    content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                    media_type="application/xml"
                )
        
        from_number = form_data.get("From", "")
        to_number = form_data.get("To", "")
        body = form_data.get("Body", "")
        if body:
            body = str(body).strip()
        else:
            body = ""
        message_sid = form_data.get("MessageSid", "")
        
        # Handle status callbacks and other non-message webhooks
        if not from_number:
            # Check if this is a status callback
            message_status = form_data.get("MessageStatus")
            message_sid = form_data.get("MessageSid")
            error_code = form_data.get("ErrorCode")
            error_message = form_data.get("ErrorMessage")
            
            if message_status:
                logger.info("=" * 80)
                logger.info("📊 TWILIO STATUS CALLBACK RECEIVED")
                logger.info(f"   Message SID: {message_sid}")
                logger.info(f"   Status: {message_status}")
                if error_code:
                    logger.warning(f"   Error Code: {error_code}")
                    logger.warning(f"   Error Message: {error_message}")
                logger.info("=" * 80)
            else:
                logger.info("Webhook received without From number (likely status callback)")
            logger.info("=" * 50)
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="application/xml"
            )
        
        # If no body, might be a status callback - just acknowledge
        if not body:
            logger.info(f"Webhook received from {from_number} without body (status callback)")
            logger.info("=" * 50)
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="application/xml"
            )
        
        logger.info(f"✅ Processing WhatsApp message from {from_number}")
        logger.info(f"Message body: {body}")
        logger.info(f"Message SID: {message_sid}")
        
        # Parse phone number
        phone_number = parse_phone_number(from_number)
        
        # Get or create session
        session = await get_or_create_session(
            db, 
            phone_number, 
            channel="whatsapp"
        )
        
        # Store incoming message
        user_message = ConversationMessage(
            session_id=session.id,
            message_type="user",
            content=body,
            message_metadata={"message_sid": message_sid, "from": from_number}
        )
        db.add(user_message)
        await db.commit()
        
        # Process message based on session status
        response_message = ""
        quick_replies = None
        
        if session.status == "enquiry":
            # For new sessions, automatically start onboarding with consent step
            logger.info(f"📋 Session status is 'enquiry' - starting onboarding flow with consent")
            welcome = get_welcome_message()
            response_message = welcome["message"]
            quick_replies = welcome["quick_replies"]
            session.current_step = "consent"
            session.status = "onboarding"
            session.last_activity = datetime.utcnow()
            await db.commit()
        
        elif session.status == "onboarding":
            # Handle onboarding flow
            current_step = session.current_step
            
            if not current_step:
                # Start onboarding with consent step
                welcome = get_welcome_message()
                response_message = welcome["message"]
                quick_replies = welcome["quick_replies"]
                session.current_step = "consent"
                session.status = "onboarding"
                session.last_activity = datetime.utcnow()
                await db.commit()
            else:
                # Process step response using onboarding service directly
                from services.onboarding_service import handle_onboarding_step
                result = await handle_onboarding_step(
                    db, session, current_step, body
                )
                response_message = result["message"]
                quick_replies = result.get("quick_replies")
                
                # Update session status
                session.status = result["status"]
                session.current_step = result.get("next_step")
                await db.commit()
        
        elif session.status == "active":
            # Handle active user questions - Step 3: Personalised guidance
            from services.onboarding_service import handle_active_question
            
            result = await handle_active_question(db, session, body)
            response_message = result["message"]
            quick_replies = result.get("quick_replies")
        
        else:
            # Default: start onboarding with consent step
            welcome = get_welcome_message()
            response_message = welcome["message"]
            quick_replies = welcome["quick_replies"]
            session.status = "onboarding"
            session.current_step = "consent"
            session.last_activity = datetime.utcnow()
            await db.commit()
        
        # Store bot response
        bot_message = ConversationMessage(
            session_id=session.id,
            message_type="bot",
            content=response_message,
            message_metadata={"quick_replies": quick_replies}
        )
        db.add(bot_message)
        await db.commit()
        
        # Send WhatsApp response
        formatted_to = format_phone_number(from_number)
        logger.info(f"📤 Preparing to send WhatsApp response")
        logger.info(f"   To: {formatted_to}")
        logger.info(f"   Message: {response_message[:100]}...")
        logger.info(f"   Quick replies: {quick_replies}")
        
        send_success, msg_sid = send_whatsapp_message(formatted_to, response_message, quick_replies)
        
        if send_success:
            logger.info(f"✅ WhatsApp message sent successfully! SID: {msg_sid}")
        else:
            logger.error(f"❌ Failed to send WhatsApp message! SID: {msg_sid}")
        
        logger.info("=" * 80)
        # Return TwiML response (Twilio expects this)
        # IMPORTANT: Must return valid XML response
        twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        return Response(
            content=twiml_response,
            media_type="application/xml",
            status_code=200,
            headers={"Content-Type": "application/xml; charset=utf-8"}
        )
    
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"❌ ERROR processing WhatsApp webhook: {e}", exc_info=True)
        logger.error("=" * 80)
        # Return empty TwiML to avoid Twilio retries
        # IMPORTANT: Must return valid XML response with proper headers
        twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        return Response(
            content=twiml_response,
            media_type="application/xml",
            status_code=200,
            headers={"Content-Type": "application/xml; charset=utf-8"}
        )


@router.get("/status")
async def whatsapp_status():
    """Check WhatsApp service status"""
    from services.whatsapp_service import is_twilio_configured
    return {
        "status": "active" if is_twilio_configured() else "mock",
        "service": "twilio" if is_twilio_configured() else "mock",
        "configured": is_twilio_configured()
    }


@router.get("/test")
async def test_webhook():
    """Test endpoint to verify webhook URL is accessible"""
    logger.info("Test endpoint called - webhook URL is accessible")
    return {"status": "ok", "message": "Webhook endpoint is accessible"}


@router.post("/test")
async def test_webhook_post(request: Request):
    """Test POST endpoint to verify webhook can receive requests"""
    try:
        body = await request.body()
        form_data = await request.form() if body else {}
        logger.info(f"Test POST received - Body: {body}, Form: {dict(form_data)}")
        return {"status": "ok", "message": "Webhook can receive POST requests", "body": str(body)[:100], "form": dict(form_data)}
    except Exception as e:
        logger.error(f"Test POST error: {e}")
        return {"status": "error", "message": str(e)}
