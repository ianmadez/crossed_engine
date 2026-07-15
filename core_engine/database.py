# core_engine/database.py
import os
import logging
import sqlite3
from .config import DB_PATH, ROLLING_WINDOW_SIZE

# Enforce an absolute path anchor to prevent working-directory drift across sub-processes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
ABS_DB_PATH = DB_PATH if os.path.isabs(DB_PATH) else os.path.join(PARENT_DIR, DB_PATH)

def get_connection():
    """Establishes connection to the local SQLite database and enforces foreign key constraints."""
    conn = sqlite3.connect(ABS_DB_PATH)
    # Enable foreign key support (disabled by default in standard SQLite environments)
    conn.execute("PRAGMA foreign_keys = ON;")
    # Return rows as dictionaries for streamlined frontend JSON mapping
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the structural tables for the expanded virtual vault schema."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Parent Books Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        # Dynamic structural columns detection pass to preserve existing data safely
        cursor.execute("PRAGMA table_info(books);")
        columns = [c[1] for c in cursor.fetchall()]
        if "total_chapters" not in columns:
            cursor.execute("ALTER TABLE books ADD COLUMN total_chapters INTEGER DEFAULT 5;")
        if "ending_type" not in columns:
            cursor.execute("ALTER TABLE books ADD COLUMN ending_type TEXT DEFAULT 'bleak';")
        if "synopsis" not in columns:
            cursor.execute("ALTER TABLE books ADD COLUMN synopsis TEXT DEFAULT '';")
        if "rolling_summary" not in columns:
            cursor.execute("ALTER TABLE books ADD COLUMN rolling_summary TEXT DEFAULT '';")

        # 2. Dynamic Scenario Beats Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scenario_beats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            heading TEXT NOT NULL,
            detail TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );
        """)

        # 3. Relational Character Dossiers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            health_condition TEXT NOT NULL,
            physical_gear TEXT NOT NULL,
            behavioral_traits TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );
        """)
        # Safe migration for new character columns
        cursor.execute("PRAGMA table_info(characters);")
        char_cols = [c[1] for c in cursor.fetchall()]
        if "is_protagonist" not in char_cols:
            cursor.execute("ALTER TABLE characters ADD COLUMN is_protagonist BOOLEAN DEFAULT 0;")
        if "character_type" not in char_cols:
            cursor.execute("ALTER TABLE characters ADD COLUMN character_type TEXT DEFAULT 'survivor';")

        # 4. Relational Chapters Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            chapter_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );
        """)

        # 5. Context Memory Stubs Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_stubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            chapter_number INTEGER NOT NULL,
            stub_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );
        """)

        conn.commit()

        # --- DATABASE OPERATIONS (CRUD ACTIONS) ---

def create_book(title: str, scenario: str, characters: str, total_chapters: int = 5, ending_type: str = "bleak", synopsis: str = "") -> int:
    """Inserts a new volume partition and distributes scenario beats and character dossiers relationally."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # 1. Insert into main books table with one-time generated cinematic summary
        cursor.execute(
            "INSERT INTO books (title, total_chapters, ending_type, synopsis) VALUES (?, ?, ?, ?);", 
            (title, total_chapters, ending_type, synopsis)
        )
        book_id = cursor.lastrowid

        # 2. Parse and insert scenario beats
        for line in scenario.split('\n'):
            if line.startswith('[') and ']: ' in line:
                parts = line.split(']: ', 1)
                heading = parts[0].replace('[', '').strip()
                detail = parts[1].strip()
                cursor.execute(
                    "INSERT INTO scenario_beats (book_id, heading, detail) VALUES (?, ?, ?);",
                    (book_id, heading, detail)
                )

        # 3. Parse and insert characters
        for block in characters.split('\n---\n'):
            lines = block.split('\n')
            name, condition, physical, behavior, char_type, protagonist = "", "", "", "", "survivor", "0"
            for line in lines:
                if line.startswith("NAME:"): 
                    name = line.replace("NAME:", "").strip()
                elif line.startswith("HEALTH STATUS:"): 
                    condition = line.replace("HEALTH STATUS:", "").strip()
                elif line.startswith("PHYSICAL PROFILE:"): 
                    physical = line.replace("PHYSICAL PROFILE:", "").strip()
                elif line.startswith("BEHAVIORAL MATRICES:"): 
                    behavior = line.replace("BEHAVIORAL MATRICES:", "").strip()
                elif line.startswith("CHARACTER_TYPE:"): 
                    char_type = line.replace("CHARACTER_TYPE:", "").strip().lower()
                elif line.startswith("IS_PROTAGONIST:"): 
                    protagonist = line.replace("IS_PROTAGONIST:", "").strip()
            
            if name:
                cursor.execute("""
                    INSERT INTO characters (book_id, name, health_condition, physical_gear, behavioral_traits, character_type, is_protagonist)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (book_id, name, condition, physical, behavior, char_type, protagonist))

        conn.commit()
        return book_id

