# WhatsApp Onboarding Implementation

## Overview

This implementation provides a unified onboarding system that works seamlessly across WhatsApp and Web channels, with cross-channel session continuity and Twilio integration that can switch between sandbox and production by only changing credentials.

## Architecture

### Database Models

1. **ConversationSession**: Unified session management
   - Links users across channels by phone number
   - Tracks onboarding progress and status
   - Stores step-by-step responses

2. **UserProfile**: User profiling data
   - Stores onboarding responses
   - Assigns capability levels
   - Links to User account when authenticated

3. **ConversationMessage**: Message history
   - Stores all user and bot messages
   - Maintains conversation context

### Services

1. **whatsapp_service.py**: Twilio abstraction
   - Handles phone number formatting
   - Sends WhatsApp messages
   - Works in mock mode without credentials
   - Seamlessly switches between sandbox/live via environment variables

2. **onboarding_service.py**: Core onboarding logic
   - Multi-step conversation flow
   - Session management
   - Profile creation
   - Capability level assignment

3. **otp_service.py**: Cross-channel linking
   - OTP generation and verification
   - Redis-based storage with expiry

### API Endpoints

#### Onboarding Router (`/api/onboarding`)

- `POST /start`: Start or resume onboarding session
- `POST /step`: Process onboarding step response
- `GET /status/{session_id}`: Get current onboarding status
- `POST /link/request-otp`: Request OTP for cross-channel linking
- `POST /link/verify`: Verify OTP and link session
- `GET /find/{user_identifier}`: Find session by identifier

#### WhatsApp Router (`/api/whatsapp`)

- `POST /webhook`: Twilio webhook handler
- `GET /status`: Check WhatsApp service status

## Environment Variables

```bash
# Twilio Configuration (works with sandbox or production)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Sandbox default

# OTP Configuration
OTP_EXPIRY_SECONDS=300  # 5 minutes default

# Redis (for OTP storage)
REDIS_URL=redis://localhost:6379/0
```

## Onboarding Flow

1. **Welcome**: User chooses general info or personalised help
2. **Consent**: Data protection and consent agreement
3. **Goal**: Primary intent (learn, check, organise, file, expert)
4. **Income Type**: User type selection
5. **Income Complexity**: Conditional step based on income type
6. **Confidence**: Confidence level assessment
7. **Complete**: Profile created, user becomes active

## Cross-Channel Continuity

Users can start onboarding on WhatsApp and continue on Web (or vice versa):

1. User starts onboarding on WhatsApp
2. User requests OTP via `/api/onboarding/link/request-otp`
3. OTP sent via WhatsApp
4. User enters OTP on web via `/api/onboarding/link/verify`
5. Session linked, user can continue on web

## Testing

Run tests with:

```bash
cd backend
pytest tests/ -v
```

Test coverage includes:
- Onboarding service logic
- WhatsApp service (phone formatting, message sending)
- OTP service (generation, verification, expiry)
- API endpoints (start, step, status, linking)

## Migration

Create database tables by running:

```bash
# Alembic migration (recommended)
alembic revision --autogenerate -m "Add onboarding models"
alembic upgrade head

# Or import models in main.py (already done)
# Models are auto-created on startup
```

## Twilio Setup

### Sandbox Mode (Testing)

1. Get sandbox credentials from Twilio Console
2. Set environment variables
3. Join sandbox by sending "join [code]" to Twilio WhatsApp number
4. System works immediately

### Production Mode

1. Get production credentials from Twilio
2. Update environment variables (no code changes needed)
3. System automatically uses production API

## Future Enhancements

- [ ] RAG/AI integration for tax Q&A
- [ ] Interactive message buttons (TwiML)
- [ ] Session timeout and cleanup
- [ ] Analytics and reporting
- [ ] Multi-language support
