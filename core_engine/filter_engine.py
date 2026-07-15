# core_engine/filter_engine.py
import re

# Comprehensive matrix of lazy AI expressions and structural bad habits
TIRED_AI_ISMS = [
    r"\bshivers? down (my|his|her|their) spines?\b",
    r"\btestament to\b",
    r"\bbeacon of\b",
    r"\bbleak reality\b",
    r"\bchilling reminder\b",
    r"\bsomething else entirely\b",
    r"\bseemed to thicken\b",
    r"\boppressive weight\b",
    r"\bcavernous silence\b",
    r"\bnot X, but Y\b",
    r"\bit wasn't X\. it was Y\b"
]

def scrub_meta_text(text: str) -> str:
    """
    Strips common introductory or out-of-character chat patterns
    that uncensored models occasionally spit out before the story begins.
    """
    # Catches things like "Sure, here's the scene:" or "Note: This is horror fiction"
    patterns = [
        r"^(as an ai|sure, here is|here's the scene|here is the next chapter|note:).*?:\n?",
        r"^(here is a continuation|certainly, here is).*?\n"
    ]

    scrubbed = text
    for pattern in patterns:
        scrubbed = re.sub(pattern, "", scrubbed, flags=re.IGNORECASE | re.MULTILINE)

    return scrubbed.strip()

def analyze_structural_fatigue(text: str, max_allowed_cliches: int = 2) -> dict:
    """
    Scans the text against the cliché matrix and checks for excessive phrase repetition.
    Returns an evaluation report detailing whether the text passed validation.
    """
    found_cliches = []

    # 1. Scan for explicit cliché matches
    for pattern in TIRED_AI_ISMS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Clean up regex syntax for human-readable reporting
            clean_name = pattern.replace(r"\b", "").replace(r"(my|his|her|their)", "POV")
            found_cliches.extend([clean_name] * len(matches))

    # 2. Check for severe phrase echo (detects identical sentences repeated within 3 paragraphs)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    duplicate_phrases_detected = False

    for i, current_p in enumerate(paragraphs):
        # Look ahead up to 2 paragraphs to spot lazy text echoes
        lookahead_window = paragraphs[i+1 : i+3]
        sentences = re.split(r'[.!?]+', current_p)

        for sentence in sentences:
            sentence_clean = sentence.strip().lower()
            # Ignore ultra-short sentences like "No." or "Run."
            if len(sentence_clean) > 15:
                for check_p in lookahead_window:
                    if sentence_clean in check_p.lower():
                        duplicate_phrases_detected = True
                        found_cliches.append(f"Echoed Phrase: '{sentence.strip()}'")

    # 3. Calculate metrics
        total_violations = len(found_cliches)
        passed = total_violations <= max_allowed_cliches and not duplicate_phrases_detected

    return {
        "passed": passed,
        "violation_count": total_violations,
        "cliches_detected": found_cliches,
        "duplicate_echo_found": duplicate_phrases_detected
        }