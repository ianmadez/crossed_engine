# core_engine/prompt_builder.py
import os
import importlib
import logging
import zlib

from .brain_modules.system import SYSTEM_PROMPT
from .brain_modules.style import STYLE_RULES
from .brain_modules.horror import HORROR_RULES
from .brain_modules.crossed_base import CROSSED_BASE
from .brain_modules.crossed_specials import CROSSED_SPECIALS
from .config import SPEECH_COHERENCE_DIVISOR

# ---------------------------------------------------------------------------
# Directory Discovery — scans filesystem subdirectories at import time.
# Used by the frontend to dynamically populate selector dropdowns so users
# don't have to edit HTML when adding new modules or writing packs.
# ---------------------------------------------------------------------------
_PACKS_DIR = os.path.join(os.path.dirname(__file__), "writing_packs")
_MODULES_DIR = os.path.join(os.path.dirname(__file__), "brain_modules")

# ---------------------------------------------------------------------------
# Static constants embedded into the backbone (not configurable at runtime)
# ---------------------------------------------------------------------------
_LORE_ENFORCEMENT_MATRIX = (
    "CROSSED PATHOLOGY & HORDE BEHAVIORAL MATRICES:\n"
    "- HORDE STRUCTURE: The infected travel and hunt in frantic, disorganized, chaotic clusters known as 'gaggles'. "
    "They are entirely insane, operating on pure uninhibited animalistic impulse, self-destructive mania, "
    "and immediate homicidal depravity.\n"
    "- SPEECH COEFFICIENT (1-IN-20 COHERENCE RULE): The vast majority of the infected CANNOT form coherent sentences. "
    "Their verbal output consists entirely of useless curses, obscene profanities, guttural screams, and raw threats. "
    "Only a small minority (approximately 1-in-20) retain the cognitive focus to speak semi-cohesive sentences, "
    "which they use to mock, mimic, or terrify their prey.\n"
    "- NO SUPERNATURAL/SCI-FI ELEMENTS: They are normal human bodies with zero inhibitions. "
    "They possess normal human strength, speed, and structural limitations. "
    "BANNED: Absolutely no magic, ghosts, zombies, spaceships, advanced tech, or anime-style combat maneuvering. "
    "They break bones, bleed out, sustain physical fatigue, and die from normal human biological trauma.\n"
    "- INFECTION PROTOCOL: Transmission happens instantly when contaminated bodily fluids cross open tissue wounds "
    "or mucous membranes. Their immediate motivation is never strategic conversion—it is the raw, uninhibited "
    "execution of physical and psychological cruelty."
)

_PACING_DIRECTIVE = (
    "- DO NOT summarize actions, compress timelines, or accelerate scenes to conclusions.\n"
    "- Write the current chapter as a hyper-detailed, slow-burn sequence occurring across real-time minutes, not hours.\n"
    "- Enforce granular physical geography tracking: specify spatial orientations, where items are held, "
    "and line-of-sight boundaries.\n"
    "- Expand conversational loops completely. Include spoken interruptions, breathing hitches, "
    "and environmental friction details.\n"
    "- Dive deep into internal monologue: capture active panic computations, mechanical focus, "
    "and internal stress responses.\n"
    "- Maintain absolute world coherence. Character state conditions, wounds, and active weapons "
    "are locked rules that cannot change arbitrarily."
)

# Structural markers that should never appear in generated prose.
# Used by ollama_client.py's output truncation hook to halt on leakage.
_STRUCTURAL_LEAKAGE_MARKERS = ("## ", "[", "NAME:", "HEALTH STATUS:", "SCENARIO CURRENT VECTOR:")


def discover_writing_packs() -> list[str]:
    """Return sorted list of writing pack names (without .py extension)
    found in core_engine/writing_packs/, excluding __init__."""
    try:
        return sorted([
            f.replace(".py", "") for f in os.listdir(_PACKS_DIR)
            if f.endswith(".py") and f != "__init__.py"
        ])
    except FileNotFoundError:
        return []


def discover_brain_modules() -> list[str]:
    """Return sorted list of brain module names (without .py extension)
    found in core_engine/brain_modules/, excluding __init__."""
    try:
        return sorted([
            f.replace(".py", "") for f in os.listdir(_MODULES_DIR)
            if f.endswith(".py") and f != "__init__.py"
        ])
    except FileNotFoundError:
        return []


