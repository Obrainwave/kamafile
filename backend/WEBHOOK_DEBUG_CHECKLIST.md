# Webhook Debug Checklist

## If you see NO logs when sending WhatsApp messages:

### 1. Verify Webhook URL in Twilio Console

1. Go to **Twilio Console** → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Check the **"When a message comes in"** webhook URL
3. It should be: `https://your-ngrok-url.ngrok.io/api/whatsapp/webhook`
4. Method should be: **POST**
5. **Save** the configuration

### 2. Test Webhook URL Accessibility

```bash
# Test if the endpoint is accessible
curl https://your-ngrok-url.ngrok.io/api/whatsapp/test

# Should return: {"status": "ok", "message": "Webhook endpoint is accessible"}
```

### 3. Test Webhook with Manual POST

```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+2341234567890" \
  -d "To=whatsapp:+14155238886" \
  -d "Body=test message"
```

**Expected in logs:**
```
🚀 WHATSAPP WEBHOOK CALLED!
📋 Attempting to parse form data...
✅ Form data parsed successfully: ['From', 'To', 'Body']
✅ Processing WhatsApp message from whatsapp:+2341234567890
```

### 4. Check Twilio Logs

1. Go to **Twilio Console** → **Monitor** → **Logs** → **Messaging**
2. Look for webhook delivery attempts
3. Check status codes:
   - **200** = Success (webhook received)
   - **404** = URL not found
   - **500** = Server error
   - **Timeout** = Server not responding

### 5. Verify ngrok is Running

```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# Or check ngrok web interface
# Open: http://localhost:4040
```

### 6. Check Backend is Running

```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return database and redis status
```

### 7. Verify Environment Variables

Make sure these are set in your Docker container or environment:

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 8. Check Docker Container Logs

```bash
# View real-time logs
docker logs -f kamafile_backend

# Or if running locally
# Check your terminal where uvicorn is running
```

## What to Look For in Logs

### ✅ Good Signs:
- `📥 INCOMING REQUEST: POST /api/whatsapp/webhook`
- `🚀 WHATSAPP WEBHOOK CALLED!`
- `✅ Form data parsed successfully`
- `✅ Processing WhatsApp message`

### ❌ Problem Signs:
- No logs at all → Webhook URL not configured or not accessible
- `404` errors → Wrong URL path
- `500` errors → Check error logs for exceptions
- `Timeout` → Server not responding or ngrok down

## Common Issues

### Issue: No logs appear
**Solution:** 
- Webhook URL might not be set in Twilio
- ngrok might be down or URL changed
- Backend might not be running

### Issue: 404 Not Found
**Solution:**
- Check webhook URL path: `/api/whatsapp/webhook` (not `/webhook`)
- Verify router is registered in `main.py`

### Issue: 500 Server Error
**Solution:**
- Check error logs for exceptions
- Verify database connection
- Check environment variables

### Issue: Timeout
**Solution:**
- Restart ngrok
- Check if backend is running
- Verify firewall/network settings

## Quick Test Sequence

1. **Test endpoint accessibility:**
   ```bash
   curl https://your-ngrok-url.ngrok.io/api/whatsapp/test
   ```

2. **Test webhook manually:**
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/whatsapp/webhook \
     -d "From=whatsapp:+2341234567890" \
     -d "Body=test"
   ```

3. **Check logs** - you should see:
   - `📥 INCOMING REQUEST`
   - `🚀 WHATSAPP WEBHOOK CALLED!`
   - `✅ Processing WhatsApp message`

4. **Send from WhatsApp** - check if same logs appear

5. **Check Twilio Console** - verify webhook delivery status
