import re
import logging
from datetime import date
from typing import Optional
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

# Regex patterns for relative deadline expressions
_DAYS_PATTERN = re.compile(
    r"within\s+(\d+)\s+days?\s*(?:from\s+(?:the\s+)?date\s+of\s+(?:this\s+)?order|from\s+today)?",
    re.IGNORECASE,
)
_WEEKS_PATTERN = re.compile(
    r"within\s+(\d+)\s+weeks?\s*(?:from\s+(?:the\s+)?date\s+of\s+(?:this\s+)?order|from\s+today)?",
    re.IGNORECASE,
)
_MONTHS_PATTERN = re.compile(
    r"within\s+(\d+)\s+months?\s*(?:from\s+(?:the\s+)?date\s+of\s+(?:this\s+)?order|from\s+today)?",
    re.IGNORECASE,
)
_SPECIFIC_DATE_PATTERN = re.compile(
    r"by\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})",
    re.IGNORECASE,
)
_NEXT_HEARING_PATTERN = re.compile(
    r"(?:at\s+the\s+)?next\s+(?:date\s+of\s+)?hearing|next\s+sitting",
    re.IGNORECASE,
)


def compute_absolute_deadline(
    relative_text: str,
    order_date: str,
) -> Optional[str]:
    """
    Parse relative deadline text from a judgment and compute the absolute date.

    Handles:
    - "within N days from the date of this order"
    - "within N weeks"
    - "within N months"
    - "within N weeks from today"
    - "by [specific date]"
    - "at the next hearing" → returns None

    Args:
        relative_text: The deadline phrase extracted from the judgment.
        order_date: The court order date as ISO string "YYYY-MM-DD".

    Returns:
        ISO date string "YYYY-MM-DD" or None if unparseable.
    """
    if not relative_text or not order_date:
        return None

    try:
        base_date = date.fromisoformat(order_date)
    except ValueError:
        logger.warning(f"Invalid order_date format: {order_date}")
        return None

    # "at the next hearing" — cannot compute
    if _NEXT_HEARING_PATTERN.search(relative_text):
        logger.info("Deadline is 'at next hearing' — cannot compute absolute date.")
        return None

    # Try days
    match = _DAYS_PATTERN.search(relative_text)
    if match:
        n = int(match.group(1))
        result = base_date + relativedelta(days=n)
        logger.info(f"Parsed {n} days from {order_date} → {result.isoformat()}")
        return result.isoformat()

    # Try weeks
    match = _WEEKS_PATTERN.search(relative_text)
    if match:
        n = int(match.group(1))
        result = base_date + relativedelta(weeks=n)
        logger.info(f"Parsed {n} weeks from {order_date} → {result.isoformat()}")
        return result.isoformat()

    # Try months
    match = _MONTHS_PATTERN.search(relative_text)
    if match:
        n = int(match.group(1))
        result = base_date + relativedelta(months=n)
        logger.info(f"Parsed {n} months from {order_date} → {result.isoformat()}")
        return result.isoformat()

    # Try specific date ("by 15 April 2024" or "by 2024-04-15")
    match = _SPECIFIC_DATE_PATTERN.search(relative_text)
    if match:
        date_str = match.group(1).strip()
        parsed = _parse_specific_date(date_str)
        if parsed:
            logger.info(f"Parsed specific date '{date_str}' → {parsed}")
            return parsed

    logger.warning(f"Could not parse deadline from text: '{relative_text}'")
    return None


def _parse_specific_date(date_str: str) -> Optional[str]:
    """Attempt to parse a variety of date string formats."""
    from datetime import datetime

    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d %B %Y",
        "%dst %B %Y",
        "%dnd %B %Y",
        "%drd %B %Y",
        "%dth %B %Y",
        "%d %b %Y",
    ]

    # Strip ordinal suffixes for day (1st → 1, 22nd → 22)
    cleaned = re.sub(r"(\d+)(?:st|nd|rd|th)", r"\1", date_str)

    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.date().isoformat()
        except ValueError:
            continue

    return None
