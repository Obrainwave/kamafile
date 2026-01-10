"""
Metadata Extraction Service
Extracts law name, year, authority from document titles and content
"""
import re
import logging
from typing import Dict, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


def clean_filename_to_law_name(filename: str) -> str:
    """
    Clean filename to extract proper law name
    
    Examples:
        "Personal-Income-Tax-Act base.pdf" -> "Personal Income Tax Act"
        "VAT_Act_2023.pdf" -> "VAT Act"
        "NIGERIA-REVENUE-SERVICE-(ESTABLISHMENT)-ACT-2025.pdf" -> "Nigeria Revenue Service (Establishment) Act"
    """
    if not filename:
        return "Unknown Law"
    
    # Remove file extension
    name = Path(filename).stem
    
    # Replace common separators with spaces
    name = re.sub(r'[-_]', ' ', name)
    
    # Remove common file suffixes/descriptors
    name = re.sub(r'\s+base\s*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+copy\s*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+\(\d+\)\s*$', '', name)  # Remove trailing (1), (2), etc.
    
    # Remove years from filename (we'll extract them separately)
    name = re.sub(r'\b(19|20)\d{2}\b', '', name)
    
    # Clean up multiple spaces
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Title case for readability (but preserve acronyms and proper names)
    # Split by words, capitalize first letter of each word unless it's an acronym
    words = name.split()
    cleaned_words = []
    for i, word in enumerate(words):
        # Check for parentheses FIRST (before other checks)
        if '(' in word and ')' in word:
            # Handle words like "(ESTABLISHMENT)" -> "(Establishment)"
            before_paren = word[:word.index('(')]
            in_paren = word[word.index('(')+1:word.index(')')]
            after_paren = word[word.index(')')+1:]
            # Title case content inside parentheses
            if in_paren and len(in_paren) > 0:
                # If all caps and > 3 chars, title case; if 2-3 chars, might be acronym
                if in_paren.isupper() and len(in_paren) <= 3:
                    cleaned_in_paren = in_paren  # Keep acronym as-is
                else:
                    cleaned_in_paren = in_paren[0].upper() + in_paren[1:].lower()
            else:
                cleaned_in_paren = in_paren
            # Handle before and after parentheses (title case them)
            cleaned_before = before_paren.title() if before_paren else ''
            cleaned_after = after_paren.title() if after_paren else ''
            result = cleaned_before + '(' + cleaned_in_paren + ')' + cleaned_after
            cleaned_words.append(result if result.strip() else word.title())
        # If word is all caps and > 3 chars, title case it (likely a proper name in caps)
        elif word.isupper() and len(word) > 3:
            # Title case: first letter upper, rest lower
            cleaned_words.append(word.capitalize())
        # If word is all caps and 2-3 chars, it might be an acronym (keep as-is for now)
        elif word.isupper() and len(word) <= 3:
            cleaned_words.append(word)
        else:
            # Title case the word
            cleaned_words.append(word.title())
    
    name = ' '.join(cleaned_words)
    
    # Common law name patterns - ensure proper formatting
    name = re.sub(r'\bact\b', 'Act', name, flags=re.IGNORECASE)  # Ensure "Act" is capitalized
    name = re.sub(r'\blaw\b', 'Law', name, flags=re.IGNORECASE)  # Ensure "Law" is capitalized
    name = re.sub(r'\bAct\s+No\.?\s*(\d+)', r'Act No. \1', name, flags=re.IGNORECASE)
    name = re.sub(r'\bC(?:hap|HAP)\s*\.?\s*(\w+)', r'C\1', name)  # C. 2004 -> C2004
    
    # Fix acronyms that should be all caps (VAT, PAYE, CIT, WHT, FIRS, etc.)
    common_acronyms = ['VAT', 'PAYE', 'CIT', 'WHT', 'FIRS', 'LIRS', 'AGIS', 'TIN', 'PIT']
    words = name.split()
    fixed_words = []
    for word in words:
        # If word matches a common acronym (case-insensitive), make it uppercase
        if any(word.upper() == acronym for acronym in common_acronyms):
            fixed_words.append(word.upper())
        else:
            fixed_words.append(word)
    name = ' '.join(fixed_words)
    
    # Remove leading/trailing special characters
    name = re.sub(r'^[^\w]+|[^\w]+$', '', name)
    
    return name if name else "Unknown Law"


