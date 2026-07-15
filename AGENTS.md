# AGENTS.md -- Crossed Engine Agent Reference

> This is an experimental, open-source hobby project inspired by the Crossed universe (Garth Ennis / Jacen Burrows). It has no affiliation with the original works. No copyright infringement intended. The engine has real limitations -- performance depends entirely on your local hardware and the quality of the model you have pulled. It is being actively improved.

---

## Metadata

```
name: Crossed Engine
type: local_llm_story_generator
language: python
framework: flask
database: sqlite
llm_backend: ollama
license: open_source
status: active_development
```

---

## File Map

### Entry Point

| File | Purpose |
|------|---------|
| `app.py` | Flask server boot. Registers blueprints, calls init_db(), starts debug server. |

### Core Engine

| File | Purpose |
|------|---------|
| `core_engine/config.py` | Loads `settings.json`, exports OLLAMA_URL, SERVER_HOST, GEN_PARAMS, DB_PATH. |
| `core_engine/database.py` | SQLite schema (5 tables), CRUD for books/chapters/characters/memory_stubs/scenario_beats. |
| `core_engine/ollama_client.py` | HTTP client to Ollama. Contains `discover_ollama_models()` and `stream_chapter_generation()`. |
| `core_engine/prompt_builder.py` | Assembles 7-layer prompt manifest. Contains `build_production_prompt()` and directory scanners. |
| `core_engine/memory_manager.py` | State delta compression. Contains `execute_adaptive_compression()`. |
| `core_engine/filter_engine.py` | Cliche detection and AI preamble scrubbing. Not modified in recent updates. |

### Brain Modules (prompt layers, dynamically discovered)

| File | Constant |
|------|----------|
| `brain_modules/system.py` | `SYSTEM_PROMPT` |
| `brain_modules/style.py` | `STYLE_RULES` |
| `brain_modules/horror.py` | `HORROR_RULES` |
| `brain_modules/crossed_base.py` | `CROSSED_BASE` |
| `brain_modules/crossed_specials.py` | `CROSSED_SPECIALS` |

### Writing Packs (author voices, dynamically discovered)

| File | Constant |
|------|----------|
| `writing_packs/king.py` | `PACK_RULES` (King profile) |
| `writing_packs/mccarthy.py` | `PACK_RULES` (McCarthy profile) |
| `writing_packs/ennis.py` | `PACK_RULES` (Ennis profile) |

### Server Routes

| File | Endpoints |
|------|-----------|
| `server_routes/library_routes.py` | CRUD: `/api/books`, `/api/books/<id>/chapters`. Discovery: `/api/discover/models`, `/api/discover/packs`, `/api/discover/modules`. |
| `server_routes/stream_routes.py` | SSE: `POST /api/stream-forge` |

### Frontend

| File | Role |
|------|------|
| `web_interface/templates/base.html` | SPA shell. Contains all panels (shelf, generator, reader) and audio mixer. |
| `web_interface/static/js/main.js` | Navigation, modals, book CRUD, reader view rendering. |
| `web_interface/static/js/stream_view.js` | SSE streaming, chapter generation trigger, dynamic dropdown fetchers. |
| `web_interface/static/js/library_3d.js` | Three.js 3D bookshelf. Not modified recently. |

### Configuration

| File | Purpose |
|------|---------|
| `settings.json` | All hardware params. Loaded by config.py at startup. |
| `.env.example` | Environment variable template. |

---

## Architecture Patterns

### Settings-Driven Configuration

```
settings.json  -->  config.py:load_settings()  -->  exported constants
                     (deep-merge with _DEFAULTS)   OLLAMA_URL, SERVER_HOST, GEN_PARAMS, etc.
```

All hardware-specific values live in `settings.json`. Edit it, restart server, new values apply.

### Dynamic Discovery

Three runtime discovery mechanisms:

| Endpoint | Source | Fallback |
|----------|--------|----------|
| `GET /api/discover/models` | `ollama_client.discover_ollama_models()` queries Ollama `/api/tags` | Returns `[]` on timeout/error |
| `GET /api/discover/packs` | `prompt_builder.discover_writing_packs()` scans `writing_packs/` dir | Returns `[]` if dir missing |
| `GET /api/discover/modules` | `prompt_builder.discover_brain_modules()` scans `brain_modules/` dir | Returns `[]` if dir missing |

All three return `{"status": "success", "data": [...]}`.

### State Delta Matrix

```
Location: core_engine/memory_manager.py -> execute_adaptive_compression()

Flow:
  1. compile_historical_context(book_id)  -- fetch ALL prior [CH n STATE MATRIX] stubs
  2. Bundle previous_state + new_chapter_prose into delta-calculation prompt
  3. POST to Ollama at temperature=0.1, top_p=0.1, num_predict=250
  4. Enforce "silence implies absolute permanence" -- copy unchanged values verbatim
  5. Write [CH n STATE MATRIX] to memory_stubs table
```

### Spatial Isolation Gate

