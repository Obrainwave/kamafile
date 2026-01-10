from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    user_type: Optional[str] = "individual"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_verified: bool
    role: Optional[str] = "user"
    last_login: Optional[datetime] = None
    login_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    user_type: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    role: Optional[str] = None


# Admin schemas
class UserStatsResponse(BaseModel):
    total: int
    active: int
    verified: int
    by_type: Dict[str, int]
    by_role: Dict[str, int]


class AdminLogResponse(BaseModel):
    id: UUID
    admin_id: UUID
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users: int
    new_users_today: int
    new_users_this_week: int
    users_by_type: Dict[str, int]
    users_by_role: Dict[str, int]


# Banner schemas
class BannerBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0
    is_active: bool = True


class BannerCreate(BannerBase):
    pass


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class BannerResponse(BannerBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignUpRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    confirm_password: str
    phone_number: Optional[str] = None
    user_type: Optional[str] = "individual"


# Onboarding & Conversation schemas
class OnboardingStartRequest(BaseModel):
    """Start a new onboarding session"""
    channel: str  # whatsapp, web
    user_identifier: str  # Phone number for WhatsApp, email/user_id for web
    user_id: Optional[UUID] = None  # Optional authenticated user ID


class OnboardingStepRequest(BaseModel):
    """Process an onboarding step or active question"""
    session_id: UUID
    step: Optional[str] = None  # consent, goal, income_type, etc. (optional for active status)
    response: str  # User's response/selection
    data: Optional[Dict[str, Any]] = None  # Additional step data


class OnboardingStepResponse(BaseModel):
    """Response with next step or completion"""
    session_id: UUID
    step: Optional[str] = None
    message: str
    quick_replies: Optional[List[Dict[str, str]]] = None
    completed: bool = False
    status: str  # enquiry, onboarding, active


class OnboardingStatusResponse(BaseModel):
    """Current onboarding status"""
    session_id: UUID
    status: str
    current_step: Optional[str] = None
    channel: str
    user_identifier: str
    step_data: Optional[Dict[str, Any]] = None


class LinkSessionRequest(BaseModel):
    """Link session across channels via OTP"""
    phone_number: str
    otp: str
    target_channel: str  # whatsapp or web


class LinkSessionResponse(BaseModel):
    """Response after linking sessions"""
    session_id: UUID
    linked: bool
    message: str


class OTPRequestResponse(BaseModel):
    """Response when requesting OTP"""
    otp_sent: bool
    expires_in: int  # seconds
    message: str


# WhatsApp schemas
class WhatsAppMessageRequest(BaseModel):
    """Incoming WhatsApp message from Twilio"""
    From: str  # Phone number in format: whatsapp:+234...
    To: str
    Body: str
    MessageSid: str
    NumMedia: Optional[str] = "0"
    MediaUrl0: Optional[str] = None


class UserProfileResponse(BaseModel):
    """User profile data"""
    id: UUID
    phone_number: Optional[str] = None
    intent_primary: Optional[str] = None
    user_type: Optional[str] = None
    income_complexity: Optional[str] = None
    confidence_level: Optional[str] = None
    capability_level: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# RAG Document schemas
class RAGDocumentBase(BaseModel):
    title: str
    source_type: str  # file, url, text
    source_path: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    is_active: bool = True


class RAGDocumentCreate(BaseModel):
    title: str
    source_type: str  # file, url
    url: Optional[str] = None  # For URL source type


class RAGDocumentResponse(RAGDocumentBase):
    id: UUID
    content_text: Optional[str] = None
    content_metadata: Optional[Dict[str, Any]] = None
    processing_status: str
    processing_error: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RAGDocumentUpdate(BaseModel):
    title: Optional[str] = None
    is_active: Optional[bool] = None