def delete_book(book_id: int):
    """Deletes a book by its ID. Triggers an automatic database cascade across relational tables."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM books WHERE id = ?;", (book_id,))
        conn.commit()

def get_book_meta(book_id: int) -> dict:
    """Returns structural metadata (total_chapters, ending_type) for a book."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT total_chapters, ending_type FROM books WHERE id = ?;", (book_id,))
        row = cursor.fetchone()
        if row:
            return {"total_chapters": row["total_chapters"], "ending_type": row["ending_type"]}
        return {"total_chapters": 5, "ending_type": "bleak"}


def add_chapter(book_id: int, chapter_number: int, title: str, content: str) -> int:
    """Writes a completed long-form generated chapter run to persistent storage."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chapters (book_id, chapter_number, title, content) VALUES (?, ?, ?, ?);",
            (book_id, chapter_number, title, content)
        )
        conn.commit()
        return cursor.lastrowid

def add_memory_stub(book_id: int, chapter_number: int, stub_text: str) -> int:
    """Saves a compressed structural lore block to maintain light context requirements."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO memory_stubs (book_id, chapter_number, stub_text) VALUES (?, ?, ?);",
            (book_id, chapter_number, stub_text)
        )
        conn.commit()
        return cursor.lastrowid

def find_character_id_by_name(book_id: int, character_name: str) -> int | None:
    """Case-insensitive lookup of a character by name within a book. Returns id or None."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM characters WHERE book_id = ? AND LOWER(name) = LOWER(?);",
            (book_id, character_name)
        )
        row = cursor.fetchone()
        return row["id"] if row else None

def migrate_is_protagonist_for_existing_books():
    """After adding the is_protagonist column, flag the first character in each
    existing book as the default protagonist to prevent empty-cast cold opens.
    Safe to call multiple times — only affects rows where is_protagonist is 0."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE characters SET is_protagonist = 1
            WHERE id IN (
                SELECT MIN(id) FROM characters
                WHERE is_protagonist IS NULL OR is_protagonist = 0
                GROUP BY book_id
            );
        """)
        affected = cursor.rowcount
        conn.commit()
        if affected:
            logging.info(f"[database] Flagged {affected} character(s) as default protagonists for existing books.")
        return affected

def get_all_books() -> list:
    """Retrieves all books and dynamically reconstructs scenario and character strings for UI compatibility."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM books ORDER BY created_at DESC;")
        books = [dict(row) for row in cursor.fetchall()]
        
        for book in books:
            # Reconstruct scenario string from scenario_beats
            cursor.execute("SELECT heading, detail FROM scenario_beats WHERE book_id = ?;", (book["id"],))
            beats = cursor.fetchall()
            book["scenario"] = "\n".join([f"[{b['heading']}]: {b['detail']}" for b in beats])
            
            # Reconstruct characters string from characters
            cursor.execute("SELECT * FROM characters WHERE book_id = ?;", (book["id"],))
            chars = cursor.fetchall()
            char_blocks = []
            for c in chars:
                char_blocks.append(
                    f"NAME: {c['name']}\n"
                    f"HEALTH STATUS: {c['health_condition']}\n"
                    f"PHYSICAL PROFILE: {c['physical_gear']}\n"
                    f"BEHAVIORAL MATRICES: {c['behavioral_traits']}\n"
                    f"IS_PROTAGONIST: {c['is_protagonist']}\n"
                    f"CHARACTER_TYPE: {c['character_type']}"
                )
            book["characters"] = "\n---\n".join(char_blocks)
        return books

