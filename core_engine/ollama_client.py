# core_engine/ollama_client.py
import json
import logging
import requests
from .config import OLLAMA_URL, OLLAMA_TAGS_URL, OLLAMA_TIMEOUT, GEN_PARAMS
from .prompt_builder import build_production_prompt

# ---------------------------------------------------------------------------
# Model Discovery — queries Ollama's local /api/tags endpoint.
# Returns an empty list on failure so the UI can degrade gracefully.
# ---------------------------------------------------------------------------
def discover_ollama_models() -> list[dict]:
    """Query Ollama /api/tags and return list of available models.
    Each entry has 'name', 'modified_at', 'size', 'digest', 'details' keys.
    Returns [] on any connection/parse error."""
    try:
        resp = requests.get(OLLAMA_TAGS_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("models", [])
    except (requests.RequestException, json.JSONDecodeError) as e:
        logging.warning(f"[ollama_client] Could not reach Ollama at {OLLAMA_TAGS_URL}: {e}")
        return []


def stream_chapter_generation(
    scenario: str,
    characters: str,
    history_stubs: str = "",
    pack_name: str = None,
    special_threat: bool = False,
    context_scale: int = 4096,
    model_name: str = None,
    current_chapter: int = 1,
    total_chapters: int = 5,
    ending_type: str = "bleak"
):
    """
    Establishes an active HTTP stream iterator connection to the local Ollama instance.
    Compiles the dynamic modular prompt layers and yields incoming text chunks token-by-token.

    Parameters
    ----------
    model_name : str, optional
        The Ollama model tag to use (e.g. "llama3.2:latest").
        Falls back to the first discovered model, or a safe default string.
    current_chapter : int
        The current chapter being generated (1-indexed).
    total_chapters : int
        Total chapter count for the volume (from book metadata).
    ending_type : str
        Narrative resolution mode ("bleak" or "hopeful").
    """
    # 1. Resolve model name — discover live or use fallback
    active_model = model_name
    if not active_model:
        available = discover_ollama_models()
        if available:
            active_model = available[0]["name"]
        else:
            active_model = "llama3.2:latest"

    # 2. Compile our hyper-focused modular context prompt matrix
    compiled_prompt = build_production_prompt(
        scenario=scenario,
        characters=characters,
        history_stubs=history_stubs,
        pack_name=pack_name,
        special_threat=special_threat
    )

    # 3. Append 3x Pacing Enforcement Directive — bans timeline compression,
    #    forces granular spatial tracking, full conversations, internal monologue.
    pacing_directive = (
        "\n\n### WRITING PACING OPERATIONAL DIRECTIVES (CRITICAL LENGTH SCALE):\n"
        "- DO NOT summarize actions, compress timelines, or accelerate scenes to conclusions.\n"
        "- Write the current chapter as a hyper-detailed, slow-burn sequence occurring across real-time minutes, not hours.\n"
        "- Enforce granular physical geography tracking: specify spatial orientations, where items are held, and line-of-sight boundaries.\n"
        "- Expand conversational loops completely. Include spoken interruptions, breathing hitches, and environmental friction details.\n"
        "- Dive deep into internal monologue: capture active panic computations, mechanical focus, and internal stress responses.\n"
        "- Maintain absolute world coherence. Character state conditions, wounds, and active weapons are locked rules that cannot change arbitrarily."
    )
    compiled_prompt += pacing_directive

    # 4. Dynamic output ceiling — protects low-spec VRAM by guaranteeing
    #    at least 1024 tokens remain for the input prompt when context_scale is 2048.
    requested_predict = 2048 if context_scale >= 4096 else 1024

    # 5. Clone generation parameters from settings, override context scale + predict
    local_params = dict(GEN_PARAMS)
    local_params["num_ctx"] = context_scale
    local_params["num_predict"] = requested_predict

    # 6. Progressive Narrative Trajectory Phase Calculator
    #    Type-safe fallbacks prevent crashes on corrupted or legacy DB rows.
    total_ch = int(local_params.get("total_chapters") or total_chapters)
    if total_ch < 1:
        total_ch = 5
    ending_style = str(local_params.get("ending_type") or ending_type).upper()
    progress_ratio = current_chapter / total_ch

    if current_chapter == 1:
        phase_directive = (
            "\n\n### CURRENT ARCHITECTURAL MILESTONE: PHASE 1 - BEGINNING\n"
            "- Ground the spatial orientation of characters immediately.\n"
            "- Build the initial atmospheric friction and document their panic-alert states."
        )
    elif current_chapter == total_ch:
        phase_directive = (
            f"\n\n### CURRENT ARCHITECTURAL MILESTONE: FINAL PHASE - DEFINITIVE RESOLUTION\n"
            f"- Execute an absolute, unyielding narrative conclusion.\n"
            f"- The plot must firmly map to a [{ending_style}] final statement. No cliffhangers allowed."
        )
    elif progress_ratio <= 0.4:
        phase_directive = (
            "\n\n### CURRENT ARCHITECTURAL MILESTONE: PHASE 2 - THE RISE\n"
            "- Slowly scale the environmental threats and cut off standard avenues of escape.\n"
            "- Elevate interpersonal stress and reduce resources systematically."
        )
    elif progress_ratio <= 0.7:
        phase_directive = (
            "\n\n### CURRENT ARCHITECTURAL MILESTONE: PHASE 3 - ACUTE ACTION\n"
            "- Deliver high-stakes physical confrontation against hostile vectors.\n"
            "- Focus on strategic combat maneuvers, tactical narrow escapes, and extreme physical exertion."
        )
    else:
        phase_directive = (
            "\n\n### CURRENT ARCHITECTURAL MILESTONE: PHASE 4 - SEVERE ADVERSITY\n"
            "- Systemic breakdown of survival options. A major asset is compromised or lost.\n"
            "- Wounds compound severely; hope drops to its absolute lowest baseline prior to the resolution."
        )

    compiled_prompt += phase_directive

    # 7. Package the runtime operational JSON payload
    payload = {
        "model": active_model,
        "prompt": compiled_prompt,
        "options": local_params,
        "stream": True
    }

    # 5. Open connection stream over local network interface
    try:
        response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                chunk = json.loads(line.decode('utf-8'))
                token = chunk.get("response", "")
                if token:
                    yield token

    except requests.exceptions.RequestException as e:
        yield f"\n[CRITICAL NETWORK ENGINE ERROR: {str(e)}]\n"