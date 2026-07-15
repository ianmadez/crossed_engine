# core_engine/ollama_client.py
import json
import logging
import requests
from .config import OLLAMA_URL, OLLAMA_TAGS_URL, OLLAMA_TIMEOUT, GEN_PARAMS, DISCOVERY_TIMEOUT, GROQ_TIMEOUT, SYNOPSIS_TIMEOUT, OUTLINE_TEMPERATURE, OUTLINE_TOP_P, OUTLINE_NUM_PREDICT, OUTLINE_TIMEOUT, VRAM_CTX_THRESHOLD, VRAM_PREDICT_HIGH, VRAM_PREDICT_LOW, PHASE_RISE_THRESHOLD, PHASE_ACTION_THRESHOLD
from .prompt_builder import build_backbone, build_sensory_layer, build_production_prompt, _STRUCTURAL_LEAKAGE_MARKERS

# ---------------------------------------------------------------------------
# Model Discovery — queries Ollama's local /api/tags endpoint.
# Returns an empty list on failure so the UI can degrade gracefully.
# ---------------------------------------------------------------------------
def discover_ollama_models() -> list[dict]:
    """Query Ollama /api/tags and return list of available models,
    automatically appending cloud models if environment credentials exist."""
    models = []
    try:
        resp = requests.get(OLLAMA_TAGS_URL, timeout=DISCOVERY_TIMEOUT)
        if resp.status_code == 200:
            models = resp.json().get("models", [])
    except (requests.RequestException, ValueError) as e:
        logging.warning(f"[ollama_client] Could not reach Ollama at {OLLAMA_TAGS_URL}: {e}")

    # Seamlessly append the high-capacity cloud route if key is present
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    if os.environ.get("GROQ_API_KEY"):
        models.append({
            "name": "llama3-70b-8192 (Groq)",
            "details": {"parameter_size": "70B", "quantization_level": "None"}
        })
    return models


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
    ending_type: str = "bleak",
    two_pass: bool = False
):
    """
    Establishes an active HTTP stream iterator connection to the local Ollama instance.
    Uses the 3-tier Nervous System pipeline:
      Tier 1 (backbone) → Ollama 'system' field
      Tier 2 (sensory)  → Ollama 'prompt' field
      Tier 3 (motor)    → optional two-pass: outline then expand

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
    two_pass : bool
        If True, use two-pass generation (outline → expand).
        The outline is hidden from the user and injected as a blueprint constraint.
    """
    # 0. Safety gate — refuse generation if chapter ceiling is reached
    if current_chapter > total_chapters:
        raise ValueError("Chronicle is sealed. Generation ceiling reached.")

    # 1. Resolve model name — discover live or use fallback
    active_model = model_name
    if not active_model:
        available = discover_ollama_models()
        if available:
            active_model = available[0]["name"]
        else:
            active_model = "llama3.2:latest"

    # 2. Build Tier 1: Nervous Backbone (static system rules — sent via 'system' field)
    backbone = build_backbone()

    # 3. Dynamic output ceiling — protects low-spec VRAM by guaranteeing
    #    at least 1024 tokens remain for the input prompt when context_scale is 2048.
    requested_predict = VRAM_PREDICT_HIGH if context_scale >= VRAM_CTX_THRESHOLD else VRAM_PREDICT_LOW

    # 4. Clone generation parameters from settings, override context scale + predict
    local_params = dict(GEN_PARAMS)
    local_params["num_ctx"] = context_scale
    local_params["num_predict"] = requested_predict

    # 5. Progressive Narrative Trajectory Phase Calculator
    #    Type-safe fallbacks prevent crashes on corrupted or legacy DB rows.
    total_ch = int(total_chapters)
    if total_ch < 1:
        total_ch = 5
    ending_style = str(ending_type).upper()
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
    elif progress_ratio <= PHASE_RISE_THRESHOLD:
        phase_directive = (
            "\n\n### CURRENT ARCHITECTURAL MILESTONE: PHASE 2 - THE RISE\n"
            "- Slowly scale the environmental threats and cut off standard avenues of escape.\n"
            "- Elevate interpersonal stress and reduce resources systematically."
        )
    elif progress_ratio <= PHASE_ACTION_THRESHOLD:
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

    # 6. Build Tier 2: Sensory Layer (dynamic per-generation context)
    sensory_layer = build_sensory_layer(
        scenario=scenario,
        characters=characters,
        history_stubs=history_stubs,
        pack_name=pack_name,
        special_threat=special_threat,
        phase_directive=phase_directive,
        current_chapter=current_chapter
    )

    # Intercept and redirect execution path if the Groq Cloud target is matched
    import os
    if "Groq" in active_model or active_model.startswith("llama3-70b"):
        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            raise requests.exceptions.RequestException("GROQ_API_KEY value is missing from your local .env record")

        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }

        # Derive the real model name by stripping display suffix.
        # NOTE: Multi-model Groq support not yet implemented.
        groq_model = active_model.replace(" (Groq)", "")
        groq_payload = {
            "model": groq_model,
            "messages": [
                {"role": "system", "content": backbone},
                {"role": "user", "content": sensory_layer}
            ],
            "temperature": float(local_params.get("temperature", 0.85)),
            "top_p": float(local_params.get("top_p", 0.92)),
            "stream": True
        }

        res = requests.post(groq_url, json=groq_payload, headers=groq_headers, stream=True, timeout=GROQ_TIMEOUT)
        res.raise_for_status()

        groq_tokens_yielded = 0
        for line in res.iter_lines():
            if line:
                decoded = line.decode('utf-8').strip()
                if decoded.startswith("data: "):
                    data_str = decoded[6:]
                    if data_str == "[DONE]":
                        if groq_tokens_yielded == 0:
                            raise requests.exceptions.RequestException(
                                "CRITICAL DATA FEED EVAPORATED: Cloud stream terminated prematurely with zero tokens."
                            )
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        choices = chunk_json.get("choices", [])
                        if choices:
                            token = choices[0].get("delta", {}).get("content", "")
                            if token:
                                groq_tokens_yielded += 1
                                yield token
                    except Exception:
                        continue
        # Post-loop guard: catches network drops that never hit [DONE]
        if groq_tokens_yielded == 0:
            raise requests.exceptions.RequestException(
                "CRITICAL DATA FEED EVAPORATED: Cloud stream terminated prematurely with zero tokens."
            )
        return

    # 7. TIER 3: MOTOR CORTEX — optional two-pass generation
    if two_pass:
        try:
            # Pass 1: Generate a 3-bullet micro-outline (blocking, low temp, NOT streamed to user)
            outline_params = dict(local_params)
            outline_params["temperature"] = OUTLINE_TEMPERATURE
            outline_params["top_p"] = OUTLINE_TOP_P
            outline_params["num_predict"] = OUTLINE_NUM_PREDICT

            outline_payload = {
                "model": active_model,
                "system": backbone,
                "prompt": sensory_layer + (
                    "\n\nProduce exactly 3 bullet points as a micro-outline of the next 2-3 real-time minutes. "
                    "Cover: spatial movements, line-of-sight, and dialogue intentions. No prose."
                ),
                "options": outline_params,
                "stream": False
            }

            outline_resp = requests.post(OLLAMA_URL, json=outline_payload, timeout=OUTLINE_TIMEOUT)
            outline_resp.raise_for_status()
            outline_text = outline_resp.json().get("response", "").strip()

            logging.info(f"[two_pass] Outline for ch {current_chapter}: {outline_text[:100]}...")

            # Inject outline as a confirmed narrative blueprint constraint into the sensory layer
            final_prompt = (
                sensory_layer
                + "\n\nCONFIRMED NARRATIVE BLUEPRINT (FOLLOW EXACTLY):\n"
                + outline_text
                + "\n\nExpand this blueprint into full visceral prose following all structural constraints above."
            )

        except Exception as e:
            # Failure path: outline failed — fall back to single-pass
            logging.warning(f"[two_pass] Outline pass failed, falling back to single-pass: {e}")
            two_pass = False

    # 8. Package and dispatch to local Ollama
    payload = {
        "model": active_model,
        "system": backbone,
        "prompt": final_prompt if two_pass else sensory_layer,
        "options": local_params,
        "stream": True
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()

        accumulated_output = ""
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line.decode('utf-8'))
                token = chunk.get("response", "")
                if token:
                    # Output truncation: check for structural leakage markers
                    accumulated_output += token
                    for marker in _STRUCTURAL_LEAKAGE_MARKERS:
                        if marker in accumulated_output and len(accumulated_output) > 50:
                            # All safe text already yielded. Halt cleanly.
                            return
                    yield token

    except requests.exceptions.RequestException:
        raise
        