def get_book_chapters(book_id: int) -> list:
    """Fetches full multi-chapter narratives tied to a targeted shelf volume partition."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_number ASC;", (book_id,))
        return [dict(row) for row in cursor.fetchall()]

def compile_historical_context(book_id: int, window_size: int = ROLLING_WINDOW_SIZE) -> str:
    """Compiles compressed memory stubs into a bounded context block.
    Returns the rolling_summary (condensed history older than the window)
    plus raw stubs from the last `window_size` chapters only.
    This prevents linear prompt growth for local 7B models."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Fetch rolling summary (condensed history for everything outside the window)
        cursor.execute("SELECT rolling_summary FROM books WHERE id = ?;", (book_id,))
        book_row = cursor.fetchone()
        rolling = book_row["rolling_summary"].strip() if book_row else ""

        # Fetch only the last N raw stubs
        cursor.execute("""
            SELECT stub_text FROM memory_stubs
            WHERE book_id = ?
            ORDER BY chapter_number DESC
            LIMIT ?;
        """, (book_id, window_size))
        rows = cursor.fetchall()
        recent_stubs = "\n".join([row["stub_text"] for row in reversed(rows)])

        parts = []
        if rolling:
            parts.append(f"[ROLLING SUMMARY - PRIOR EVENTS]\n{rolling}")
        if recent_stubs:
            parts.append(recent_stubs)

        return "\n\n".join(parts) if parts else ""

def consolidate_rolling_summary(book_id: int, chapter_num: int, window_size: int = ROLLING_WINDOW_SIZE):
    """Called once per chapter after the new memory stub is committed.
    If chapter_num > window_size, the stub at (chapter_num - window_size)
    has aged out. This function folds it into rolling_summary and deletes it.
    Never re-touches already-folded content."""
    if chapter_num <= window_size:
        return  # Still within the active window, nothing to fold

    stub_to_fold = chapter_num - window_size

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get the stub that aged out
        cursor.execute(
            "SELECT id, stub_text FROM memory_stubs WHERE book_id = ? AND chapter_number = ?;",
            (book_id, stub_to_fold)
        )
        row = cursor.fetchone()
        if not row:
            return  # Already deleted or doesn't exist

        stub_id = row["id"]
        stub_text = row["stub_text"]

        # Get current rolling_summary
        cursor.execute("SELECT rolling_summary FROM books WHERE id = ?;", (book_id,))
        book_row = cursor.fetchone()
        current_summary = book_row["rolling_summary"].strip() if book_row else ""

        # Append the aged-out stub to the rolling summary
        if current_summary:
            updated_summary = current_summary + "\n" + stub_text
        else:
            updated_summary = stub_text

        # Write back and delete the folded stub
        cursor.execute(
            "UPDATE books SET rolling_summary = ? WHERE id = ?;",
            (updated_summary, book_id)
        )
        cursor.execute("DELETE FROM memory_stubs WHERE id = ?;", (stub_id,))
        conn.commit()

def update_character_state(character_id: int, physical: str, behavior: str, status: str):
    """Allows Human-in-the-Loop manual editing updates using correct column targets."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE characters
        SET physical_gear = ?, behavioral_traits = ?, health_condition = ?
        WHERE id = ?;
        """, (physical, behavior, status, character_id))
        conn.commit()

def compile_dossier_context(book_id: int) -> str:
    """Compiles all character rows using correct table columns into a clean Markdown block for context injection."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM characters WHERE book_id = ?;", (book_id,))
        rows = cursor.fetchall()

        if not rows:
            return "ACTIVE SURVIVOR CAST: None defined."

        manifest = ["# ACTIVE SURVIVOR CAST VECTOR MATRIX (DO NOT HALUCINATE EVOLUTION)"]
        for row in rows:
            manifest.append(
                f"- NAME: {row['name']}\n"
                f"  CURRENT HEALTH: {row['health_condition']}\n"
                f"  PHYSICAL DESCRIPTION: {row['physical_gear']}\n"
                f"  BEHAVIORAL PROFILE: {row['behavioral_traits']}\n"
                f"  IS_PROTAGONIST: {row['is_protagonist']}\n"
                f"  CHARACTER_TYPE: {row['character_type']}"
            )
        return "\n".join(manifest)
        
def add_scenario_beat(book_id: int, heading: str, detail: str):
    """Inserts an isolated configuration scenario component block."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO scenario_beats (book_id, heading, detail) VALUES (?, ?, ?);",
            (book_id, heading, detail)
        )
        conn.commit()

def add_character_dossier(book_id: int, name: str, condition: str, physical: str, behavior: str, character_type: str = "survivor", is_protagonist: int = 0):
    """Saves a structured, isolated survivor state vector record."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO characters (book_id, name, health_condition, physical_gear, behavioral_traits, character_type, is_protagonist)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (book_id, name, condition, physical, behavior, character_type, is_protagonist))
        conn.commit()