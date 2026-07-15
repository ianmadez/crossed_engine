# crossed_engine — Project File Tree

```
crossed_engine/
│
├── app.py                          # Flask entry point — registers blueprints, starts server
├── settings.json                   # Externalized runtime parameters (Ollama, server, generation)
├── requirements.txt                # Python dependencies: flask, requests
├── .env.example                    # Environment variable template
├── README.md                       # Project overview, quick-start, configuration guide
├── ARCHITECTURE.md                 # System architecture, data flow, extension points
├── FILE_TREE.md                    # This file — annotated project tree
│
├── core_engine/                    # Backend core logic
│   ├── __init__.py
│   ├── config.py                   # Settings loader — reads settings.json, exports constants
│   ├── database.py                 # SQLite CRUD — books, characters, chapters, memory stubs
│   ├── filter_engine.py            # Cliché detection & AI preamble scrubbing
│   ├── memory_manager.py           # Chapter compression → memory stubs for long-term context
│   ├── ollama_client.py            # Ollama HTTP client + model discovery (/api/tags)
│   ├── prompt_builder.py           # Multi-layer prompt assembly + directory discovery
│   ├── validator_engine.py         # [Placeholder] — reserved for future validation
│   │
│   ├── brain_modules/              # Writing intelligence layers (dynamically discovered)
│   │   ├── system.py               # Core system role prompt
│   │   ├── style.py                # Narrative prose & pacing rules
│   │   ├── horror.py               # Atmosphere, tension, combat geography
│   │   ├── crossed_base.py         # Universe law: The Crossed
│   │   └── crossed_specials.py     # High-threat anomaly addendum
│   │
│   └── writing_packs/              # Author voice profiles (dynamically discovered)
│       ├── ennis.py                # Garth Ennis profile
│       ├── king.py                 # Stephen King profile
│       └── mccarthy.py             # Cormac McCarthy profile
│
├── server_routes/                  # Flask API routes
│   ├── __init__.py
│   ├── library_routes.py           # REST API: books CRUD + discovery endpoints
│   └── stream_routes.py            # SSE streaming endpoint for chapter generation
│
└── web_interface/                  # Single-page web application
    ├── templates/
    │   └── base.html               # SPA shell — loading screen, nav, generator, reader panels
    └── static/
        ├── css/
        │   └── theme.css           # Application styling
        ├── js/
        │   ├── main.js             # Navigation, modals, book management, reader view
        │   ├── stream_view.js      # Chapter generation, SSE streaming, dynamic discovery
        │   └── library_3d.js       # Three.js 3D bookshelf visualization
        └── assets/
            ├── audio/              # Ambient audio loops
            ├── covers/             # Book cover art resources
            └── fonts/              # Custom typefaces
```
