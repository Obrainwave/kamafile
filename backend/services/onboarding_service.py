"""Onboarding flow service - handles step-by-step conversation"""
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ConversationSession, UserProfile
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)


# Onboarding step definitions - Following WhatsApp flow guidelines
ONBOARDING_STEPS = {
    "consent": {
        "next": "goal",
        "message": "Kamafile provides guidance, not legal advice. Your data is protected. You control what you share.\n\nContinue?",
        "quick_replies": [
            {"title": "Continue", "payload": "consent_yes"},
            {"title": "Cancel", "payload": "consent_no"}
        ]
    },
    "goal": {
        "next": "income_type",
        "message": "What would you like to do?",
        "quick_replies": [
            {"title": "Learn about tax", "payload": "learn_about_tax"},
            {"title": "Check what applies to me", "payload": "check_applies"},
            {"title": "Organise receipts and documents", "payload": "organise_docs"},
            {"title": "Get filing ready", "payload": "get_filing_ready"},
            {"title": "Talk to an expert", "payload": "talk_expert"}
        ]
    },
    "income_type": {
        "next": "income_complexity",
        "message": "Which best describes you right now?",
        "quick_replies": [
            {"title": "Salaried employee only", "payload": "salaried_only"},
            {"title": "Salaried + side income", "payload": "salaried_side"},
            {"title": "Freelancer / gig worker", "payload": "freelancer"},
            {"title": "Small business (no staff)", "payload": "small_business"},
            {"title": "Business with staff", "payload": "business_staff"},
            {"title": "Unemployed", "payload": "unemployed"},
            {"title": "Just learning", "payload": "learning"}
        ]
    },
    "income_complexity": {
        "next": "confidence",
        "conditional": True,  # This step may be skipped based on income_type
    },
    "confidence": {
        "next": "complete",
        "message": "How confident are you about handling your taxes today?",
        "quick_replies": [
            {"title": "I just want information", "payload": "info_only"},
            {"title": "I want help getting organised", "payload": "want_organised"},
            {"title": "I need help preparing to file", "payload": "need_help"},
            {"title": "I need expert support", "payload": "need_expert"}
        ]
    }
}


