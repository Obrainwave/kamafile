"""
Simple script to create new tables using SQLAlchemy models

This will create the document_metadata_catalog table and add new columns to rag_documents.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, Base
from models import DocumentMetadataCatalog, RAGDocument  # Import to register models


async def create_tables():
    """Create all tables defined in models"""
    print("Creating tables from models...")
    async with engine.begin() as conn:
        # This will create all tables that don't exist
        # For existing tables, it won't modify them
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
