# app.py
import os
from flask import Flask, render_template, send_from_directory
from core_engine.config import SERVER_HOST, SERVER_PORT
from core_engine.database import init_db
from server_routes.library_routes import library_api
from server_routes.stream_routes import stream_api

# 1. Establish path resolution overrides for our custom UI layer layout
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "web_interface", "templates")
STATIC_DIR = os.path.join(BASE_DIR, "web_interface", "static")

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR
)

# 2. Register modular API blueprints to the master app routing framework
app.register_blueprint(library_api)
app.register_blueprint(stream_api)

# 3. Main Interface View Route
@app.route("/")
def serve_library_vault():
    """Renders the parent single-page application frame layer."""
    return render_template("base.html")

# 4. Global application boot up validation loop
if __name__ == "__main__":
    print("--- VAULT INITIALIZATION STARTING ---")
    # Initialize the local SQLite relational database files if they are missing
    init_db()
    print(f"[SUCCESS]: Local SQLite schema initialized cleanly.")
    print(f"[SERVER]: Launching active loop engine on http://{SERVER_HOST}:{SERVER_PORT}")

    # Fire up the engine server (Debug mode enabled to allow rapid hot-reloading)
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=True)