def build_backbone() -> str:
    """Tier 1: Nervous Backbone — static architectural invariants.
    Returns a system-level string containing all immutable rules.
    Sent to the model via Ollama's native 'system' field."""
    parts = []

    parts.append("# CORE WRITING SYSTEM OPERATIONS")
    parts.append(SYSTEM_PROMPT.strip())

    parts.append("# NARRATIVE STYLE & PACING ARCHITECTURE")
    parts.append(STYLE_RULES.strip())

    parts.append("# GENRE TENSION & PHYSICAL GEOGRAPHY RULES")
    parts.append(HORROR_RULES.strip())

    parts.append("# LORE ENFORCEMENT SYSTEM MATRIX (RIGID INVIOLATE BEHAVIORAL PARAMETERS)")
    parts.append(_LORE_ENFORCEMENT_MATRIX.strip())

    parts.append("# UNIVERSE LAWS: THE BEHAVIORAL PARAMETERS")
    parts.append(CROSSED_BASE.strip())

    parts.append("### WRITING PACING OPERATIONAL DIRECTIVES (CRITICAL LENGTH SCALE)")
    parts.append(_PACING_DIRECTIVE.strip())

    return "\n\n".join(parts)


def build_sensory_layer(
    scenario: str,
    characters: str,
    history_stubs: str = "",
    pack_name: str = None,
    special_threat: bool = False,
    phase_directive: str = "",
    current_chapter: int = 1
) -> str:
    """Tier 2: Sensory Layer — dynamic per-generation context.
    Contains all high-frequency fluid variables: scenario, character dossiers,
    trimmed memory stubs, writing pack, phase directive, and the spatial isolation gate.
    The 1-in-20 dialogue constraint (Phase 3.2) is injected here using
    zlib.crc32 for process-stable determinism."""
    manifest = []

    # 1. Dynamic Author Writing Pack Resolution
    if pack_name:
        try:
            pack_module = importlib.import_module(f".writing_packs.{pack_name}", package="core_engine")
            if hasattr(pack_module, "PACK_RULES"):
                manifest.append(f"# ACTIVE AUTHOR STYLE PROFILE: {pack_name.upper()}")
                manifest.append(pack_module.PACK_RULES.strip())
        except ModuleNotFoundError:
            logging.warning(f"Writing pack '{pack_name}' not resolved. Proceeding with baseline default voice.")

    # 2. Special threat addendum
    if special_threat:
        manifest.append("## HIGH-THREAT ANOMALY ADDENDUM")
        manifest.append(CROSSED_SPECIALS.strip())

    # 3. Begin XML-fenced metadata bounds (Phase 2b) — encloses all dynamic data
    manifest.append("<METADATA_BOUNDS>")
    manifest.append("[ACTIVE CONTEXT LEDGER DATA]")

    # 4. Long-Term Chronological Context (trimmed memory stubs + rolling summary)
    if history_stubs.strip():
        manifest.append("# CRITICAL TIMELINE HISTORY (DO NOT VIOLATE CHRONOLOGY)")
        manifest.append(history_stubs.strip())

    # 5. Phase directive
    if phase_directive.strip():
        manifest.append(phase_directive.strip())

    # 6. Unresolved Goal Matrix (Phase 2d) — imperative reframing wraps existing [HEADING]: detail format
    manifest.append("UNRESOLVED CRITICAL GOAL MATRIX:")
    manifest.append(scenario.strip())
    manifest.append("")
    manifest.append("[PROTAGONIST STATUS]: The character(s) do NOT possess their objectives at spawn time. "
                    "They must systematically search across the geographical tracking frame "
                    "while avoiding active hostile vectors.")

    # Close metadata bounds
    manifest.append("</METADATA_BOUNDS>")

    # --- SPATIAL ISOLATION GATE ---
    # Split character dossiers, cross-reference names against scenario text.
    # Characters not mentioned in the scenario are quarantined as off-screen.
    # Protagonist detection uses IS_PROTAGONIST: 1 from compile_dossier_context()
    # (Phase 3.4a), with fallback to name-based detection for backward compatibility.
    char_blocks = characters.strip().split('\n---\n')
    active_cast = []
    dormant_cast = []

    for block in char_blocks:
        lines = block.strip().split('\n')
        # Extract the NAME line to identify the character
        name_line = ""
        for line in lines:
            if line.startswith("NAME:"):
                name_line = line.replace("NAME:", "").strip()
                break
        if not name_line:
            active_cast.append(block)
            continue

        name_lower = name_line.lower()
        scenario_lower = scenario.lower()

        # Check if any meaningful part of the name appears in the scenario
        name_parts = name_lower.split()
        name_in_scenario = (
            name_lower in scenario_lower
            or any(part in scenario_lower for part in name_parts if len(part) > 2)
        )

        # Protagonist detection: prefer IS_PROTAGONIST: 1 from DB (Phase 3.4a),
        # fall back to hardcoded tag check for legacy compatibility
        is_protagonist = False
        for line in lines:
            if line.strip().startswith("IS_PROTAGONIST:"):
                try:
                    is_protagonist = int(line.split(":", 1)[1].strip()) == 1
                    break
                except (ValueError, IndexError):
                    pass
        if not is_protagonist:
            is_protagonist = any(
                tag in name_lower for tag in ["wahid", "wajid", "protagonist"]
            )

        if name_in_scenario or is_protagonist:
            active_cast.append(block)
        else:
            dormant_cast.append(block)

    manifest.append("<METADATA_BOUNDS>")
    manifest.append("[SPATIAL CHARACTER LOCATIONS]")
    manifest.append("## GEOGRAPHICALLY PRESENT SCENE CAST")
    if active_cast:
        manifest.append("\n\n".join(active_cast))
    else:
        manifest.append("No secondary cast members physically present in immediate 50-yard grid.")

    if dormant_cast:
        manifest.append("# OFF-SCREEN / RESERVE CHARACTERS (DORMANT UNIVERSE MATRIX)")
        manifest.append(
            "CRITICAL COHERENCE BOUNDARY LAW: The following characters exist in the global "
            "story ledger but are ABSENT from the current scene landscape. They are physically "
            "miles away, completely unaware of the active survivors, and CANNOT act, broadcast, "
            "or materialize within this chapter unless the SCENARIO CURRENT VECTOR explicitly "
            "orders a structural entrance meet."
        )
        manifest.append("\n---\n".join(dormant_cast))
    manifest.append("</METADATA_BOUNDS>")

    # --- PHASE 3.2: 1-IN-20 DETERMINISTIC DIALOGUE CONSTRAINT ---
    # Uses zlib.crc32 (stable across process restarts, unlike Python's hash()).
    # Constraint injected per character: if character_type is infected/crossed
    # and the hash doesn't hit the 1-in-20 slot, they cannot produce coherent speech.
    dialogue_blocks = []
    for block in char_blocks:
        lines = block.strip().split('\n')
        name_line = ""
        char_type = "survivor"
        for line in lines:
            if line.startswith("NAME:"):
                name_line = line.replace("NAME:", "").strip()
            if line.strip().startswith("CHARACTER_TYPE:"):
                char_type = line.split(":", 1)[1].strip().lower()

        if not name_line:
            continue

        if char_type in ("infected", "crossed"):
            # Deterministic hash — same name + chapter = same result every time
            seed = zlib.crc32((name_line + str(current_chapter)).encode()) % SPEECH_COHERENCE_DIVISOR
            if seed != 0:
                dialogue_blocks.append(
                    f"HARD CONSTRAINT — {name_line} CANNOT produce coherent speech in this chapter. "
                    f"This character may ONLY emit: primal curses, guttural screams, "
                    f"obscene profanities, fragmented threats, or wordless howls. "
                    f"NO complete sentences. NO tactical communication. NO mockery beyond single words. "
                    f"This is a structural law, not a suggestion."
                )

    if dialogue_blocks:
        manifest.append("# DIALOGUE HARD CONSTRAINTS (ABSOLUTE LAWS)")
        manifest.append("\n".join(dialogue_blocks))

    # Phase 2c: Recency anchor — final instruction before EXECUTION
    manifest.append(
        "CRITICAL UNIVERSE LAW: Output strictly narrative prose only. "
        "Do not output markdown section headers, bracket metadata matrices, "
        "XML tracking fields, profile blocks, or conversational questions "
        "under any circumstances. Start your response immediately with the raw story text."
    )

    manifest.append(
        "EXECUTION: Write the next continuous narrative sequence directly following all "
        "structural constraints above. Start immediately with the prose text."
    )

    return "\n\n".join(manifest)


# Backward-compatible alias — combines backbone + sensory layer into one string
def build_production_prompt(
    scenario: str,
    characters: str,
    history_stubs: str = "",
    pack_name: str = None,
    special_threat: bool = False,
    phase_directive: str = "",
    current_chapter: int = 1
) -> str:
    """Legacy single-pass prompt builder. Combines backbone + sensory layer.
    Used when models don't support the 'system' field or two_pass is disabled."""
    backbone = build_backbone()
    sensory = build_sensory_layer(
        scenario=scenario,
        characters=characters,
        history_stubs=history_stubs,
        pack_name=pack_name,
        special_threat=special_threat,
        phase_directive=phase_directive,
        current_chapter=current_chapter
    )
    return backbone + "\n\n" + sensory