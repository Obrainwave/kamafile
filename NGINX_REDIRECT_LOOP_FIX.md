# Fix Nginx Redirect Loop Error

## Problem
```
rewrite or internal redirection cycle while internally redirecting to "/index.html"
```

This error occurs when nginx gets stuck in an infinite loop trying to serve `/index.html`.

## Root Causes

1. **Nested location blocks** causing conflicts
2. **Incorrect root path** - the directory doesn't exist
3. **Missing index.html** file in the build directory
4. **Incorrect try_files configuration**

## Solution

### Step 1: Verify Frontend Build Directory

```bash
# Check if the build directory exists
ls -la /var/www/kamafile/frontend/build

# Check if index.html exists
ls -la /var/www/kamafile/frontend/build/index.html

# Verify the path is correct (adjust if your path is different)
```

### Step 2: Update Nginx Configuration

Replace your root location block with this configuration:

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
    
    # API endpoints (BEFORE root)
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Set root directory once at server level
    root /var/www/kamafile/frontend/build;
    index index.html;
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # Frontend SPA - must be last location block
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 3: Key Changes

1. **Set root at server level** - prevents conflicts
2. **Removed nested location blocks** - they can cause loops
3. **Static assets location before root** - more specific matches first
4. **Simple try_files** - `$uri $uri/ /index.html` without complex fallbacks

### Step 4: Test Configuration

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

### Step 5: Verify Files Exist

```bash
# Check build directory structure
ls -la /var/www/kamafile/frontend/build/

# Should see:
# - index.html
# - js/ directory
# - assets/ or images/ directory
```

### Step 6: Check Permissions

```bash
# Ensure nginx can read the files
sudo chown -R www-data:www-data /var/www/kamafile/frontend/build
sudo chmod -R 755 /var/www/kamafile/frontend/build
```

## Alternative: If Build Path is Different

If your frontend is deployed to a different location, update the root path:

```bash
# Find where your frontend build is located
find /var/www -name "index.html" -type f 2>/dev/null
find /home -name "index.html" -type f 2>/dev/null
```

Then update the `root` directive in nginx config to match.

## Quick Fix Checklist

- [ ] Frontend build directory exists
- [ ] `index.html` exists in build directory
- [ ] Root path in nginx matches actual build location
- [ ] No nested location blocks in root location
- [ ] Root set at server level, not in location block
- [ ] Static assets location comes before root location
- [ ] Nginx config tested successfully
- [ ] Nginx reloaded
- [ ] File permissions are correct (nginx user can read)

## Still Not Working?

1. **Check nginx error log** for more details:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

2. **Check access log** to see what's being requested:
   ```bash
   sudo tail -50 /var/log/nginx/access.log
   ```

3. **Test directly** if index.html is accessible:
   ```bash
   curl -I http://localhost/index.html
   ```

4. **Verify nginx user** can access the directory:
   ```bash
   sudo -u www-data ls /var/www/kamafile/frontend/build/
   ```

