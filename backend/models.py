from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=True)
    pin_hash = Column(String(255), nullable=True)  # For PIN-based access (WhatsApp users)
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)
    user_type = Column(String(50), default="individual")  # individual, freelancer, micro_business, sme
    role = Column(String(50), default="user", index=True)  # user, admin, moderator, support, super_admin
    permissions = Column(JSON, nullable=True)  # Custom permissions override (list of permission strings)
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    admin_logs = relationship("AdminLog", back_populates="admin", foreign_keys="AdminLog.admin_id")


class AdminLog(Base):
    __tablename__ = "admin_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "user:update", "user:delete"
    resource_type = Column(String(50), nullable=False, index=True)  # e.g., "user", "content"
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)  # Additional context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    admin = relationship("User", back_populates="admin_logs", foreign_keys=[admin_id])


class Banner(Base):
    __tablename__ = "banners"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(500), nullable=False)
    description = Column(String(2000), nullable=True)
    image_url = Column(String(500), nullable=True)
    order = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ConversationSession(Base):
    """Unified conversation session for WhatsApp and Web"""
    __tablename__ = "conversation_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_identifier = Column(String(50), nullable=False, index=True)  # Phone number or user_id for cross-channel linking
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # Linked User account
    channel = Column(String(20), nullable=False, index=True)  # whatsapp, web
    status = Column(String(50), default="enquiry", index=True)  # enquiry, onboarding, active, incomplete
    current_step = Column(String(50), nullable=True)  # consent, goal, income_type, confidence, etc.
    step_data = Column(JSON, nullable=True)  # Store step-by-step responses
    session_metadata = Column(JSON, nullable=True)  # Additional session data (renamed from 'metadata' - SQLAlchemy reserved)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="session", uselist=False, cascade="all, delete-orphan")


class UserProfile(Base):
    """User profile for personalized guidance"""
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("conversation_sessions.id"), nullable=True, unique=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=True)  # For WhatsApp users
    
    # Step 1: Entry and goal
    intent_primary = Column(String(100), nullable=True)  # learn_about_tax, check_applies, organise_docs, etc.
    consent_given = Column(Boolean, default=False)
    
    # Step 2: Light profiling
    user_type = Column(String(50), nullable=True)  # salaried_only, salaried_side, freelancer, etc.
    income_complexity = Column(String(50), nullable=True)  # low, medium, high
    has_multiple_income = Column(Boolean, nullable=True)
    issues_invoices = Column(Boolean, nullable=True)
    receives_wht = Column(Boolean, nullable=True)
    confidence_level = Column(String(50), nullable=True)  # info_only, want_organised, need_help, need_expert
    
    # System-assigned
    capability_level = Column(Integer, nullable=True)  # 1, 2, 3 (internal only)
    
    # Additional context
    state = Column(String(50), nullable=True)  # State of residence/work
    staff_count = Column(Integer, nullable=True)
    pension_status = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    session = relationship("ConversationSession", back_populates="profile", foreign_keys=[session_id])


class ConversationMessage(Base):
    """Store conversation messages for context"""
    __tablename__ = "conversation_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("conversation_sessions.id"), nullable=False, index=True)
    message_type = Column(String(20), nullable=False)  # user, bot, system
    content = Column(String(2000), nullable=False)
    message_metadata = Column(JSON, nullable=True)  # For quick replies, buttons, etc. (renamed from 'metadata' - SQLAlchemy reserved)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    session = relationship("ConversationSession", back_populates="messages", foreign_keys=[session_id])


class DocumentMetadataCatalog(Base):
    """CSV metadata catalog for RAG documents"""
    __tablename__ = "document_metadata_catalog"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Core identification
    doc_id = Column(String(100), unique=True, nullable=False, index=True)
    file_name = Column(String(500), unique=True, nullable=False)
    file_name_normalized = Column(String(500), nullable=False, index=True)  # For matching
    source_title = Column(String(500), nullable=True)
    source_file_type = Column(String(100), nullable=True)
    
    # Classification
    issuing_body = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    jurisdiction_level = Column(String(100), nullable=True, index=True)
    knowledge_domain = Column(String(200), nullable=True)
    tax_type = Column(String(500), nullable=True)
    taxpayer_type = Column(String(500), nullable=True)
    doc_category = Column(String(200), nullable=True, index=True)
    
    # Temporal (all as text for flexibility)
    effective_date = Column(String(200), nullable=True)
    expiry_date = Column(String(200), nullable=True)
    publication_date = Column(String(200), nullable=True)
    version = Column(String(200), nullable=True)
    
    # Relationships
    supersedes_doc_id = Column(String(500), nullable=True)
    
    # Context
    lifecycle_stage = Column(String(200), nullable=True)
    authority_level = Column(String(200), nullable=True)
    intended_usage = Column(String(1000), nullable=True)
    topic_tags = Column(String(1000), nullable=True)
    status = Column(String(100), nullable=True, index=True)
    language = Column(String(50), nullable=True)
    notes = Column(String, nullable=True)  # TEXT field for long notes
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RAGDocument(Base):
    """RAG (Retrieval-Augmented Generation) documents for knowledge base"""
    __tablename__ = "rag_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(500), nullable=False)
    source_type = Column(String(50), nullable=False, index=True)  # file, url, text
    source_path = Column(String(1000), nullable=True)  # File path or URL
    file_name = Column(String(500), nullable=True)  # Original file name
    file_type = Column(String(100), nullable=True)  # MIME type or file extension
    file_size = Column(Integer, nullable=True)  # File size in bytes
    content_text = Column(String, nullable=True)  # Extracted text content
    content_metadata = Column(JSON, nullable=True)  # Additional metadata (page count, dimensions, etc.)
    processing_status = Column(String(50), default="pending", index=True)  # pending, processing, completed, failed
    processing_error = Column(String(1000), nullable=True)  # Error message if processing failed
    is_active = Column(Boolean, default=True, index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # CSV Metadata Integration
    metadata_catalog_id = Column(UUID(as_uuid=True), ForeignKey("document_metadata_catalog.id"), nullable=True, index=True)
    metadata_status = Column(String(50), default="matched", index=True)  # matched, pending, manual
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by])
    metadata_catalog = relationship("DocumentMetadataCatalog", foreign_keys=[metadata_catalog_id])