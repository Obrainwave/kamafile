"""
Migration script to add document_metadata_catalog table and update rag_documents table

Run this script to apply the CSV metadata injection feature database changes.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import engine


async def upgrade():
    """Add document_metadata_catalog table and update rag_documents"""
    async with engine.begin() as conn:
        print("Creating document_metadata_catalog table...")
        
        # Create document_metadata_catalog table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS document_metadata_catalog (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                
                -- Core identification
                doc_id VARCHAR(100) UNIQUE NOT NULL,
                file_name VARCHAR(500) UNIQUE NOT NULL,
                file_name_normalized VARCHAR(500) NOT NULL,
                source_title VARCHAR(500),
                source_file_type VARCHAR(100),
                
                -- Classification
                issuing_body VARCHAR(500),
                country VARCHAR(100),
                jurisdiction_level VARCHAR(100),
                knowledge_domain VARCHAR(200),
                tax_type VARCHAR(500),
                taxpayer_type VARCHAR(500),
                doc_category VARCHAR(200),
                
                -- Temporal (all as text)
                effective_date VARCHAR(200),
                expiry_date VARCHAR(200),
                publication_date VARCHAR(200),
                version VARCHAR(200),
                
                -- Relationships
                supersedes_doc_id VARCHAR(500),
                
                -- Context
                lifecycle_stage VARCHAR(200),
                authority_level VARCHAR(200),
                intended_usage VARCHAR(1000),
                topic_tags VARCHAR(1000),
                status VARCHAR(100),
                language VARCHAR(50),
                notes TEXT,
                
                -- Metadata
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        print("Creating indexes on document_metadata_catalog...")
        
        # Create indexes
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_file_name_normalized 
            ON document_metadata_catalog(file_name_normalized)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_doc_id 
            ON document_metadata_catalog(doc_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_jurisdiction_level 
            ON document_metadata_catalog(jurisdiction_level)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_status 
            ON document_metadata_catalog(status)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_doc_category 
            ON document_metadata_catalog(doc_category)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catalog_created_at 
            ON document_metadata_catalog(created_at)
        """))
        
        print("Updating rag_documents table...")
        
        # Add new columns to rag_documents
        await conn.execute(text("""
            ALTER TABLE rag_documents 
            ADD COLUMN IF NOT EXISTS metadata_catalog_id UUID 
            REFERENCES document_metadata_catalog(id)
        """))
        
        await conn.execute(text("""
            ALTER TABLE rag_documents 
            ADD COLUMN IF NOT EXISTS metadata_status VARCHAR(50) DEFAULT 'matched'
        """))
        
        # Create indexes on new columns
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_rag_metadata_catalog_id 
            ON rag_documents(metadata_catalog_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_rag_metadata_status 
            ON rag_documents(metadata_status)
        """))
        
        print("✅ Migration completed successfully!")


async def downgrade():
    """Remove document_metadata_catalog table and rag_documents changes"""
    async with engine.begin() as conn:
        print("Removing columns from rag_documents...")
        
        # Drop foreign key constraint first
        await conn.execute(text("""
            ALTER TABLE rag_documents 
            DROP CONSTRAINT IF EXISTS rag_documents_metadata_catalog_id_fkey
        """))
        
        # Drop columns
        await conn.execute(text("""
            ALTER TABLE rag_documents 
            DROP COLUMN IF EXISTS metadata_catalog_id
        """))
        
        await conn.execute(text("""
            ALTER TABLE rag_documents 
            DROP COLUMN IF EXISTS metadata_status
        """))
        
        print("Dropping document_metadata_catalog table...")
        
        # Drop table
        await conn.execute(text("""
            DROP TABLE IF EXISTS document_metadata_catalog CASCADE
        """))
        
        print("✅ Downgrade completed successfully!")


async def main():
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        print("Running downgrade migration...")
        await downgrade()
    else:
        print("Running upgrade migration...")
        await upgrade()
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
