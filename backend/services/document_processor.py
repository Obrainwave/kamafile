"""
Document Processing Pipeline
Converts documents to structured Markdown with YAML front-matter
Implements legal section-based chunking (one section per chunk)
"""
import re
import yaml
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


def extract_yaml_frontmatter(markdown_content: str) -> tuple:
    """
    Extract YAML front-matter from Markdown document
    
    Returns:
        (metadata_dict, content_without_frontmatter)
    """
    # Match YAML front-matter between --- markers
    pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(pattern, markdown_content, re.DOTALL)
    
    if match:
        yaml_content = match.group(1)
        markdown_body = match.group(2)
        try:
            metadata = yaml.safe_load(yaml_content) or {}
            return metadata, markdown_body
        except yaml.YAMLError as e:
            logger.warning(f"Error parsing YAML front-matter: {e}")
            return {}, markdown_content
    else:
        return {}, markdown_content


def create_yaml_frontmatter(
    law_name: str,
    year: Optional[int] = None,
    authority: Optional[str] = None,
    jurisdiction: str = "Nigeria",
    document_type: str = "legal_act",
    version: str = "1.0"
) -> str:
    """Create YAML front-matter for legal document"""
    metadata = {
        "law_name": law_name,
        "jurisdiction": jurisdiction,
        "document_type": document_type,
        "version": version,
        "processed_at": datetime.utcnow().isoformat()
    }
    
    if year:
        metadata["year"] = year
    if authority:
        metadata["authority"] = authority
    
    yaml_str = yaml.dump(metadata, default_flow_style=False, sort_keys=False)
    return f"---\n{yaml_str}---\n"


