# server_routes/library_routes.py
from flask import Blueprint, jsonify, request
from core_engine.database import create_book, get_all_books, get_book_chapters
from core_engine.ollama_client import discover_ollama_models
from core_engine.prompt_builder import discover_writing_packs, discover_brain_modules

# Instantiate the blueprint framework
library_api = Blueprint("library_api", __name__)

@library_api.route("/api/books", methods=["GET"])
def fetch_vault_books():
    """Retrieves all active story ledgers to populate the virtual 3D shelf rows."""
    try:
        books = get_all_books()
        return jsonify({"status": "success", "data": books}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@library_api.route("/api/books", methods=["POST"])
def initialize_new_volume():
    """Creates a new persistent volume partition on the server database matrix."""
    data = request.get_json() or {}
    title = data.get("title", "UNNAMED CHRONICLE").strip()
    scenario = data.get("scenario", "").strip()
    characters = data.get("characters", "").strip()
    total_chapters = int(data.get("total_chapters", 5))
    ending_type = data.get("ending_type", "bleak").strip()

    if not scenario or not characters:
        return jsonify({"status": "error", "message": "Missing required scenario or survivor vectors."}), 400

    try:
        # Import the compilation gate utility dynamically to prevent cyclic loops
        from core_engine.ollama_client import generate_volume_synopsis
        
        # Compute the non-jargon synopsis text pass using the raw scenario parameters
        synopsis_blurb = generate_volume_synopsis(title, scenario, characters)
        
        new_book_id = create_book(title, scenario, characters, total_chapters, ending_type, synopsis=synopsis_blurb)
        return jsonify({"status": "success", "book_id": new_book_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@library_api.route("/api/books/<int:book_id>", methods=["DELETE"])
def delete_volume_route(book_id):
    """Deletes an active volume from the repository database layer."""
    try:
        from core_engine.database import delete_book
        delete_book(book_id)
        return jsonify({"status": "success", "message": "Volume successfully wiped from the ledger."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@library_api.route("/api/books/<int:book_id>/chapters", methods=["GET"])
def fetch_book_narratives(book_id):
    """Retrieves all historical full-prose chapters tied to a target book ID."""
    try:
        chapters = get_book_chapters(book_id)
        return jsonify({"status": "success", "data": chapters}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ---------------------------------------------------------------------------
# Discovery Endpoints — feed dynamic dropdowns in the frontend.
# These let users hot-swap models, writing packs, and brain modules at runtime
# without editing HTML or Python source files.
# ---------------------------------------------------------------------------

@library_api.route("/api/discover/models", methods=["GET"])
def fetch_ollama_models():
    """Return the list of models available in the local Ollama instance."""
    try:
        models = discover_ollama_models()
        return jsonify({"status": "success", "data": models}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@library_api.route("/api/discover/packs", methods=["GET"])
def fetch_writing_packs():
    """Return dynamically-discovered writing pack names from the filesystem."""
    try:
        packs = discover_writing_packs()
        return jsonify({"status": "success", "data": packs}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@library_api.route("/api/discover/modules", methods=["GET"])
def fetch_brain_modules():
    """Return dynamically-discovered brain module names from the filesystem."""
    try:
        modules = discover_brain_modules()
        return jsonify({"status": "success", "data": modules}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500