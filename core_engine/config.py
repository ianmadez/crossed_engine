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