"""
Admin User Creation Script

This script creates a super admin user for the Kamafile application.

Usage:
    python scripts/create_admin.py
    
    Or with custom credentials:
    python scripts/create_admin.py --email admin@example.com --password SecurePass123!
    
    Or in Docker:
    docker exec -it kamafile_backend python scripts/create_admin.py
"""
import sys
import argparse
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import AsyncSessionLocal
from models import User
from auth import get_password_hash
import asyncio


async def create_admin(email: str = "super@kamafile.com", password: str = "123456", full_name: str = "Super Admin"):
    """
    Create an admin user
    
    Args:
        email: Admin email address
        password: Admin password (will be hashed)
        full_name: Admin full name
    """
    try:
        async with AsyncSessionLocal() as db:
            # Check if admin already exists
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.email == email))
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print("=" * 60)
                print("⚠️  Admin user already exists!")
                print(f"   Email: {existing_admin.email}")
                print(f"   Role: {existing_admin.role}")
                print(f"   Active: {existing_admin.is_active}")
                print("=" * 60)
                print("\nTo update this user to super_admin, you can:")
                print("1. Update via admin panel (if you have access)")
                print("2. Update directly in database:")
                print(f"   UPDATE users SET role = 'super_admin' WHERE email = '{email}';")
                return
            
            # Create admin user
            admin = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                role="super_admin",
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            await db.commit()
            
            print("=" * 60)
            print("✅ Admin user created successfully!")
            print("=" * 60)
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"   Full Name: {full_name}")
            print(f"   Role: super_admin")
            print("=" * 60)
            print("\n⚠️  SECURITY WARNING:")
            print("   Please change the default password immediately after first login!")
            print("   Login at: http://your-domain/signin")
            print("=" * 60)
    except Exception as e:
        print("=" * 60)
        print("❌ Error creating admin user:")
        print(f"   {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a super admin user for Kamafile")
    parser.add_argument(
        "--email",
        type=str,
        default="super@kamafile.com",
        help="Admin email address (default: super@kamafile.com)"
    )
    parser.add_argument(
        "--password",
        type=str,
        default="123456",
        help="Admin password (default: 123456 - CHANGE THIS IN PRODUCTION!)"
    )
    parser.add_argument(
        "--name",
        type=str,
        default="Super Admin",
        help="Admin full name (default: Super Admin)"
    )
    
    args = parser.parse_args()
    
    asyncio.run(create_admin(
        email=args.email,
        password=args.password,
        full_name=args.name
    ))