```
Location: core_engine/prompt_builder.py -> build_production_prompt()

Logic:
  1. Split characters string by "\n---\n" into individual dossiers
  2. Extract NAME: from each dossier
  3. Check if name (or any word >2 chars) appears in scenario text (case-insensitive)
  4. If match OR name contains "wahid"/"wajid" -> GEOGRAPHICALLY PRESENT SCENE CAST
  5. Otherwise -> OFF-SCREEN / RESERVE CHARACTERS (DORMANT UNIVERSE MATRIX)
  6. Dormant section carries strict boundary law: cannot act or appear unless scenario orders it
```

### Progressive Phase Calculator

```
Location: core_engine/ollama_client.py -> stream_chapter_generation()

Mapping: current_chapter / total_chapters ratio determines phase directive:

  current_chapter == 1     --> PHASE 1 - BEGINNING (spatial grounding, atmosphere)
  ratio <= 0.4             --> PHASE 2 - THE RISE (escalating threats)
  ratio <= 0.7             --> PHASE 3 - ACUTE ACTION (combat, narrow escapes)
  ratio < total_ch         --> PHASE 4 - SEVERE ADVERSITY (systemic breakdown)
  current_chapter == total --> FINAL PHASE - DEFINITIVE RESOLUTION (matches ending_type)

Type-safe: total_ch = int(param or fallback), if < 1 reset to 5.
Ending style: "bleak" or "hopeful", cast to UPPER.
```

### Pacing Enforcement Directive

```
Location: core_engine/ollama_client.py -> stream_chapter_generation()

Appended to prompt after build_production_prompt().
Bans: timeline compression, time skips, summary transitions.
Forces: spatial tracking, full conversations, internal monologue, real-time-minute pacing.
```

### VRAM-Safe Output Ceiling

```
Location: core_engine/ollama_client.py -> stream_chapter_generation()

requested_predict = 2048 if context_scale >= 4096 else 1024
Set via local_params["num_predict"].
Ensures low-spec (2048 ctx) retains 1024 tokens for input prompt.
```

---

## Database Schema

5 tables. All use `CREATE TABLE IF NOT EXISTS` + `PRAGMA foreign_keys = ON`.

### books
| Column | Type | Default |
|--------|------|---------|
| id | INTEGER PK AUTO | |
| title | TEXT NOT NULL | |
| created_at | TIMESTAMP | CURRENT_TIMESTAMP |
| total_chapters | INTEGER | 5 (added via ALTER TABLE migration) |
| ending_type | TEXT | 'bleak' (added via ALTER TABLE migration) |

### scenario_beats
FK -> books.id ON DELETE CASCADE. Columns: id, book_id, heading, detail.

### characters
FK -> books.id ON DELETE CASCADE. Columns: id, book_id, name, health_condition, physical_gear, behavioral_traits.

### chapters
FK -> books.id ON DELETE CASCADE. Columns: id, book_id, chapter_number, title, content, created_at.

### memory_stubs
FK -> books.id ON DELETE CASCADE. Columns: id, book_id, chapter_number, stub_text, created_at.

---

## Chapter Generation Data Flow

```
USER CLICKS "Forge Next Chapter"
         |
         v
stream_view.js: triggerChapterGeneration()
  - Reads: model selection, pack, threat toggle, context scale
  - POST /api/stream-forge with JSON body
         |
         v
stream_routes.py: stream_forge_nexus()
  - Extracts params from request
  - Calls get_book_meta(book_id) for total_chapters + ending_type
  - Calls compile_historical_context(book_id) for memory stubs
  - Passes everything to stream_chapter_generation()
         |
         v
ollama_client.py: stream_chapter_generation()
  - Resolves model (from param or discover_ollama_models() fallback)
  - Calls build_production_prompt() for 7-layer prompt
  - Appends: pacing_directive + phase_directive
  - POST to Ollama /api/generate with stream=True
  - Yields tokens
         |
         v
stream_routes.py: event_stream_generator()
  - Wraps tokens in SSE frames
  - After stream: add_chapter() to DB
  - Calls execute_adaptive_compression() for state delta
  - Yields done frame with summary stub
         |
         v
stream_view.js: ReadableStream reader
  - Appends tokens to #live-text-canvas DOM
  - On done: logs summary, increments currentChapterNum
```

---

## Common Modification Tasks

| Task | File(s) to Edit |
|------|-----------------|
| Add a new writing voice | Create `core_engine/writing_packs/<name>.py` with `PACK_RULES` string. Auto-discovered. |
| Add a new brain module | Create `core_engine/brain_modules/<name>.py` with constant. Import in `prompt_builder.py`. |
| Change generation defaults | Edit `settings.json` -> `generation` section. |
| Add a database column | `core_engine/database.py` -> add ALTER TABLE in `init_db()`, update `create_book()` if needed. |
| Add an API route | `server_routes/library_routes.py` or new blueprint in `server_routes/`. |
| Add a frontend panel/control | `web_interface/templates/base.html` + `web_interface/static/js/stream_view.js` or `main.js`. |
| Modify the compression prompt | `core_engine/memory_manager.py` -> `compression_system_prompt` string. |
| Modify the pacing/phase directives | `core_engine/ollama_client.py` -> `pacing_directive` or phase calculator block. |
| Modify the prompt assembly | `core_engine/prompt_builder.py` -> `build_production_prompt()`. |
| Change the spatial isolation gate logic | `core_engine/prompt_builder.py` -> the character parsing block in `build_production_prompt()`. |
