import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from sqlalchemy import text
from database import engine


async def add_admin_columns():
    """Add admin-related columns to users table and create admin_logs table"""
    async with engine.begin() as conn:
        try:
            # Add new columns to users table
            print("Adding role column...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
            """))
            
            print("Adding permissions column...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS permissions JSON
            """))
            
            print("Adding last_login column...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE
            """))
            
            print("Adding login_count column...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0
            """))
            
            # Create indexes
            print("Creating indexes...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_role ON users(role)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active)
            """))
            
            # Create admin_logs table
            print("Creating admin_logs table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS admin_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    admin_id UUID NOT NULL REFERENCES users(id),
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_id VARCHAR(100),
                    details JSON,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create indexes for admin_logs
            print("Creating indexes for admin_logs...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_admin_logs_admin_id ON admin_logs(admin_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_admin_logs_action ON admin_logs(action)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_admin_logs_resource_type ON admin_logs(resource_type)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_admin_logs_created_at ON admin_logs(created_at)
            """))
            
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(add_admin_columns())
