# core_engine/config.py
import os
import json

# Base project directory — two levels up from this file's location.
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

# ---------------------------------------------------------------------------
# Settings loader: reads settings.json from the repo root.
# Every value can be overridden by placing a settings.json file at BASE_DIR.
# Returns a nested dict — all consumers access via the exported constants below.
# ---------------------------------------------------------------------------
_SETTINGS_PATH = os.path.join(BASE_DIR, "settings.json")

_DEFAULTS = {
    "ollama": {
        "host": "http://localhost:11434",
        "timeout": 120
    },
    "server": {
        "host": "127.0.0.1",
        "port": 8000
    },
    "generation": {
        "temperature": 0.88,
        "top_p": 0.92,
        "num_ctx": 4096,
        "num_predict": 1024
    },
    "database": {
        "path": "library_vault.db"
    }
}


def load_settings() -> dict:
    """Load runtime parameters from settings.json, falling back to _DEFAULTS."""
    if os.path.exists(_SETTINGS_PATH):
        try:
            with open(_SETTINGS_PATH, "r") as f:
                user_settings = json.load(f)
            merged = _DEFAULTS.copy()
            for section, values in user_settings.items():
                if section in merged and isinstance(merged[section], dict):
                    merged[section].update(values)
                else:
                    merged[section] = values
            return merged
        except (json.JSONDecodeError, OSError) as e:
            print(f"[config] Warning: Could not parse settings.json — {e}. Using defaults.")
    return _DEFAULTS.copy()


_SETTINGS = load_settings()

# --- Exported constants (backward-compatible names) ---
OLLAMA_HOST = _SETTINGS["ollama"]["host"]
OLLAMA_URL = f"{OLLAMA_HOST}/api/generate"
OLLAMA_TAGS_URL = f"{OLLAMA_HOST}/api/tags"
OLLAMA_TIMEOUT = _SETTINGS["ollama"]["timeout"]

SERVER_HOST = _SETTINGS["server"]["host"]
SERVER_PORT = _SETTINGS["server"]["port"]

GEN_PARAMS = dict(_SETTINGS["generation"])

DB_PATH = os.path.join(BASE_DIR, _SETTINGS["database"]["path"])

# --- Nervous System constants (from settings.json or defaults) ---
_NS = _SETTINGS["nervous_system"]
ROLLING_WINDOW_SIZE = _NS["rolling_window_size"]
SPEECH_COHERENCE_DIVISOR = _NS["speech_coherence_divisor"]
OUTLINE_TEMPERATURE = _NS["outline_temperature"]
OUTLINE_TOP_P = _NS["outline_top_p"]
OUTLINE_NUM_PREDICT = _NS["outline_num_predict"]
OUTLINE_TIMEOUT = _NS["outline_timeout"]
VRAM_CTX_THRESHOLD = _NS["vram_ctx_threshold"]
VRAM_PREDICT_HIGH = _NS["vram_predict_high"]
VRAM_PREDICT_LOW = _NS["vram_predict_low"]
COMPRESSION_TEMPERATURE = _NS["compression_temperature"]
COMPRESSION_TOP_P = _NS["compression_top_p"]
COMPRESSION_NUM_PREDICT = _NS["compression_num_predict"]
COMPRESSION_MAX_RETRIES = _NS["compression_max_retries"]
PHASE_RISE_THRESHOLD = _NS["phase_rise_threshold"]
PHASE_ACTION_THRESHOLD = _NS["phase_action_threshold"]

# --- Timeout constants ---
_TO = _SETTINGS["timeouts"]
DISCOVERY_TIMEOUT = _TO["discovery_timeout"]
GROQ_TIMEOUT = _TO["groq_timeout"]
SYNOPSIS_TIMEOUT = _TO["synopsis_timeout"]