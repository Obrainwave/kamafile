import sys
import os
import logging
import re

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.document_processor import chunk_by_legal_sections

# Configure logging
logging.basicConfig(level=logging.INFO)

def test_chunking():
    print("\n--- Testing Parent-Child Chunking (Prose Split) ---\n")
    
    # Mock Document Content: A SINGLE long section with text that needs splitting
    # We avoid "1. " or "2. " to prevent triggering new section detection
    long_paragraph = "This is a very long sentence that should ideally be part of a larger chunk but we are testing splitting logic here. " * 20
    long_paragraph_2 = "Another long paragraph that follows the first one and adds more context to the legal provision described herein. " * 20
    
    mock_text = f"""
## Section 100 – General Provisions

{long_paragraph}

{long_paragraph_2}

Additional short paragraph.
"""
    print(f"Mock Text Length: {len(mock_text)}")
    
    metadata = {"law_name": "Test Act", "year": 2024}
    
    chunks = chunk_by_legal_sections(mock_text, metadata)
    
    print(f"\nGenerated {len(chunks)} chunks.")
    
    # Verify we have multiple chunks for this single section (due to length)
    # The section is > 2000 chars, so it should be split.
    
    parent_id_check = None
    
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i+1}:")
        print(f"  Text Preview: {chunk['text'][:50]}...")
        print(f"  Length: {len(chunk['text'])}")
        
        meta = chunk['metadata']
        
        # Check Section Info
        if meta.get('section_number') == '100':
             print("  ✅ Section Number: 100")
        else:
             print(f"  ❌ Section Number Mismatch: {meta.get('section_number')}")
             
        # Check Parent/Child
        if meta.get('is_child'):
            print("  ✅ 'is_child': True")
            if meta.get('parent_text'):
                p_len = len(meta['parent_text'])
                print(f"  ✅ 'parent_text' present (Length: {p_len})")
                
                # Verify parent text is the FULL section (approx length)
                # Our mock text is roughly len(long_paragraph) * 2 + extras
                if p_len > 2000:
                    print("  ✅ Parent text seems to be the full section (> 2000 chars)")
                else:
                    print(f"  ⚠️ Parent text might be truncated? Length: {p_len}")
            else:
                 print("  ❌ 'parent_text' MISSING")
        else:
            print("  ⚠️ 'is_child' flag MISSING")

    # Conclusion
    if len(chunks) > 1:
        print("\n✅ SUCCESS: Large section was split into multiple chunks.")
    else:
        print("\n❌ FAILURE: Large section was NOT split (returned as single chunk).")

if __name__ == "__main__":
    test_chunking()
