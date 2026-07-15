# core_engine/prompt_builder.py
import os
import importlib
import logging

from .brain_modules.system import SYSTEM_PROMPT
from .brain_modules.style import STYLE_RULES
from .brain_modules.horror import HORROR_RULES
from .brain_modules.crossed_base import CROSSED_BASE
from .brain_modules.crossed_specials import CROSSED_SPECIALS

# ---------------------------------------------------------------------------
# Directory Discovery — scans filesystem subdirectories at import time.
# Used by the frontend to dynamically populate selector dropdowns so users
# don't have to edit HTML when adding new modules or writing packs.
# ---------------------------------------------------------------------------
_PACKS_DIR = os.path.join(os.path.dirname(__file__), "writing_packs")
_MODULES_DIR = os.path.join(os.path.dirname(__file__), "brain_modules")


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


def build_production_prompt(
    scenario: str,
    characters: str,
    history_stubs: str = "",
    pack_name: str = None,
    special_threat: bool = False
) -> str:
    """
    Dynamically constructs a highly structured context matrix for the local model.
    Stacks permanent system roles, formatting constraints, active universe configurations,
    and historic timeline context stubs into a clear Markdown schema.
    """
    manifest = []

    # 1. Inject Core Baseline Rules
    manifest.append("# CORE WRITING SYSTEM OPERATIONS")
    manifest.append(SYSTEM_PROMPT.strip())

    manifest.append("# NARRATIVE STYLE & PACING ARCHITECTURE")
    manifest.append(STYLE_RULES.strip())

    manifest.append("# GENRE TENSION & PHYSICAL GEOGRAPHY RULES")
    manifest.append(HORROR_RULES.strip())

    # 2. Inject Active Universe Modules
    manifest.append("# UNIVERSE LAWS: THE BEHAVIORAL PARAMETERS")
    manifest.append(CROSSED_BASE.strip())

    if special_threat:
        manifest.append("## HIGH-THREAT ANOMALY ADDENDUM")
        manifest.append(CROSSED_SPECIALS.strip())

    # 3. Dynamic Author Writing Pack Resolution
    if pack_name:
        try:
            pack_module = importlib.import_module(f".writing_packs.{pack_name}", package="core_engine")
            if hasattr(pack_module, "PACK_RULES"):
                manifest.append(f"# ACTIVE AUTHOR STYLE PROFILE: {pack_name.upper()}")
                manifest.append(pack_module.PACK_RULES.strip())
        except ModuleNotFoundError:
            logging.warning(f"Writing pack '{pack_name}' not resolved. Proceeding with baseline default voice.")

    # 4. Long-Term Chronological Context Engine (Memory Stubs Stack)
    if history_stubs.strip():
        manifest.append("# CRITICAL TIMELINE HISTORY (DO NOT VIOLATE CHRONOLOGY)")
        manifest.append(history_stubs.strip())

    # 5. Immediate Generation Objectives
    manifest.append("# IMMEDIATE TARGET OBJECTIVE FOR THIS CHAPTER")
    manifest.append(f"SCENARIO CURRENT VECTOR:\n{scenario.strip()}\n")

    # --- SPATIAL ISOLATION GATE ---
    # Split character dossiers, cross-reference names against scenario text.
    # Characters not mentioned in the scenario are quarantined as off-screen.
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

        # Protagonists always default active to prevent empty-cast cold opens
        is_protagonist = any(
            tag in name_lower for tag in ["wahid", "wajid", "protagonist"]
        )

        if name_in_scenario or is_protagonist:
            active_cast.append(block)
        else:
            dormant_cast.append(block)

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

    manifest.append(
        "EXECUTION: Write the next continuous narrative sequence directly following all "
        "structural constraints above. Start immediately with the prose text."
    )

    return "\n\n".join(manifest)