def generate_volume_synopsis(title: str, scenario: str, characters: str, model_name: str = None) -> str:
    """
    Executes a one-time synchronous block generation pass to translate technical configuration
    parameters into a dark, cinematic, non-jargon back-cover book summary.
    """
    active_model = model_name
    if not active_model:
        available = discover_ollama_models()
        active_model = available[0]["name"] if available else "llama3.2:latest"

    system_prompt = (
        "You are an atmospheric dark fiction book editor.\n"
        "Your task is to convert a raw list of technical narrative parameters, locations, and characters "
        "into a compelling, dark, cinematic two-paragraph back-cover book synopsis.\n"
        "CRITICAL LAWS:\n"
        "1. DO NOT reuse technical brackets like [HOW THE STORY GOES] or [SYSTEMIC INEQUALITIES] in your text.\n"
        "2. Do not use generic corporate hype, commercial adjectives ('a thrilling roller-coaster'), or introductory talk.\n"
        "3. Focus completely on grounding the raw atmospheric environment, the main survivors, and the looming tension.\n"
        "Output exactly two clean paragraphs of narrative summary text. No markdown formatting, no bullet points."
    )

    user_payload = (
        f"BOOK TITLE: {title}\n\n"
        f"WORLD ENVIRONMENT MATRICES:\n{scenario}\n\n"
        f"SURVIVOR DATA MATRIX:\n{characters}\n\n"
        f"Forge the back-cover book synopsis text now:"
    )

    payload = {
        "model": active_model,
        "prompt": user_payload,
        "system": system_prompt,
        "options": {
            "temperature": 0.3,
            "top_p": 0.4,
            "num_predict": 300
        },
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=SYNOPSIS_TIMEOUT)
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except Exception as e:
        logging.warning(f"Synopsis generation pass timed out or failed: {e}")
        # Clean procedural fallback summary text
        lines = [line.split(']: ', 1)[1] for line in scenario.split('\n') if ']: ' in line]
        return lines[0] if lines else "A harrowing chronicle of desperate survival against closing waves of the infected."