def chunk_by_legal_sections(markdown_content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Chunk document by legal sections
    Each chunk = one complete legal section (## Section X – Title)
    
    Fallback strategies if sections not found:
    1. Split by paragraphs (double newlines)
    2. Split by sentences with max chunk size
    3. Last resort: split by fixed size
    
    This is the critical chunking strategy: never split a legal section
    """
    chunks = []
    
    # Pattern 1: Markdown headers (## Section X – Title)
    section_pattern_md = r'^##\s+(Section|Part|Chapter|Article)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+?)$'
    
    # Pattern 2: Plain text section headers (without Markdown ##)
    # Matches: "Section 1", "PART I", "Chapter 1 – Title", "Article 5: Title", etc.
    section_patterns_plain = [
        r'^(Section|SECTION)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+?)$',
        r'^(Section|SECTION)\s+(\d+[A-Za-z]?)$',  # Section 1 (no title)
        r'^(Part|PART)\s+([IVX]+|\d+)\s*[–:\-]\s*(.+?)$',
        r'^(Part|PART)\s+([IVX]+|\d+)$',  # Part I (no title)
        r'^(Chapter|CHAPTER)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+?)$',
        r'^(Chapter|CHAPTER)\s+(\d+[A-Za-z]?)$',
        r'^(Article|ARTICLE)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+?)$',
        r'^(Article|ARTICLE)\s+(\d+[A-Za-z]?)$',
        r'^(\d+)\s*[\.\)]\s*(.+?)$',  # "1. Title" or "1) Title" (numbered sections)
    ]
    
    lines = markdown_content.split('\n')
    current_section = None
    current_content = []
    current_section_title = None
    current_section_number = None
    section_found = False
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            if current_content:
                current_content.append(line)  # Preserve blank lines
            continue
        
        # Check if this line is a Markdown section header
        match_md = re.match(section_pattern_md, line, re.IGNORECASE)
        match_plain = None
        
        # Check plain text patterns if Markdown pattern didn't match
        if not match_md:
            for pattern in section_patterns_plain:
                match_plain = re.match(pattern, line_stripped, re.IGNORECASE)
                if match_plain:
                    break
        
        match = match_md or match_plain
        
        if match:
            section_found = True
            # Save previous section if it exists
            if current_section and current_content:
                section_text = '\n'.join(current_content).strip()
                if section_text and len(section_text) > 10:  # Minimum chunk size
                    chunks.append({
                        'chunk_id': str(uuid.uuid4()),
                        'text': section_text,
                        'metadata': {
                            **metadata,
                            'section_type': current_section,
                            'section_number': current_section_number,
                            'section_title': current_section_title,
                            'chunk_type': 'legal_section'
                        }
                    })
            
            # Start new section
            if match_md:
                current_section = match.group(1)
                current_section_number = match.group(2)
                current_section_title = match.group(3).strip() if len(match.groups()) >= 3 else None
            elif match_plain:
                groups = match.groups()
                # Determine section type from first group
                first_group_lower = groups[0].lower() if groups else ''
                if first_group_lower in ['section']:
                    current_section = 'Section'
                    current_section_number = groups[1] if len(groups) > 1 else None
                    current_section_title = groups[-1].strip() if len(groups) > 2 and groups[-1] else None
                elif first_group_lower in ['part']:
                    current_section = 'Part'
                    current_section_number = groups[1] if len(groups) > 1 else None
                    current_section_title = groups[-1].strip() if len(groups) > 2 and groups[-1] else None
                elif first_group_lower in ['chapter']:
                    current_section = 'Chapter'
                    current_section_number = groups[1] if len(groups) > 1 else None
                    current_section_title = groups[-1].strip() if len(groups) > 2 and groups[-1] else None
                elif first_group_lower in ['article']:
                    current_section = 'Article'
                    current_section_number = groups[1] if len(groups) > 1 else None
                    current_section_title = groups[-1].strip() if len(groups) > 2 and groups[-1] else None
                else:
                    # Numbered section pattern (e.g., "1. Title") - first group is the number
                    # Pattern: r'^(\d+)\s*[\.\)]\s*(.+?)$'
                    current_section = 'Section'
                    current_section_number = groups[0]
                    current_section_title = groups[-1].strip() if len(groups) > 1 and groups[-1] else None
            
            current_content = [line]  # Include the header in content
        else:
            # Add line to current section
            if current_section:
                current_content.append(line)
            else:
                # Content before first section (preamble)
                if not chunks or chunks[-1].get('metadata', {}).get('chunk_type') != 'preamble':
                    chunks.append({
                        'chunk_id': str(uuid.uuid4()),
                        'text': line,
                        'metadata': {
                            **metadata,
                            'chunk_type': 'preamble'
                        }
                    })
                else:
                    chunks[-1]['text'] += '\n' + line
    
    # Save last section
    if current_section and current_content:
        section_text = '\n'.join(current_content).strip()
        if section_text and len(section_text) > 10:  # Minimum chunk size
            chunks.append({
                'chunk_id': str(uuid.uuid4()),
                'text': section_text,
                'metadata': {
                    **metadata,
                    'section_type': current_section,
                    'section_number': current_section_number,
                    'section_title': current_section_title,
                    'chunk_type': 'legal_section'
                }
            })
    
    # If no sections found, use fallback chunking strategies
    if not section_found or not chunks:
        logger.warning(f"No legal sections detected. Using fallback chunking strategy for document: {metadata.get('law_name', 'Unknown')}")
        
        # Fallback 1: Split by paragraphs (double newlines)
        paragraphs = re.split(r'\n\s*\n+', markdown_content.strip())
        paragraphs = [p.strip() for p in paragraphs if p.strip() and len(p.strip()) > 20]  # Min 20 chars
        
        if len(paragraphs) > 1:
            logger.info(f"Split into {len(paragraphs)} paragraph-based chunks")
            chunks = []
            for i, para in enumerate(paragraphs):
                chunks.append({
                    'chunk_id': str(uuid.uuid4()),
                    'text': para,
                    'metadata': {
                        **metadata,
                        'chunk_type': 'paragraph',
                        'chunk_index': i + 1,
                        'total_chunks': len(paragraphs)
                    }
                })
        else:
            # Fallback 2: Split by sentences with max chunk size (2000 chars)
            text = markdown_content.strip()
            if len(text) > 2000:
                # Split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', text)
                current_chunk = []
                current_size = 0
                chunk_index = 1
                max_chunk_size = 2000
                
                for sentence in sentences:
                    sentence_len = len(sentence)
                    if current_size + sentence_len > max_chunk_size and current_chunk:
                        # Save current chunk
                        chunks.append({
                            'chunk_id': str(uuid.uuid4()),
                            'text': ' '.join(current_chunk),
                            'metadata': {
                                **metadata,
                                'chunk_type': 'sentence_based',
                                'chunk_index': chunk_index
                            }
                        })
                        current_chunk = [sentence]
                        current_size = sentence_len
                        chunk_index += 1
                    else:
                        current_chunk.append(sentence)
                        current_size += sentence_len
                
                # Save last chunk
                if current_chunk:
                    chunks.append({
                        'chunk_id': str(uuid.uuid4()),
                        'text': ' '.join(current_chunk),
                        'metadata': {
                            **metadata,
                            'chunk_type': 'sentence_based',
                            'chunk_index': chunk_index
                        }
                    })
                
                logger.info(f"Split into {len(chunks)} sentence-based chunks (max size: {max_chunk_size} chars)")
            else:
                # Fallback 3: For large documents, always split by size even if no structure found
                text = markdown_content.strip()
                if len(text) > 1000:  # If document is > 1k chars, split it
                    # Split by sentences with max chunk size
                    sentences = re.split(r'(?<=[.!?])\s+', text)
                    current_chunk = []
                    current_size = 0
                    chunk_index = 1
                    max_chunk_size = 2000
                    
                    chunks = []
                    for sentence in sentences:
                        sentence_len = len(sentence)
                        if current_size + sentence_len > max_chunk_size and current_chunk:
                            chunks.append({
                                'chunk_id': str(uuid.uuid4()),
                                'text': ' '.join(current_chunk),
                                'metadata': {
                                    **metadata,
                                    'chunk_type': 'size_split_fallback',
                                    'chunk_index': chunk_index
                                }
                            })
                            current_chunk = [sentence]
                            current_size = sentence_len
                            chunk_index += 1
                        else:
                            current_chunk.append(sentence)
                            current_size += sentence_len
                    
                    # Save last chunk
                    if current_chunk:
                        chunks.append({
                            'chunk_id': str(uuid.uuid4()),
                            'text': ' '.join(current_chunk),
                            'metadata': {
                                **metadata,
                                'chunk_type': 'size_split_fallback',
                                'chunk_index': chunk_index
                            }
                        })
                    
                    if len(chunks) > 1:
                        logger.info(f"Split large unstructured document into {len(chunks)} size-based chunks")
                    else:
                        # Still single chunk (very small document or no sentence breaks)
                        chunks = [{
                            'chunk_id': str(uuid.uuid4()),
                            'text': text,
                            'metadata': {
                                **metadata,
                                'chunk_type': 'full_document',
                                'warning': 'Document too small or no sentence breaks for chunking'
                            }
                        }]
                else:
                    # Fallback 3: Single chunk (last resort - very small document)
                    logger.warning(f"Document too short ({len(text)} chars). Creating single chunk")
                    chunks = [{
                        'chunk_id': str(uuid.uuid4()),
                        'text': text,
                        'metadata': {
                            **metadata,
                            'chunk_type': 'full_document',
                            'warning': 'Very small document - chunked as single unit'
                        }
                    }]
    
    # CRITICAL: If we have chunks but the document is very large, ensure we split it further
    # Even if sections were detected, large single-section documents must be split
    total_text_length = len(markdown_content.strip())
    max_chunk_size = 2000  # Maximum characters per chunk
    min_chunks_for_large_doc = 10  # Minimum chunks for documents > 20k chars
    
    # If document is very large (> 20k chars) but has few chunks, force splitting
    if total_text_length > 20000 and len(chunks) < min_chunks_for_large_doc:
        logger.warning(f"Large document ({total_text_length} chars) has only {len(chunks)} chunks. Force splitting by size...")
        # Re-split all chunks by size
        new_chunks = []
        for chunk in chunks:
            chunk_text = chunk['text']
            if len(chunk_text) > max_chunk_size:
                # Split this chunk by sentences
                sentences = re.split(r'(?<=[.!?])\s+', chunk_text)
                current_chunk_text = []
                current_size = 0
                chunk_index = 1
                
                for sentence in sentences:
                    sentence_len = len(sentence)
                    if current_size + sentence_len > max_chunk_size and current_chunk_text:
                        # Save current chunk
                        new_chunks.append({
                            'chunk_id': str(uuid.uuid4()),
                            'text': ' '.join(current_chunk_text),
                            'metadata': {
                                **chunk['metadata'],
                                'chunk_type': 'size_split',
                                'original_chunk_type': chunk['metadata'].get('chunk_type', 'unknown'),
                                'chunk_index': chunk_index,
                                'split_from_large_chunk': True
                            }
                        })
                        current_chunk_text = [sentence]
                        current_size = sentence_len
                        chunk_index += 1
                    else:
                        current_chunk_text.append(sentence)
                        current_size += sentence_len
                
                # Save last chunk from this split
                if current_chunk_text:
                    new_chunks.append({
                        'chunk_id': str(uuid.uuid4()),
                        'text': ' '.join(current_chunk_text),
                        'metadata': {
                            **chunk['metadata'],
                            'chunk_type': 'size_split',
                            'original_chunk_type': chunk['metadata'].get('chunk_type', 'unknown'),
                            'chunk_index': chunk_index,
                            'split_from_large_chunk': True
                        }
                    })
            else:
                # Keep small chunks as-is
                new_chunks.append(chunk)
        
        chunks = new_chunks
        logger.info(f"Force-split large document into {len(chunks)} chunks")
    
    # Also check: if any single chunk is too large, split it
    final_chunks = []
    for chunk in chunks:
        chunk_text = chunk['text']
        if len(chunk_text) > max_chunk_size:
            # Split this chunk by sentences
            sentences = re.split(r'(?<=[.!?])\s+', chunk_text)
            current_chunk_text = []
            current_size = 0
            split_index = 1
            
            for sentence in sentences:
                sentence_len = len(sentence)
                if current_size + sentence_len > max_chunk_size and current_chunk_text:
                    # Save current chunk
                    final_chunks.append({
                        'chunk_id': str(uuid.uuid4()),
                        'text': ' '.join(current_chunk_text),
                        'metadata': {
                            **chunk['metadata'],
                            'chunk_type': 'size_split',
                            'original_chunk_type': chunk['metadata'].get('chunk_type', 'unknown'),
                            'split_index': split_index
                        }
                    })
                    current_chunk_text = [sentence]
                    current_size = sentence_len
                    split_index += 1
                else:
                    current_chunk_text.append(sentence)
                    current_size += sentence_len
            
            # Save last chunk from this split
            if current_chunk_text:
                final_chunks.append({
                    'chunk_id': str(uuid.uuid4()),
                    'text': ' '.join(current_chunk_text),
                    'metadata': {
                        **chunk['metadata'],
                        'chunk_type': 'size_split',
                        'original_chunk_type': chunk['metadata'].get('chunk_type', 'unknown'),
                        'split_index': split_index
                    }
                })
        else:
            # Keep small chunks as-is
            final_chunks.append(chunk)
    
    chunks = final_chunks
    
    # Clean up: merge very small chunks (< 50 chars) with previous chunk
    if len(chunks) > 1:
        cleaned_chunks = []
        for chunk in chunks:
            if len(chunk['text'].strip()) < 50 and cleaned_chunks:
                # Merge with previous chunk
                cleaned_chunks[-1]['text'] += '\n\n' + chunk['text']
            else:
                cleaned_chunks.append(chunk)
        chunks = cleaned_chunks
    
    # Final safety check: if document is large (> 10k chars) but still only 1 chunk, force split
    if total_text_length > 10000 and len(chunks) == 1:
        logger.warning(f"CRITICAL: Large document ({total_text_length} chars) still has only 1 chunk! Force splitting...")
        text = chunks[0]['text']
        sentences = re.split(r'(?<=[.!?])\s+', text)
        current_chunk_text = []
        current_size = 0
        chunk_index = 1
        max_chunk_size = 1500  # Slightly smaller for safety
        
        chunks = []
        for sentence in sentences:
            sentence_len = len(sentence)
            if current_size + sentence_len > max_chunk_size and current_chunk_text:
                chunks.append({
                    'chunk_id': str(uuid.uuid4()),
                    'text': ' '.join(current_chunk_text),
                    'metadata': {
                        **metadata,
                        'chunk_type': 'force_split',
                        'chunk_index': chunk_index,
                        'warning': 'Large document force-split by size'
                    }
                })
                current_chunk_text = [sentence]
                current_size = sentence_len
                chunk_index += 1
            else:
                current_chunk_text.append(sentence)
                current_size += sentence_len
        
        # Save last chunk
        if current_chunk_text:
            chunks.append({
                'chunk_id': str(uuid.uuid4()),
                'text': ' '.join(current_chunk_text),
                'metadata': {
                    **metadata,
                    'chunk_type': 'force_split',
                    'chunk_index': chunk_index,
                    'warning': 'Large document force-split by size'
                }
            })
        
        logger.info(f"Force-split single chunk into {len(chunks)} chunks")
    
    logger.info(f"Generated {len(chunks)} chunks for document: {metadata.get('law_name', 'Unknown')} ({total_text_length} chars)")
    return chunks


def process_text_to_markdown(
    text_content: str,
    law_name: str,
    year: Optional[int] = None,
    authority: Optional[str] = None,
    jurisdiction: str = "Nigeria"
) -> str:
    """
    Convert raw text to structured Markdown with YAML front-matter
    This is where OCR output or extracted text gets structured
    """
    # Create YAML front-matter
    frontmatter = create_yaml_frontmatter(
        law_name=law_name,
        year=year,
        authority=authority,
        jurisdiction=jurisdiction
    )
    
    # Basic text cleaning and formatting
    # Remove excessive whitespace
    text_content = re.sub(r'\n{3,}', '\n\n', text_content)
    text_content = text_content.strip()
    
    # Try to detect and format section headers
    # Common patterns: "Section 1", "PART I", "Chapter 1", etc.
    section_patterns = [
        (r'^(Section|SECTION)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+)$', '## Section {num} – {title}'),
        (r'^(Part|PART)\s+([IVX]+|\d+)\s*[–:\-]\s*(.+)$', '## Part {num} – {title}'),
        (r'^(Chapter|CHAPTER)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+)$', '## Chapter {num} – {title}'),
        (r'^(Article|ARTICLE)\s+(\d+[A-Za-z]?)\s*[–:\-]\s*(.+)$', '## Article {num} – {title}'),
    ]
    
    lines = text_content.split('\n')
    formatted_lines = []
    
    for line in lines:
        formatted = False
        for pattern, template in section_patterns:
            match = re.match(pattern, line.strip())
            if match:
                section_type = match.group(1)
                number = match.group(2)
                title = match.group(3).strip()
                formatted_line = template.format(num=number, title=title)
                formatted_lines.append(formatted_line)
                formatted = True
                break
        
        if not formatted:
            formatted_lines.append(line)
    
    markdown_body = '\n'.join(formatted_lines)
    
    # Combine front-matter and body
    return frontmatter + markdown_body


def process_document_for_rag(
    text_content: str,
    law_name: str,
    year: Optional[int] = None,
    authority: Optional[str] = None,
    jurisdiction: str = "Nigeria"
) -> tuple[str, List[Dict[str, Any]]]:
    """
    Complete pipeline: Convert text → Markdown → Chunks
    
    Returns:
        (markdown_content, chunks_list)
    """
    # Step 1: Convert to structured Markdown
    markdown_content = process_text_to_markdown(
        text_content=text_content,
        law_name=law_name,
        year=year,
        authority=authority,
        jurisdiction=jurisdiction
    )
    
    # Step 2: Extract metadata
    metadata, markdown_body = extract_yaml_frontmatter(markdown_content)
    
    # Step 3: Chunk by legal sections
    chunks = chunk_by_legal_sections(markdown_body, metadata)
    
    return markdown_content, chunks
