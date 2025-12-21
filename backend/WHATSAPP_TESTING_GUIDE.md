# WhatsApp Testing Guide

## Prerequisites

1. **Twilio Account**: Sign up at https://www.twilio.com/try-twilio (free trial available)
2. **Backend Running**: Your FastAPI server must be running and accessible
3. **Public URL**: Your webhook needs to be publicly accessible (use ngrok for local testing)

## Step 1: Set Up Twilio Sandbox

1. **Log in to Twilio Console**: https://console.twilio.com
2. **Navigate to Messaging → Try it out → Send a WhatsApp message**
3. **Join the Sandbox**:
   - You'll see a code like "join [code-word]"
   - Send this exact message to the Twilio WhatsApp number: `+1 415 523 8886`
   - You'll receive a confirmation message

## Step 2: Get Your Twilio Credentials

From Twilio Console:
1. Go to **Account → Account Info**
2. Copy your:
   - **Account SID**
   - **Auth Token**
3. Go to **Messaging → Try it out → Send a WhatsApp message**
4. Note the **From** number (usually `whatsapp:+14155238886`)

## Step 3: Configure Environment Variables

Create or update your `.env` file in the backend directory:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# OTP Configuration
OTP_EXPIRY_SECONDS=300

# Redis (if not already set)
REDIS_URL=redis://localhost:6379/0

# Database (if not already set)
DATABASE_URL=postgresql+asyncpg://user:password@localhost/kamafile
```

## Step 4: Set Up Public Webhook URL (for Local Testing)

Since Twilio needs to send webhooks to your server, you need a public URL:

### Option A: Using ngrok (Recommended for Local Testing)

1. **Install ngrok**: https://ngrok.com/download
2. **Start your backend server**:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
3. **Start ngrok** in a new terminal:
   ```bash
   ngrok http 8000
   ```
4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Option B: Deploy to a Server

If you have a deployed server, use that URL instead.

## Step 5: Configure Twilio Webhook

1. **In Twilio Console**: Go to **Messaging → Try it out → Send a WhatsApp message**
2. **Set Webhook URL**: 
   - When a message comes in: `https://your-ngrok-url.ngrok.io/api/whatsapp/webhook`
   - Method: `POST`
3. **Save** the configuration

## Step 6: Test from Your Phone

### Test 1: Basic Message

1. **Send any message** to the Twilio WhatsApp number: `+1 415 523 8886`
2. **Expected**: 
   - If it's your first message, you'll receive the welcome message with onboarding options
   - The system will automatically start the onboarding flow

### Test 2: Onboarding Flow

Send these messages in sequence:

1. **"Hi"** or **"Hello"** (or any first message)
   - Should receive: Welcome message with "General info" and "Personalised help" options
   - Reply with: **"Personalised help"** or **"2"**

2. **After selecting "Personalised help"**
   - Should receive: Consent message about data protection
   - Reply with: **"Continue"** or **"1"**

3. **After consent**
   - Should receive: Goal selection with options:
     - Learn about tax
     - Check what applies to me
     - Organise receipts and documents
     - Get filing ready
     - Talk to an expert
   - Reply with: **"Check what applies to me"** or **"2"**

4. **After selecting goal**
   - Should receive: Income type question with options:
     - Salaried employee only
     - Salaried + side income
     - Freelancer / gig worker
     - Small business (no staff)
     - Business with staff
     - Unemployed
     - Just learning
   - Reply with: **"Salaried employee only"** or **"1"**

5. **After income type** (if applicable, you may get complexity question)
   - If you selected "Salaried + side income" or business types, you'll get a complexity question
   - Otherwise, you'll go directly to confidence level
   - Reply appropriately

6. **Confidence level question**
   - Should receive: "How confident are you about handling your taxes today?"
   - Options:
     - I just want information
     - I want help getting organised
     - I need help preparing to file
     - I need expert support
   - Reply with: **"I just want information"** or **"1"**

7. **Completion**
   - Should receive: "Got it! I'll guide you step by step. What would you like to know about your taxes?"
   - Your profile is now created and you're in "active" status

### Test 3: Check Session Status

Use the API to check your session:

```bash
# Find your session (replace with your phone number)
curl http://localhost:8000/api/onboarding/find/2341234567890

# Get session status (replace with session_id from above)
curl http://localhost:8000/api/onboarding/status/{session_id}
```

### Test 4: Cross-Channel Linking

1. **Request OTP** (from API or web interface):
   ```bash
   curl -X POST "http://localhost:8000/api/onboarding/link/request-otp?phone_number=%2B2341234567890"
   ```
   - You should receive OTP via WhatsApp

2. **Verify OTP** on web:
   ```bash
   curl -X POST http://localhost:8000/api/onboarding/link/verify \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number": "+2341234567890",
       "otp": "123456",
       "target_channel": "web"
     }'
   ```

## Step 7: Monitor Logs

Watch your backend logs to see:
- Incoming webhook requests
- Message processing
- Session creation/updates
- WhatsApp message sending

```bash
# In your backend terminal, you should see:
# - "Received WhatsApp message from: whatsapp:+234..."
# - "Session created/updated: ..."
# - "Sending WhatsApp message to: ..."
```

## Troubleshooting

### Issue: Not Receiving Messages

1. **Check webhook URL**: Ensure it's publicly accessible and correct
2. **Check Twilio logs**: Go to Twilio Console → Monitor → Logs → Messaging
3. **Check backend logs**: Look for errors in your terminal
4. **Verify credentials**: Ensure environment variables are set correctly

### Issue: Webhook Not Receiving Requests

1. **Test webhook manually**:
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/whatsapp/webhook \
     -d "From=whatsapp:+2341234567890" \
     -d "To=whatsapp:+14155238886" \
     -d "Body=test"
   ```
2. **Check ngrok status**: Ensure ngrok is running and URL is active
3. **Check firewall**: Ensure port 8000 is accessible

### Issue: Messages Not Sending

1. **Check Twilio status**: Go to Twilio Console → Monitor → Logs
2. **Verify phone number format**: Should be `whatsapp:+234...`
3. **Check account balance**: Free trial has limits
4. **Verify sandbox join**: Ensure you sent "join [code]" to Twilio number

### Issue: OTP Not Working

1. **Check Redis**: Ensure Redis is running
   ```bash
   redis-cli ping  # Should return PONG
   ```
2. **Check OTP expiry**: Default is 5 minutes
3. **Verify phone number normalization**: Check logs for normalized format

## Testing Checklist

- [ ] Twilio account created and sandbox joined
- [ ] Environment variables configured
- [ ] Backend server running
- [ ] ngrok/public URL configured
- [ ] Webhook URL set in Twilio
- [ ] Can send/receive messages
- [ ] Onboarding flow works end-to-end
- [ ] Session persists across messages
- [ ] OTP generation works
- [ ] Cross-channel linking works

## Next Steps

Once testing is successful:
1. Test with multiple users
2. Test edge cases (invalid responses, timeouts)
3. Monitor performance and errors
4. Prepare for production (get production Twilio credentials)

## Production Setup

When ready for production:
1. **Get production Twilio credentials** (different from sandbox)
2. **Update environment variables** (no code changes needed!)
3. **Update webhook URL** to production server
4. **Test with production credentials**

The code automatically switches between sandbox and production based on credentials - no code changes required!
