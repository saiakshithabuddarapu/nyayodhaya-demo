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

    for page in doc:
        text = page.get_text("text")
        page_texts.append(text)
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


def extract_text_for_ai(parsed: dict, max_chars: int = 180_000) -> str:
    """
    Prepare extracted text for AI consumption.
    Truncates to max_chars with a notice if needed.
    """
    text = parsed["text"]

    if len(text) > max_chars:
        truncation_notice = (
            f"\n\n[NOTE: Document truncated from {len(text)} to {max_chars} characters "
            "due to length limits. The operative order paragraphs are typically near the end.]\n\n"
        )
        # Keep the end of the document (where operative orders usually appear)
        # and some from the beginning (case header)
        head = text[:max_chars // 3]
        tail = text[-(max_chars * 2 // 3):]
        text = head + truncation_notice + tail

    return text
