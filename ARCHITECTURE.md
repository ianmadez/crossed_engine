# crossed_engine — Architecture Guide

## System Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     Web Frontend (SPA)                        │
│  base.html  ·  main.js  ·  stream_view.js  ·  library_3d.js  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP / SSE
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   Flask Server (app.py)                       │
│  ┌────────────────┐  ┌──────────────────────────────────┐    │
│  │ library_routes │  │         stream_routes             │    │
│  │  · CRUD books  │  │  · SSE /api/stream-forge          │    │
│  │  · discovery   │  │  · wires generation + compression │    │
│  └───────┬────────┘  └───────────────┬──────────────────┘    │
└──────────┼───────────────────────────┼────────────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Core Engine (Python)                       │
│                                                               │
│  config.py  ──  Reads settings.json, exports constants        │
│  database.py ── SQLite (books, chapters, memory, characters)  │
│  prompt_builder.py ── 7-layer prompt assembly + scanners     │
│  ollama_client.py ── HTTP client + model discovery           │
│  memory_manager.py ── State Delta Matrix: pulls prior state, │
│                     compares against new prose, calculates  │
│                     deltas, preserves unchanged values      │
│  filter_engine.py ── Cliché detection & text scrubbing       │
│                                                               │
│  brain_modules/  ── Writing intelligence layers (system,     │
│                     style, horror, crossed_base, specials)    │
│  writing_packs/  ── Author voice profiles (king, mccarthy,   │
│                     ennis, plus any user additions)           │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTP
                        ▼
              ┌─────────────────────┐
              │  Local Ollama API   │
              │  http://localhost   │
              │  :11434             │
              └─────────────────────┘
```

---

## Data Flow: Chapter Generation

```
User clicks "Forge Next Chapter"
         │
         ▼
stream_view.js: triggerChapterGeneration()
  - Collects: model selection, pack, threat toggle, context scale
  - POST /api/stream-forge  (JSON)
         │
         ▼
stream_routes.py: stream_forge_nexus()
  - Extracts runtime parameters from request
  - Calls compile_historical_context() for memory stubs
  - Calls stream_chapter_generation()  ──  returns token iterator
         │
         ▼
ollama_client.py: stream_chapter_generation()
  - Calls build_production_prompt() to assemble 7-layer prompt
  - POSTs to Ollama /api/generate with {model, prompt, options, stream}
  - Yields tokens as they arrive
         │
         ▼
stream_routes.py: event_stream_generator()
  - Wraps tokens into SSE frames  "data: {token, done}\n\n"
  - After stream ends: add_chapter() to DB
  - execute_adaptive_compression() → delta matrix compression
         │
         ▼
memory_manager.py: execute_adaptive_compression()
  - Step 1: Calls compile_historical_context(book_id) to fetch
    ALL prior state matrices from SQLite
  - Step 2: Bundles previous state + new chapter prose into
    a delta-calculation prompt
  - Step 3: Sends to Ollama at ultra-low temperature (0.1)
    with strict "carry forward unchanged values" rules
  - Step 4: Writes updated [CH n STATE MATRIX] to DB
         │
         ▼
stream_view.js: ReadableStream reader
  - Parses SSE frames
  - Appends tokens to DOM (live-text-canvas)
  - On done: logs summary with state stub, increments chapter counter
```

---

## Data Flow: Dynamic Discovery

```
Generator view loads
         │
         ▼
initCrucibleInterface() fires fetchModelList() + fetchPackList()
         │                    │
         ▼                    ▼
GET /api/discover/models    GET /api/discover/packs
         │                    │
         ▼                    ▼
discover_ollama_models()    discover_writing_packs()
  └─ GET /api/tags           └─ os.listdir("writing_packs/")
         │                    │
         ▼                    ▼
Populate <select>           Merge into <select>
#model-selection            #pack-selection
```

---

## Data Flow: State Delta Compression

This is the engine's memory system. After each chapter is written, a separate compression pass extracts a structured state snapshot and stores it. Before the next chapter, the previous snapshot is retrieved and fed back in so the AI knows exactly where things left off.

```
┌─────────────────────────────────────────────────────────┐
│                CHAPTER 'n' GENERATED                    │
│ (full prose text, just finished streaming)              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  execute_adaptive_compression(book_id, chapter_num,     │
│    raw_chapter_prose, model_name)                       │
│                                                         │
│  1. compile_historical_context(book_id)                 │
│     └─ SELECT stub_text FROM memory_stubs               │
│        WHERE book_id = ? ORDER BY chapter_number ASC    │
│     └─ Returns ALL prior state matrices as one block    │
│                                                         │
│  2. Build delta prompt:                                 │
│     "### PREVIOUS TIMELINE MATRIX:" + prior_state +     │
│     "### NEW CHAPTER PROSE TO EVALUATE:" + new_text     │
│                                                         │
│  3. POST /api/generate (temp=0.1, top_p=0.1)            │
│     System prompt enforces "carry forward unchanged"    │
│                                                         │
│  4. Parse response → formatted_stub                     │
│     └─ INSERT INTO memory_stubs (...)                   │
│                                                         │
│  Result: [CH n STATE MATRIX] written to SQLite          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              CHAPTER N+1 GENERATION                     │
│  compile_historical_context() now returns the updated   │
│  matrix from Chapter N → AI starts Chapter N+1 knowing  │
│  exact locations, injuries, inventory, threats          │
└─────────────────────────────────────────────────────────┘
```

**Key design principle — silence implies permanence:**
The compression prompt includes a strict coherence law: if the new chapter text does not explicitly describe a change to a character's health, location, or inventory, the value is copied verbatim from the previous matrix. This prevents the AI from hallucinating gear losses, spontaneous healings, or teleportation between chapters.

---

## Settings & Configuration Flow

```
settings.json (@ repo root)
       │
       ▼
config.py: load_settings()
  - Reads JSON, deep-merges with _DEFAULTS
  - Exports: OLLAMA_URL, SERVER_HOST, GEN_PARAMS, DB_PATH, etc.
       │
       ▼
All core_engine modules import from config
       │
       ▼
Users edit settings.json → restart server → new params apply
```

---

## Key Extension Points

| What you may want to add/change | Where to put it |
|---|---|
| New writing voice/pack | `core_engine/writing_packs/<name>.py` with `PACK_RULES` string — auto-discovered |
| New brain/intelligence module | `core_engine/brain_modules/<name>.py` — auto-discovered |
| Custom generation defaults | Edit `settings.json` → `generation` section |
| New Ollama model | Pull it in Ollama, select it in the frontend dropdown |
| New database table | `core_engine/database.py` → `init_db()` + CRUD functions |
| New API route | `server_routes/library_routes.py` or new blueprint in `server_routes/` |
| New frontend view/panel | `web_interface/templates/base.html` + `stream_view.js` or `main.js` |

---

## Dependency Graph

```
app.py
  ├── core_engine.config
  ├── core_engine.database
  ├── server_routes.library_routes
  │     ├── core_engine.database
  │     ├── core_engine.ollama_client
  │     └── core_engine.prompt_builder
  └── server_routes.stream_routes
        ├── core_engine.database
        ├── core_engine.ollama_client
        │     ├── core_engine.config
        │     └── core_engine.prompt_builder
        │           ├── core_engine.brain_modules.*
        │           └── core_engine.writing_packs.*
        └── core_engine.memory_manager
              ├── core_engine.config
              ├── core_engine.database
              └── core_engine.ollama_client
```
