# Nginx Configuration Fix for /health Endpoint

## Problem
Accessing `https://dev.kamafile.com/health` returns the frontend HTML instead of the backend API response.

## Solution
Add the `/health` location block to your nginx configuration **BEFORE** the root location block.

## Steps on Live Server

1. **SSH into your server** and edit the nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/kamafile
   # or wherever your nginx config is located
   ```

2. **In the HTTPS server block (port 443)**, add this location block **BEFORE** the `location /` block:
   ```nginx
   # Health endpoint - MUST come before root location
   location /health {
       proxy_pass http://localhost:8001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

3. **Verify the order** - Your HTTPS server block should look like this:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name dev.kamafile.com;
       
       # ... SSL config ...
       
       # Health endpoint (FIRST - most specific)
       location /health {
           proxy_pass http://localhost:8001;
           # ... headers ...
       }
       
       # API endpoints
       location /api {
           proxy_pass http://localhost:8001;
           # ... headers ...
       }
       
       # Frontend static files (LAST - catch-all)
       location / {
           root /var/www/kamafile/frontend/build;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Test the configuration**:
   ```bash
   sudo nginx -t
   ```

5. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

6. **Verify it works**:
   ```bash
   curl https://dev.kamafile.com/health
   ```
   Should return JSON like: `{"status":"healthy","database":"connected","redis":"connected"}`

## Why Order Matters
Nginx matches locations in order of specificity. If `location /` comes first, it will match `/health` and serve the frontend HTML. By placing `/health` before `/`, nginx will match the more specific route first.

