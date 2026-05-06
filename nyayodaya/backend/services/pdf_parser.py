import fitz  # PyMuPDF
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def parse_pdf(pdf_bytes: bytes) -> dict:
    """
    Extract text and metadata from judgment PDF.
    Returns dict with: text, pages, is_scanned, metadata, page_texts.
    Scanned detection: if avg chars per page < 100, flag as scanned.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    page_texts: list[str] = []
    total_chars = 0

    for i, page in enumerate(doc):
        text = page.get_text("text")
        # Add page markers to help LLM track location
        page_texts.append(f"--- PAGE {i+1} ---\n{text}")
        total_chars += len(text)

    num_pages = len(doc)
    avg_chars_per_page = total_chars / num_pages if num_pages > 0 else 0
    is_scanned = avg_chars_per_page < 100

    full_text = "\n\n".join(page_texts)

    metadata = doc.metadata or {}

    doc.close()

    if is_scanned:
        logger.warning(
            f"PDF appears to be scanned (avg {avg_chars_per_page:.1f} chars/page). "
            "OCR not available — extraction quality may be limited."
        )

    return {
        "text": full_text,
        "pages": num_pages,
        "is_scanned": is_scanned,
        "avg_chars_per_page": avg_chars_per_page,
        "metadata": {
            "title": metadata.get("title", ""),
            "author": metadata.get("author", ""),
            "subject": metadata.get("subject", ""),
            "creator": metadata.get("creator", ""),
            "producer": metadata.get("producer", ""),
        },
        "page_texts": page_texts,
        "total_chars": total_chars,
    }


def extract_text_for_ai(parsed: dict, max_chars: int = 180_000) -> dict:
    """
    Prepare extracted text for AI consumption.
    Truncates to max_chars with a notice if needed.
    Returns dict with 'text', 'is_fully_read', 'pages_read', 'total_pages'.
    """
    text = parsed["text"]
    total_pages = parsed["pages"]
    is_fully_read = True
    pages_read = total_pages

    if len(text) > max_chars:
        is_fully_read = False
        truncation_notice = (
            f"\n\n[NOTE: Document truncated from {len(text)} to {max_chars} characters "
            "due to length limits. The operative order paragraphs are typically near the end.]\n\n"
        )
        # Keep the end of the document (where operative orders usually appear)
        # and some from the beginning (case header)
        head_chars = max_chars // 3
        tail_chars = max_chars * 2 // 3
        
        head = text[:head_chars]
        tail = text[-tail_chars:]
        text = head + truncation_notice + tail

        # Estimate pages read (very rough)
        # In a better implementation, we'd check which PAGE markers are still in the text
        pages_read = text.count("--- PAGE ")

    return {
        "text": text,
        "is_fully_read": is_fully_read,
        "pages_read": pages_read,
        "total_pages": total_pages
    }


def annotate_pdf_with_citations(pdf_bytes: bytes, source_paragraphs: dict) -> bytes:
    """
    Add visible highlights and citations to the PDF based on extracted source paragraphs.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Mapping of field names to display names and colors
    fields = {
        "case_number": ("Case Number", (0, 0, 1)), # Blue
        "department": ("Respondent", (0, 0.5, 0)), # Green
        "directive": ("Directive", (1, 0, 0)), # Red
        "deadline": ("Deadline", (1, 0.5, 0)), # Orange
    }

    for field, (label, color) in fields.items():
        text_to_find = source_paragraphs.get(field)
        page_idx = source_paragraphs.get(f"{field}_page")
        
        if not text_to_find:
            continue
            
        # If we have a page number, search only that page (1-indexed to 0-indexed)
        search_pages = [doc[page_idx - 1]] if page_idx and 0 < page_idx <= len(doc) else doc
        
        found = False
        for page in search_pages:
            # Search for the text
            # We use a subset of the text if it's too long to improve match reliability
            search_query = text_to_find[:100] if len(text_to_find) > 100 else text_to_find
            inst = page.search_for(search_query)
            
            for rect in inst:
                # Add highlight
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=color)
                annot.update()
                
                # Add a text label near the highlight
                page.insert_text(
                    fitz.Point(rect.x1 + 5, rect.y0),
                    f"← {label}",
                    fontsize=8,
                    color=color
                )
                found = True
            
            if found:
                break

    output_bytes = doc.write()
    doc.close()
    return output_bytes
