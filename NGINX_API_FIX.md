# Nginx API 404 Fix Guide

## Problem
Getting 404 errors when accessing `/api/*` endpoints on production (e.g., `https://dev.kamafile.com/api/auth/login`)

## Possible Causes

1. **Nginx `/api` location block missing or misconfigured**
2. **Backend not running on port 8001**
3. **Backend CORS configuration blocking requests**

## Solution Steps

### Step 1: Verify Backend is Running

SSH into your server and check if the backend container is running:

```bash
# Check if backend container is running
docker ps | grep kamafile_backend

# Check backend logs
docker logs kamafile_backend

# Test backend directly
curl http://localhost:8001/health
```

If backend is not running, start it:
```bash
cd /path/to/kamafile/backend
docker-compose up -d
```

### Step 2: Verify Nginx Configuration

1. **Check if `/api` location block exists** in your nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/kamafile
   # or wherever your nginx config is
   ```

2. **Ensure the HTTPS server block has this configuration** (order matters!):
   ```nginx
   server {
       listen 443 ssl http2;
       server_name dev.kamafile.com;
       
       # ... SSL config ...
       
       # Health endpoint (FIRST)
       location /health {
           proxy_pass http://localhost:8001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       # API endpoints (BEFORE root location)
       location /api {
           proxy_pass http://localhost:8001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-Host $host;
           
           # Timeouts
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }
       
       # Frontend static files (LAST)
       location / {
           root /var/www/kamafile/frontend/build;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Test nginx configuration**:
   ```bash
   sudo nginx -t
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

### Step 3: Test the Proxy

Test if nginx can reach the backend:

```bash
# From the server, test the proxy
curl -H "Host: dev.kamafile.com" http://localhost/api/auth/login

# Or test directly
curl http://localhost:8001/api/auth/login
```

### Step 4: Check Nginx Error Logs

If still not working, check nginx error logs:

```bash
sudo tail -f /var/log/nginx/error.log
```

Then try accessing the API endpoint from browser and watch for errors.

### Step 5: Verify Backend CORS Configuration

The backend CORS might be blocking requests. Update `backend/main.py` to allow your production domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dev.kamafile.com",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

Then restart the backend:
```bash
docker-compose restart backend
```

## Quick Verification Checklist

- [ ] Backend container is running (`docker ps`)
- [ ] Backend responds on port 8001 (`curl http://localhost:8001/health`)
- [ ] Nginx config has `/api` location block before `/` location
- [ ] Nginx config tested successfully (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)
- [ ] Backend CORS allows production domain
- [ ] Frontend is using relative URLs (empty baseURL in production)

## Common Issues

1. **404 on all `/api/*` routes**: Nginx `/api` location block missing or after root location
2. **502 Bad Gateway**: Backend not running or not accessible on port 8001
3. **CORS errors**: Backend CORS configuration doesn't allow production domain
4. **Connection refused**: Backend container not running or port not exposed

