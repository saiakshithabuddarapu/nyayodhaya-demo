import re
from typing import Optional

KNOWN_DEPARTMENTS = [
    "Public Works Department",
    "PWD",
    "Bruhat Bengaluru Mahanagara Palike",
    "BBMP",
    "Revenue Department",
    "Department of Health and Family Welfare",
    "Health Department",
    "HEALTH",
    "Department of Public Instruction",
    "Education Department",
    "EDUCATION",
    "Karnataka Forest Department",
    "Forest Department",
    "FOREST",
    "Department of Urban Development",
    "Urban Development Department",
    "URBAN",
    "Karnataka State Pollution Control Board",
    "KSPCB",
    "Karnataka Road Development Corporation",
    "KRDCL",
    "Bangalore Development Authority",
    "BDA",
    "Bangalore Metropolitan Region Development Authority",
    "BMRDA",
    "Karnataka Slum Development Board",
    "KSDB",
    "Department of Labour",
    "Labour Department",
    "Department of Women and Child Development",
    "Department of Social Welfare",
    "Karnataka Housing Board",
    "KHB",
    "Water Resources Department",
    "Irrigation Department",
    "Energy Department",
    "Karnataka Power Transmission Corporation",
    "KPTCL",
    "Transport Department",
    "Home Department",
    "Law Department",
]

CASE_NUMBER_PATTERN = re.compile(
    r"\b(WP|PIL|SLP|CRL|WA|RSA|MFA|CMP|MC|OS|IA|WPC|WPIL|CRIMINAL PETITION|CIVIL)\s*[/\s]\s*\d{3,6}\s*[/\s]\s*\d{4}\b",
    re.IGNORECASE,
)

ACTION_VERBS = [
    "repair", "submit", "file", "clear", "remove", "pay",
    "provide", "ensure", "take", "direct", "comply", "furnish",
    "produce", "restore", "demolish", "construct", "install",
    "implement", "undertake", "complete", "regularize", "initiate",
    "conduct", "inspect", "issue", "grant", "release",
]


def compute_confidence_scores(
    extraction: dict,
    raw_text: str,
    deadline_parsed: bool,
) -> dict:
    """
    Heuristic confidence per field (0-100).

    case_number: 95 if matches WP/PIL/SLP pattern, 70 if some number-like string, 40 if unclear
    department: 90 if exact match in KNOWN_DEPARTMENTS, 70 if partial match, 50 if inferred
    deadline: 95 if deadline_parsed successfully, 60 if relative text found but not parsed, 30 if no deadline
    directive: 80+ if length > 20 words, 90+ if contains action verb, 50-70 if vague/short
    overall: weighted average (case_number * 0.15 + department * 0.25 + deadline * 0.35 + directive * 0.25)
    """
    case_number_score = _score_case_number(extraction.get("case_number", ""), raw_text)
    department_score = _score_department(extraction.get("respondent_department", ""))
    deadline_score = _score_deadline(
        deadline_parsed,
        extraction.get("relative_deadline_text", ""),
    )
    directive_score = _score_directive(extraction.get("key_directives", []))

    overall = (
        case_number_score * 0.15
        + department_score * 0.25
        + deadline_score * 0.35
        + directive_score * 0.25
    )

    return {
        "case_number": round(case_number_score, 2),
        "department": round(department_score, 2),
        "deadline": round(deadline_score, 2),
        "directive": round(directive_score, 2),
        "overall": round(overall, 2),
    }


def _score_case_number(case_number: str, raw_text: str) -> float:
    if not case_number:
        return 40.0

    if CASE_NUMBER_PATTERN.match(case_number.strip()):
        return 95.0

    # Check if the case number appears verbatim in the raw text
    if case_number in raw_text:
        return 85.0

    # Has numbers but doesn't match standard pattern
    if re.search(r"\d{3,}", case_number):
        return 70.0

    return 40.0


def _score_department(department: str) -> float:
    if not department:
        return 50.0

    dept_lower = department.lower()

    # Exact match (case-insensitive)
    for known in KNOWN_DEPARTMENTS:
        if known.lower() == dept_lower:
            return 90.0

    # Partial match — check if known department name appears in extracted text
    for known in KNOWN_DEPARTMENTS:
        if known.lower() in dept_lower or dept_lower in known.lower():
            return 70.0

    # Has "department" or "board" in name — likely a valid gov body
    if re.search(r"\b(department|board|authority|corporation|palike|commission)\b", dept_lower):
        return 65.0

    return 50.0


def _score_deadline(deadline_parsed: bool, relative_text: str) -> float:
    if deadline_parsed:
        return 95.0

    if relative_text and len(relative_text) > 5:
        # Has some text but couldn't parse it
        return 60.0

    return 30.0


def _score_directive(directives: list) -> float:
    if not directives:
        return 40.0

    total_score = 0.0
    for directive in directives:
        score = _score_single_directive(directive)
        total_score += score

    return min(100.0, total_score / len(directives))


def _score_single_directive(directive: str) -> float:
    if not directive:
        return 40.0

    words = directive.split()
    word_count = len(words)

    if word_count < 5:
        return 40.0

    directive_lower = directive.lower()

    # Contains action verb — strong signal of operative order
    has_action_verb = any(verb in directive_lower for verb in ACTION_VERBS)

    if has_action_verb and word_count > 20:
        return 92.0
    elif has_action_verb and word_count > 10:
        return 85.0
    elif has_action_verb:
        return 78.0
    elif word_count > 20:
        return 72.0
    else:
        return 58.0
