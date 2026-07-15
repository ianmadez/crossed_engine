# core_engine/memory_manager.py
import json
import requests
from .config import OLLAMA_URL, OLLAMA_TIMEOUT
from .database import add_memory_stub, compile_historical_context
from .ollama_client import discover_ollama_models


def execute_adaptive_compression(
    book_id: int,
    chapter_num: int,
    raw_chapter_prose: str,
    model_name: str = None
) -> str:
    """
    Pulls the previous state matrix from the database, evaluates the new chapter prose
    against it, calculates precise state deltas, and commits the updated matrix.
    This prevents narrative drift by carrying forward unchanged values verbatim.

    Parameters
    ----------
    model_name : str, optional
        Ollama model tag to use for compression. Falls back to first discovered model.
    """
    # Resolve model for the compression call
    active_model = model_name
    if not active_model:
        available = discover_ollama_models()
        if available:
            active_model = available[0]["name"]
        else:
            active_model = "llama3.2:latest"

    # Fetch all preceding chronological state logs to prevent narrative memory drift
    previous_state_history = compile_historical_context(book_id)
    if not previous_state_history.strip():
        previous_state_history = "INITIAL SYSTEM START: No prior history recorded."

    # Rigid carry-forward delta calculator — silence implies absolute permanence
    compression_system_prompt = (
        "You are a strict, objective, factual status-matrix calculator engine.\n"
        "Your sole assignment is to read a new story chapter, analyze it against the PREVIOUS TIMELINE MATRIX, "
        "and generate an UPDATED TIMELINE MATRIX. Follow these execution constraints explicitly:\n"
        "1. CRITICAL COHERENCE LAW: You are an index calculator, not a creative writer. "
        "If the new chapter text does not explicitly show a change in a survivor's health or inventory, "
        "you must copy the value from the previous matrix line-for-line verbatim. Silence implies absolute permanence.\n"
        "2. DO NOT invent updates. If a weapon was not explicitly stated as lost or used in the text, carry it forward identically.\n"
        "3. DO NOT heal injuries or alter character locations unless explicitly described in the new chapter prose.\n"
        "4. The infected face cross-shaped red scarring, feel absolute pain elimination, and use tool weapons with deep sadism.\n"
        "   Never classify them as a beacon of hope or mild safety factor. They are completely hostile vectors.\n\n"
        "Output exactly one text block adhering to this bracketed schema layout. Produce NO instructional annotations:\n"
        "[LOCATION/TIME]: Explicit geographic coordinates and active time duration delta changes.\n"
        "[STATUS]: Verbatim current health state, physical trauma, and operational anxiety levels of characters.\n"
        "[LOGISTICS]: Absolute list of functional tools, items, weapons carried, and food resources.\n"
        "[VECTOR]: Tactical hostile vectors or geography barriers within immediate proximity."
    )

    user_payload = (
        f"### PREVIOUS TIMELINE MATRIX:\n{previous_state_history}\n\n"
        f"### NEW CHAPTER PROSE TO EVALUATE:\n{raw_chapter_prose}\n\n"
        f"Calculate the precise deltas and output the updated matrix block:"
    )

    request_data = {
        "model": active_model,
        "prompt": user_payload,
        "system": compression_system_prompt,
        "options": {
            "temperature": 0.1,
            "top_p": 0.1,
            "num_predict": 250
        },
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=request_data, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()

        compressed_stub = response.json().get("response", "").strip()
        formatted_stub = f"[CH {chapter_num} STATE MATRIX]\n{compressed_stub}"

        add_memory_stub(book_id, chapter_num, formatted_stub)
        return formatted_stub

    except Exception as network_exception:
        fallback_stub = f"[CH {chapter_num} STATE MATRIX]\n[WARN]: Connection timed out. Prior state matrices carried forward blind."
        add_memory_stub(book_id, chapter_num, fallback_stub)
        return fallback_stub