async def get_or_create_session(
    db: AsyncSession,
    user_identifier: str,
    channel: str = "web",
    user_id: Optional[uuid.UUID] = None
) -> ConversationSession:
    """
    Get existing session or create new one
    Looks up by user_identifier (phone number) for cross-channel continuity
    """
    # Normalize user_identifier
    # For phone numbers, remove whatsapp: prefix and +, keep digits
    # For emails/user_ids, keep as is
    if user_identifier.startswith("whatsapp:") or user_identifier.replace("+", "").replace("-", "").replace(" ", "").isdigit():
        clean_identifier = user_identifier.replace("whatsapp:", "").replace("+", "").replace("-", "").replace(" ", "").strip()
    else:
        clean_identifier = user_identifier.strip()
    
    # Try to find existing session by user_identifier
    result = await db.execute(
        select(ConversationSession)
        .where(ConversationSession.user_identifier == clean_identifier)
        .order_by(ConversationSession.last_activity.desc())
    )
    session = result.scalar_one_or_none()
    
    if session:
        # Update last activity and channel if switching
        session.last_activity = datetime.utcnow()
        if session.channel != channel:
            session.channel = channel  # Update to current channel
        await db.commit()
        await db.refresh(session)
        return session
    
    # Create new session
    session = ConversationSession(
        user_identifier=clean_identifier,
        user_id=user_id,
        channel=channel,
        status="enquiry",
        current_step=None,
        step_data={},
        metadata={}
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def find_session_by_identifier(
    db: AsyncSession,
    user_identifier: str
) -> Optional[ConversationSession]:
    """Find existing session by user identifier (for cross-channel lookup)"""
    clean_identifier = user_identifier.replace("whatsapp:", "").replace("+", "").strip()
    
    result = await db.execute(
        select(ConversationSession)
        .where(ConversationSession.user_identifier == clean_identifier)
        .order_by(ConversationSession.last_activity.desc())
    )
    return result.scalar_one_or_none()


def normalize_user_response(user_response: str, step: str, step_config: Dict[str, Any]) -> str:
    """
    Normalize user response to match payload values
    Handles: "1", "General info", "general_info", etc.
    """
    if not user_response:
        return user_response
    
    user_response = user_response.strip().lower()
    
    # Get quick replies for this step
    quick_replies = step_config.get("quick_replies", [])
    
    # Check if response is already a payload
    for reply in quick_replies:
        if user_response == reply.get("payload", "").lower():
            return reply.get("payload")
    
    # Check if response matches a title (case-insensitive)
    for reply in quick_replies:
        title = reply.get("title", "").lower()
        if user_response == title or user_response in title or title in user_response:
            return reply.get("payload")
    
    # Handle numeric responses (1, 2, 3, etc.)
    try:
        index = int(user_response) - 1
        if 0 <= index < len(quick_replies):
            return quick_replies[index].get("payload")
    except (ValueError, IndexError):
        pass
    
    # Check for partial matches (e.g., "general" matches "general_info")
    for reply in quick_replies:
        payload = reply.get("payload", "").lower()
        title = reply.get("title", "").lower()
        if user_response in payload or payload in user_response:
            return reply.get("payload")
        if user_response in title or title in user_response:
            return reply.get("payload")
    
    # Return original if no match found
    return user_response


async def handle_onboarding_step(
    db: AsyncSession,
    session: ConversationSession,
    step: str,
    user_response: str,
    response_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Handle onboarding step response and return next step
    
    Returns:
        Dict with message, next_step, quick_replies, completed, status
    """
    step_data = session.step_data or {}
    
    # Get step configuration
    step_config = ONBOARDING_STEPS.get(step, {})
    
    # Normalize user response to match payload
    normalized_response = normalize_user_response(user_response, step, step_config)
    logger.info(f"📝 Normalizing response: '{user_response}' → '{normalized_response}' (step: {step})")
    
    # Store user response (both original and normalized)
    step_data[step] = {
        "response": user_response,
        "normalized": normalized_response,
        "data": response_data or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Determine next step based on current step and response
    next_step = None
    message = ""
    quick_replies = []
    completed = False
    new_status = session.status
    
    if step == "consent":
        if normalized_response == "consent_yes":
            step_data["consent"] = {"given": True}
            next_step = "goal"
            session.current_step = "goal"
            # Store consent in session metadata
            session.step_data = step_data
        else:
            # User declined consent - end onboarding
            message = "No problem. You can ask general questions anytime!"
            new_status = "enquiry"
            session.current_step = None
            session.step_data = step_data
            await db.commit()
            return {
                "message": message,
                "next_step": None,
                "quick_replies": None,
                "completed": False,
                "status": "enquiry"
            }
    
    elif step == "goal":
        step_data["goal"] = {"intent_primary": normalized_response}
        next_step = "income_type"
        session.current_step = "income_type"
    
    elif step == "income_type":
        step_data["income_type"] = {"user_type": normalized_response}
        
        # Determine if we need complexity question
        needs_complexity = normalized_response in ["salaried_side", "freelancer", "small_business", "business_staff"]
        
        if needs_complexity:
            next_step = "income_complexity"
            session.current_step = "income_complexity"
            
            # Set appropriate complexity question
            if normalized_response == "salaried_side":
                message = "Do you earn from more than one source?"
                quick_replies = [
                    {"title": "Yes", "payload": "multiple_income_yes"},
                    {"title": "No", "payload": "multiple_income_no"}
                ]
            elif user_response in ["freelancer", "small_business", "business_staff"]:
                message = "Do you issue invoices or receive deductions (WHT)?"
                quick_replies = [
                    {"title": "Yes", "payload": "invoices_yes"},
                    {"title": "No", "payload": "invoices_no"},
                    {"title": "Not sure", "payload": "invoices_unsure"}
                ]
        else:
            next_step = "confidence"
            session.current_step = "confidence"
    
    elif step == "income_complexity":
        step_data["income_complexity"] = {"response": normalized_response}
        next_step = "confidence"
        session.current_step = "confidence"
    
    elif step == "confidence":
        step_data["confidence"] = {"confidence_level": normalized_response}
        
        # Create user profile first
        await create_user_profile(db, session, step_data)
        
        # Get capability level for personalized guidance
        capability_level = assign_capability_level(
            step_data.get("income_type", {}).get("user_type"),
            step_data.get("income_complexity", {}).get("response")
        )
        
        # Generate personalized acknowledgment (Step 2.5)
        if capability_level == 1:
            acknowledgment = "Got it. I'll guide you step by step."
        elif capability_level == 2:
            acknowledgment = "I'll help you organise this and show what applies to you."
        else:  # Level 3
            acknowledgment = "Some parts may need expert support. I'll flag those clearly."
        
        # Now generate Step 3: Personalised guidance overview
        personalized_overview = await generate_personalized_overview(
            db, session, step_data, capability_level
        )
        
        # Combine acknowledgment with personalized overview
        message = f"{acknowledgment}\n\n{personalized_overview['message']}"
        quick_replies = personalized_overview.get('quick_replies', [])
        
        # Mark onboarding as complete, but we're now in guidance phase
        completed = True
        new_status = "active"
        session.current_step = "guidance"  # Track that we're in guidance phase
    
    # Update session
    session.step_data = step_data
    session.status = new_status
    session.last_activity = datetime.utcnow()
    await db.commit()
    
    # Get step definition if not already set
    if not message and next_step and next_step in ONBOARDING_STEPS:
        step_def = ONBOARDING_STEPS[next_step]
        message = step_def.get("message", "")
        quick_replies = step_def.get("quick_replies", [])
    
    return {
        "message": message,
        "next_step": next_step,
        "quick_replies": quick_replies,
        "completed": completed,
        "status": new_status
    }


async def create_user_profile(
    db: AsyncSession,
    session: ConversationSession,
    step_data: Dict[str, Any]
) -> UserProfile:
    """Create or update user profile from onboarding data"""
    # Check if profile already exists for this session
    result = await db.execute(
        select(UserProfile).where(UserProfile.session_id == session.id)
    )
    profile = result.scalar_one_or_none()
    
    # Extract phone number from user_identifier if it's a phone number
    phone_number = None
    if session.user_identifier and session.user_identifier.replace("+", "").isdigit():
        phone_number = session.user_identifier
    
    if profile:
        # Update existing profile
        profile.intent_primary = step_data.get("goal", {}).get("intent_primary")
        profile.user_type = step_data.get("income_type", {}).get("user_type")
        profile.confidence_level = step_data.get("confidence", {}).get("confidence_level")
        profile.consent_given = step_data.get("consent", {}).get("given", False)
        
        if phone_number:
            profile.phone_number = phone_number
    else:
        # Create new profile
        profile = UserProfile(
            user_id=session.user_id,
            session_id=session.id,
            phone_number=phone_number,
            intent_primary=step_data.get("goal", {}).get("intent_primary"),
            user_type=step_data.get("income_type", {}).get("user_type"),
            confidence_level=step_data.get("confidence", {}).get("confidence_level"),
            consent_given=step_data.get("consent", {}).get("given", False)
        )
        db.add(profile)
    
    # Set income complexity
    if step_data.get("income_complexity"):
        complexity_resp = step_data["income_complexity"].get("response", "")
        if "multiple_income_yes" in complexity_resp or "invoices_yes" in complexity_resp:
            profile.income_complexity = "medium"
            profile.has_multiple_income = True
            if "invoices_yes" in complexity_resp:
                profile.issues_invoices = True
                profile.receives_wht = True
        else:
            profile.income_complexity = "low"
            profile.has_multiple_income = False
    
    # Assign capability level
    profile.capability_level = assign_capability_level(profile.user_type, profile.income_complexity)
    
    await db.commit()
    await db.refresh(profile)
    return profile


def assign_capability_level(user_type: Optional[str], income_complexity: Optional[str]) -> int:
    """Assign capability level based on user type and complexity"""
    if not user_type:
        return 1
    
    # Level 1: Simple cases
    if user_type in ["salaried_only", "unemployed", "learning"]:
        return 1
    
    # Level 2: Medium complexity
    if user_type in ["salaried_side", "freelancer", "small_business"]:
        if income_complexity == "medium":
            return 2
        return 1
    
    # Level 3: High complexity
    if user_type == "business_staff":
        return 3
    
    return 1


async def generate_personalized_overview(
    db: AsyncSession,
    session: ConversationSession,
    step_data: Dict[str, Any],
    capability_level: int
) -> Dict[str, Any]:
    """
    Step 3.1: Generate a personalised overview based on user profile
    Returns tailored tax guidance summary
    """
    user_type = step_data.get("income_type", {}).get("user_type", "")
    intent_primary = step_data.get("goal", {}).get("intent_primary", "")
    confidence_level = step_data.get("confidence", {}).get("confidence_level", "")
    
    # Build personalized message based on user type
    message_parts = []
    
    # Opening based on intent
    if intent_primary == "learn_about_tax":
        message_parts.append("Based on what you told me, here's what you should know about taxes:")
    elif intent_primary == "check_applies":
        message_parts.append("Based on your situation, these are the taxes that may apply to you:")
    elif intent_primary == "organise_docs":
        message_parts.append("Let me help you understand what documents matter for your situation:")
    elif intent_primary == "get_filing_ready":
        message_parts.append("Here's what you need to know to get filing ready:")
    else:
        message_parts.append("Based on what you told me, here's what typically applies:")
    
    # Tax obligations based on user type
    tax_info = []
    
    if user_type == "salaried_only":
        tax_info.append("• PAYE (Pay As You Earn) - Usually handled by your employer")
        tax_info.append("• You typically don't need to file if you only have salary income")
    elif user_type == "salaried_side":
        tax_info.append("• PAYE on your salary (handled by employer)")
        tax_info.append("• PIT (Personal Income Tax) on your side income")
        tax_info.append("• You may need to file a tax return")
    elif user_type == "freelancer":
        tax_info.append("• PIT (Personal Income Tax) on your freelance income")
        tax_info.append("• WHT (Withholding Tax) may be deducted by clients")
        tax_info.append("• VAT may apply if you earn above ₦25 million annually")
        tax_info.append("• You need to file tax returns")
    elif user_type in ["small_business", "business_staff"]:
        tax_info.append("• PIT on business income")
        tax_info.append("• VAT if annual turnover exceeds ₦25 million")
        tax_info.append("• WHT on payments you make")
        tax_info.append("• Company Income Tax (CIT) if incorporated")
        tax_info.append("• You need to file regular tax returns")
    elif user_type == "unemployed":
        tax_info.append("• Generally no tax obligations if you have no income")
        tax_info.append("• If you receive benefits or allowances, check if taxable")
    else:  # learning
        tax_info.append("• Understanding tax basics is a great start!")
        tax_info.append("• Most people start with PAYE (if employed) or PIT (if self-employed)")
    
    message_parts.append("\n".join(tax_info))
    
    # Add context based on confidence
    if confidence_level == "info_only":
        message_parts.append("\nI'll provide clear information to help you understand.")
    elif confidence_level == "want_organised":
        message_parts.append("\nI can help you organise your documents and receipts.")
    elif confidence_level == "need_help":
        message_parts.append("\nI'll guide you through preparing to file.")
    elif confidence_level == "need_expert":
        message_parts.append("\nFor complex situations, I'll flag when expert help is needed.")
    
    # Suggested prompts for questions (Step 3.3)
    quick_replies = [
        {"title": "Does this apply to my situation?", "payload": "clarify_applicability"},
        {"title": "What documents do I need?", "payload": "ask_documents"},
        {"title": "What if I didn't keep receipts?", "payload": "ask_no_receipts"},
        {"title": "What happens if I don't file?", "payload": "ask_consequences"},
    ]
    
    return {
        "message": "\n\n".join(message_parts),
        "quick_replies": quick_replies
    }


async def handle_active_question(
    db: AsyncSession,
    session: ConversationSession,
    user_question: str
) -> Dict[str, Any]:
    """
    Step 3.3: Handle questions and clarification in active mode
    Uses user profile context to provide personalized answers
    """
    # Get user profile for context
    from sqlalchemy import select
    from models import UserProfile
    
    result = await db.execute(
        select(UserProfile).where(UserProfile.session_id == session.id)
    )
    profile = result.scalar_one_or_none()
    
    # Normalize question for matching
    question_lower = user_question.lower().strip()
    
    # Handle quick reply payloads
    if question_lower in ["clarify_applicability", "does this apply to my situation?"]:
        user_type = profile.user_type if profile else session.step_data.get("income_type", {}).get("user_type", "")
        message = generate_applicability_clarification(user_type)
        quick_replies = [
            {"title": "What documents do I need?", "payload": "ask_documents"},
            {"title": "Tell me more about filing", "payload": "ask_filing"},
        ]
    elif question_lower in ["ask_documents", "what documents do i need?"]:
        user_type = profile.user_type if profile else session.step_data.get("income_type", {}).get("user_type", "")
        message = generate_documents_guidance(user_type)
        quick_replies = [
            {"title": "How do I organise these?", "payload": "ask_organisation"},
            {"title": "What if I'm missing some?", "payload": "ask_missing_docs"},
        ]
    elif question_lower in ["ask_no_receipts", "what if i didn't keep receipts?"]:
        message = "Don't worry! You can:\n\n• Reconstruct records from bank statements\n• Use estimates (be reasonable)\n• Keep better records going forward\n• I can help you organise what you have"
        quick_replies = [
            {"title": "Help me organise", "payload": "ask_organisation"},
            {"title": "What about penalties?", "payload": "ask_penalties"},
        ]
    elif question_lower in ["ask_consequences", "what happens if i don't file?"]:
        message = "If you're required to file and don't:\n\n• You may face penalties and interest\n• FIRS can assess you based on estimates\n• It can affect future compliance\n\nBut many people can get help to catch up. I can guide you on next steps."
        quick_replies = [
            {"title": "Help me get started", "payload": "ask_get_started"},
            {"title": "Talk to an expert", "payload": "ask_expert"},
        ]
    else:
        # Generic AI response placeholder (Step 3.3)
        # TODO: Integrate with RAG/AI service for actual tax knowledge base
        message = f"I understand you're asking about: {user_question}\n\nBased on your profile, I'd recommend checking with a tax expert for specific advice. For general guidance, I can help you understand:\n\n• What taxes apply to your situation\n• What documents you need\n• How to get organised\n\nWhat would you like to know more about?"
        quick_replies = [
            {"title": "What applies to me?", "payload": "clarify_applicability"},
            {"title": "Help me organise", "payload": "ask_organisation"},
            {"title": "Talk to an expert", "payload": "ask_expert"},
        ]
    
    return {
        "message": message,
        "quick_replies": quick_replies
    }


def generate_applicability_clarification(user_type: str) -> str:
    """Generate clarification on what applies to user's situation"""
    clarifications = {
        "salaried_only": "For salaried employees:\n\n• PAYE is automatically deducted by your employer\n• You typically don't need to file unless you have other income\n• Your payslip shows your tax deductions\n\nYou're all set if you only have salary income!",
        "salaried_side": "For salaried employees with side income:\n\n• PAYE on salary (handled by employer)\n• PIT on side income - you need to file\n• Keep records of your side income\n• You may need to pay additional tax\n\nI can help you understand what to declare.",
        "freelancer": "For freelancers:\n\n• PIT applies to your freelance income\n• Clients may deduct WHT (10%)\n• You need to file annual tax returns\n• VAT applies if you earn over ₦25M/year\n• Keep invoices and receipts\n\nI can help you organise your records.",
        "small_business": "For small businesses:\n\n• PIT on business profits\n• VAT if turnover exceeds ₦25M\n• WHT on payments you make\n• You need to file regular returns\n• Keep proper books and records\n\nI can help you understand your obligations.",
        "business_staff": "For businesses with staff:\n\n• All small business obligations, plus:\n• PAYE for your employees\n• Pension contributions\n• Company Income Tax if incorporated\n• More complex compliance requirements\n\nSome parts may need expert support.",
    }
    return clarifications.get(user_type, "I can help clarify what applies to your specific situation. What would you like to know more about?")


def generate_documents_guidance(user_type: str) -> str:
    """Generate guidance on required documents"""
    documents = {
        "salaried_only": "For salaried employees:\n\n• Payslips (monthly)\n• Form A (from employer)\n• Bank statements\n• Any other income documents\n\nUsually minimal if you only have salary!",
        "salaried_side": "For side income earners:\n\n• Payslips\n• Records of side income\n• Receipts for expenses\n• Bank statements\n• Invoices (if you issue them)\n\nI can help you organise these!",
        "freelancer": "For freelancers:\n\n• All invoices you issued\n• Receipts for business expenses\n• Bank statements\n• WHT certificates (from clients)\n• Records of income and expenses\n\nGood record-keeping is key!",
        "small_business": "For businesses:\n\n• Sales records/invoices\n• Purchase receipts\n• Bank statements\n• Expense records\n• WHT certificates\n• Any VAT records\n\nI can help you set up a system.",
        "business_staff": "For businesses with staff:\n\n• All small business documents, plus:\n• Employee records\n• PAYE returns\n• Pension records\n• Payroll records\n\nThis can get complex - expert help may be useful.",
    }
    return documents.get(user_type, "The documents you need depend on your income type. I can help you identify what's relevant for your situation.")


def get_welcome_message() -> Dict[str, Any]:
    """Get welcome message for new users - starts with consent step per guidelines"""
    step_def = ONBOARDING_STEPS["consent"]
    return {
        "message": step_def["message"],
        "quick_replies": step_def["quick_replies"],
        "next_step": step_def["next"]
    }