def extract_year_from_title(title: str) -> Optional[int]:
    """Extract year from title (e.g., 'VAT Act 2023' -> 2023)"""
    year_match = re.search(r'\b(19|20)\d{2}\b', title)
    if year_match:
        try:
            return int(year_match.group())
        except ValueError:
            pass
    return None


def extract_law_name_from_content(text_content: str, title: str) -> str:
    """
    Try to extract law name from document content
    Looks for common patterns like:
    - "Personal Income Tax Act"
    - "An Act to..." 
    - Title at beginning of document
    """
    if not text_content:
        return clean_filename_to_law_name(title)
    
    # Look for "An Act to" or "A Law to" pattern at beginning (common in Nigerian laws)
    act_pattern = r'(?:An\s+Act|A\s+Law)\s+to\s+(?:[^\n]{0,200}?)(?:,\s+)?(?:the\s+)?(?:Nigeria\s+)?([A-Z][A-Za-z\s&,()-]+?Act|Law)(?:\s+No\.?\s*\d+)?'
    match = re.search(act_pattern, text_content[:2000], re.IGNORECASE | re.MULTILINE)
    if match:
        law_name = match.group(1).strip()
        # Clean up the extracted name
        law_name = re.sub(r'\s+', ' ', law_name)
        # Remove common trailing words
        law_name = re.sub(r'\s+(Act|Law)(?:\s+No\.?\s*\d+)?\s*$', r' \1', law_name, flags=re.IGNORECASE)
        if len(law_name) > 10:  # Ensure we got a reasonable name
            logger.info(f"Extracted law name from content: {law_name}")
            return law_name
    
    # Look for title in first few lines (common pattern: title on first line)
    first_lines = text_content[:1000].split('\n')[:10]
    for line in first_lines:
        line = line.strip()
        # If line contains "Act" or "Law" and is reasonably long, it might be the title
        if ('Act' in line or 'Law' in line) and 20 < len(line) < 200 and not line.startswith('Section'):
            # Clean up the line
            potential_title = re.sub(r'^(?:An\s+Act|A\s+Law)\s+to\s+', '', line, flags=re.IGNORECASE)
            potential_title = re.sub(r'\s+', ' ', potential_title).strip()
            if potential_title and len(potential_title) > 15:
                logger.info(f"Extracted potential law name from first lines: {potential_title[:100]}")
                return potential_title[:100]  # Limit length
    
    # Fallback to cleaned filename
    return clean_filename_to_law_name(title)


def extract_metadata_from_document(
    title: str,
    file_name: Optional[str] = None,
    text_content: Optional[str] = None
) -> Dict[str, any]:
    """
    Extract metadata (law_name, year, authority) from document title, filename, and content
    
    Priority:
    1. Try to extract from document content (most accurate)
    2. Clean filename/title (fallback)
    3. Extract year from title
    """
    # Use filename if provided, otherwise use title
    source_name = file_name if file_name else title
    
    # Try to extract law name from content first (most accurate)
    if text_content and len(text_content.strip()) > 100:
        law_name = extract_law_name_from_content(text_content, source_name)
    else:
        # Fallback to cleaning filename/title
        law_name = clean_filename_to_law_name(source_name)
    
    # Extract year from title (can appear in filename or title)
    year = extract_year_from_title(title)
    if not year and file_name:
        year = extract_year_from_title(file_name)
    
    # Default authority (can be enhanced later)
    authority = "Federal Inland Revenue Service"
    
    # Try to detect authority from content
    if text_content:
        authority_keywords = {
            "Federal Inland Revenue Service": ["FIRS", "Federal Inland Revenue"],
            "Lagos State Internal Revenue Service": ["LIRS", "Lagos State"],
            "Abuja Geographic Information Systems": ["AGIS"],
        }
        
        text_upper = text_content.upper()
        for auth, keywords in authority_keywords.items():
            if any(keyword.upper() in text_upper for keyword in keywords):
                authority = auth
                break
    
    return {
        "law_name": law_name,
        "year": year,
        "authority": authority,
    }
