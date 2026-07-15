# server_routes/stream_routes.py
import json
import requests
from flask import Blueprint, Response, request
from core_engine.database import compile_historical_context, add_chapter, get_book_meta, consolidate_rolling_summary
from core_engine.ollama_client import stream_chapter_generation
from core_engine.memory_manager import execute_adaptive_compression

stream_api = Blueprint("stream_api", __name__)

@stream_api.route("/api/stream-forge", methods=["POST"])
def stream_forge_nexus():
    data = request.get_json() or {}

    book_id = data.get("book_id")
    chapter_num = data.get("chapter_num", 1)
    chapter_title = data.get("title", f"Chapter {chapter_num}").strip()
    scenario = data.get("scenario", "").strip()
    characters = data.get("characters", "").strip()
    pack_name = data.get("pack_name")
    special_threat = data.get("special_threat", False)
    context_scale = data.get("context_scale", 4096)
    # Dynamic model selection from frontend dropdown
    model_name = data.get("model_name") or None
    two_pass = data.get("two_pass", True)

    # Look up book-level structural metadata for phase calculation
    book_meta = get_book_meta(book_id)
    total_chapters = book_meta.get("total_chapters", 5)
    ending_type = book_meta.get("ending_type", "bleak")

    # Ceiling check before entering generator — returns 400 if sealed
    if chapter_num > total_chapters:
        return Response(
            f"data: {json.dumps({'error': True, 'message': 'Chronicle is sealed. Generation ceiling reached.'})}\n\n",
            status=400,
            mimetype="text/event-stream"
        )

    history_stubs = compile_historical_context(book_id)

    def event_stream_generator():
        full_generated_prose = []

        token_iterator = stream_chapter_generation(
            scenario=scenario,
            characters=characters,
            history_stubs=history_stubs,
            pack_name=pack_name,
            special_threat=special_threat,
            context_scale=context_scale,
            model_name=model_name,
            current_chapter=chapter_num,
            total_chapters=total_chapters,
            ending_type=ending_type,
            two_pass=two_pass
        )

        try:
            for token in token_iterator:
                full_generated_prose.append(token)
                yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
        except requests.exceptions.RequestException as e:
            yield f"data: {json.dumps({'error': True, 'message': str(e)})}\n\n"
            return
        except ValueError as e:
            yield f"data: {json.dumps({'error': True, 'message': str(e)})}\n\n"
            return

        complete_text = "".join(full_generated_prose).strip()

        # Write final chapter data to SQLite ledger
        add_chapter(book_id, chapter_num, chapter_title, complete_text)

        # Trigger localized context compression sweep (pass same model)
        compress_log = execute_adaptive_compression(
            book_id, chapter_num, complete_text, model_name=model_name
        )

        # Consolidate rolling summary — fold aged-out stub into condensed history
        consolidate_rolling_summary(book_id, chapter_num)

        yield f"data: {json.dumps({'done': True, 'summary_stub': compress_log})}\n\n"

    return Response(event_stream_generator(), mimetype="text/event-stream")