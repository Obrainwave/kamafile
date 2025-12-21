# How to Create an Admin User

This guide explains how to create an admin user account for the Kamafile application after deployment.

## Prerequisites

- Backend service is running (either in Docker or locally)
- Database is accessible
- Python environment is set up (if running locally)

## Method 1: Using the Admin Creation Script (Recommended)

### For Docker Deployment

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the admin creation script inside the Docker container:**
   ```bash
   docker exec -it kamafile_backend python scripts/create_admin.py
   ```

   Or if you need to run it with a custom email/password:
   ```bash
   docker exec -it kamafile_backend python -c "
   import asyncio
   import sys
   sys.path.insert(0, '/app')
   from database import AsyncSessionLocal
   from models import User
   from auth import get_password_hash
   from sqlalchemy import select
   
   async def create_admin():
       async with AsyncSessionLocal() as db:
           email = 'admin@kamafile.com'  # Change this
           password = 'YourSecurePassword123!'  # Change this
           
           result = await db.execute(select(User).where(User.email == email))
           if result.scalar_one_or_none():
               print(f'Admin with email {email} already exists!')
               return
           
           admin = User(
               email=email,
               full_name='Admin User',
               hashed_password=get_password_hash(password),
               role='super_admin',
               is_active=True,
               is_verified=True
           )
           db.add(admin)
           await db.commit()
           print(f'Admin created successfully!')
           print(f'Email: {email}')
           print(f'Password: {password}')
   
   asyncio.run(create_admin())
   "
   ```

### For Local Deployment

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate your virtual environment (if using one):**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Run the admin creation script:**
   ```bash
   python scripts/create_admin.py
   ```

4. **Default credentials created:**
   - **Email:** `super@kamafile.com`
   - **Password:** `123456`
   - **Role:** `super_admin`

   ⚠️ **IMPORTANT:** Change the default password immediately after first login!

## Method 2: Create Admin via Python Shell

### For Docker

```bash
docker exec -it kamafile_backend python
```

Then in the Python shell:
```python
import asyncio
import sys
sys.path.insert(0, '/app')
from database import AsyncSessionLocal
from models import User
from auth import get_password_hash
from sqlalchemy import select

async def create_admin():
    async with AsyncSessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == "admin@kamafile.com"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Admin already exists!")
            return
        
        # Create admin
        admin = User(
            email="admin@kamafile.com",
            full_name="Admin User",
            hashed_password=get_password_hash("YourSecurePassword123!"),
            role="super_admin",
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        await db.commit()
        print("Admin created successfully!")
        print(f"Email: admin@kamafile.com")
        print(f"Password: YourSecurePassword123!")

asyncio.run(create_admin())
```

### For Local

```bash
cd backend
python
```

Then use the same Python code as above (but without the `/app` path).

## Method 3: Create Admin via Database Directly (Advanced)

If you have direct database access, you can create an admin user using SQL:

```sql
-- First, generate a password hash (use Python or the auth module)
-- Then insert the admin user:

INSERT INTO users (
    id,
    email,
    full_name,
    hashed_password,
    role,
    is_active,
    is_verified,
    created_at
) VALUES (
    gen_random_uuid(),
    'admin@kamafile.com',
    'Admin User',
    '$2b$12$YOUR_HASHED_PASSWORD_HERE',  -- Generate this using get_password_hash()
    'super_admin',
    true,
    true,
    NOW()
);
```

**To generate the password hash:**
```python
from auth import get_password_hash
print(get_password_hash("YourPassword123!"))
```

## Admin Roles

The system supports the following admin roles:

- **`super_admin`** - Full access to all admin features
- **`admin`** - Standard admin access
- **`moderator`** - Limited admin access
- **`support`** - Support staff access

## Verifying Admin Creation

After creating an admin user, verify it was created successfully:

### Option 1: Check via API

```bash
# Login to get a token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kamafile.com", "password": "YourPassword"}'

# Use the token to access admin endpoints
curl -X GET http://localhost:8000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Option 2: Check Database

```sql
SELECT email, full_name, role, is_active, is_verified 
FROM users 
WHERE role IN ('super_admin', 'admin', 'moderator', 'support');
```

### Option 3: Login via Web Interface

1. Navigate to: `http://your-domain/signin`
2. Enter admin email and password
3. You should be redirected to the admin dashboard

## Security Best Practices

1. **Change Default Password Immediately**
   - Never use the default password (`123456`) in production
   - Use a strong password (minimum 12 characters, mix of letters, numbers, symbols)

2. **Use Environment Variables for Sensitive Data**
   - Consider storing admin credentials in environment variables during initial setup
   - Never commit admin credentials to version control

3. **Enable Two-Factor Authentication (Future Enhancement)**
   - Consider implementing 2FA for admin accounts

4. **Limit Admin Access**
   - Only create admin accounts for trusted personnel
   - Regularly audit admin user list
   - Deactivate unused admin accounts

5. **Secure Admin Endpoints**
   - Ensure admin endpoints are only accessible to authenticated admin users
   - Use HTTPS in production
   - Consider IP whitelisting for admin access (future enhancement)

## Troubleshooting

### Issue: "Admin user already exists"
**Solution:** The email you're trying to use is already registered. Either:
- Use a different email
- Update the existing user's role to `super_admin`:
  ```python
  # In Python shell
  from database import AsyncSessionLocal
  from models import User
  from sqlalchemy import select
  
  async def update_to_admin():
      async with AsyncSessionLocal() as db:
          result = await db.execute(select(User).where(User.email == "existing@email.com"))
          user = result.scalar_one_or_none()
          if user:
              user.role = "super_admin"
              await db.commit()
              print("User updated to super_admin")
  
  asyncio.run(update_to_admin())
  ```

### Issue: "Module not found" or import errors
**Solution:** 
- Make sure you're running the script from the correct directory
- For Docker: Ensure you're inside the container
- For local: Ensure virtual environment is activated and dependencies are installed

### Issue: Database connection error
**Solution:**
- Verify database is running: `docker ps` (for Docker) or check PostgreSQL service
- Check `DATABASE_URL` environment variable is set correctly
- Verify database credentials in `.env` file

## Quick Reference

**Default Admin (from script):**
- Email: `super@kamafile.com`
- Password: `123456`
- Role: `super_admin`

**Create Custom Admin:**
```bash
# Docker
docker exec -it kamafile_backend python scripts/create_admin.py

# Local
cd backend && python scripts/create_admin.py
```

**Update Existing User to Admin:**
```python
# In Python shell
user.role = "super_admin"
await db.commit()
```

## Need Help?

If you encounter issues creating an admin user:
1. Check the backend logs: `docker logs kamafile_backend` (or your local logs)
2. Verify database connection
3. Ensure all migrations have been run
4. Check that the `users` table exists and has the `role` column
