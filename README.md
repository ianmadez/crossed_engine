# Crossed Engine
<img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/fd0923df-a03b-44e5-87e6-02d5705e092c" />

A **fully local, fully free, open-source** interactive, uncensored horror fiction engine powered by Ollama. Build story volumes in fully unrestrained narrative detail, configure world scenarios and survivor dossiers, generate chapters via a local LLM, and read them in a dark Crossed-themed reader all running 100% offline on your own hardware. 

The cool thing is, you could flip this into a completely different themed story generator. See **[ARCHITECTURE.md](ARCHITECTURE.md)**, and for agents: **[AGENTS.md](AGENTS.md)**.

> **Inspired by, and in no way affiliated or meant to rip-off:** The Crossed universe (Garth Ennis / Jacen Burrows)

---

## Features

- **Local AI Generation**: Chapter-by-chapter streaming via Ollama, no cloud dependency. A built-in pacing lock prevents the AI from rushing, where every chapter unfolds minute by minute with full conversations, spatial awareness, and internal monologue.
<img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/6d7aa2d6-939c-4d1b-abd0-14eefb107bc0" />

- **Dynamic Model Selection**: Discover and swap out any model pulled into your Ollama instance directly from the UI

- **Author Style Profiles**:  Swap between King, McCarthy, Ennis, or add your own writing packs

- **State Delta Memory**: The engine doesn't write each chapter in a vacuum. After every chapter, it extracts a precise snapshot of where everyone is, what they're carrying, and how badly they're hurt. Before the next chapter, it compares what changed and carries everything else forward unchanged. Characters don't teleport or have gear magically respawning.

- **Ambient Audio**: Optional background atmosphere track with volume control

- **SSE Streaming**: Real-time token-by-token prose rendering in the browser

---

## Prerequisites

- **Python 3.10+**
- **Ollama** — installed and running on `localhost:11434`
- **At least one model pulled** — see the curated suggestions below for recommended options

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd crossed_engine

# 2. Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
# source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Verify Ollama is running
ollama list

# 5. Start the application
python app.py
```

Open your browser to **http://127.0.0.1:8000**

---

## Suggested Uncensored Local Models

The engine dynamically discovers whichever models you have pulled in your local Ollama instance. Below is a curated list of recommended unaligned and uncensored models ranging from a lightweight 3B up to a 24B parameter density.

---

### ⚡ 1. Lightweight Tier (3B)
*Highly optimized for entry-level GPU VRAM boundaries (such as a 4GB GTX 1650). Yields exceptionally fast generation cycles and rapid debugging passes.*

* **Llama 3.2 Uncensored 3B**
  * **Description:** A compact, rapid model fine-tuned to bypass standard mobile guardrails. Provides snappy token-to-token typing output.
  * **Terminal Command:**
    ```bash
    ollama pull artifish/llama3.2-uncensored
    ```

* **Dolphin Phi 2.7B**
  * **Description:** An uncensored variant utilizing Microsoft's Phi layout architecture, providing robust reasoning capacity relative to its small deployment footprint.
  * **Terminal Command:**
    ```bash
    ollama pull dolphin-phi
    ```

---

### 🎯 2. Performance Sweet Spot (7B – 9B)
*The absolute ideal tier for local hardware deployments. Provides deep narrative complexity, firm constraint tracking, and excellent prose pacing.*

* **Dolphin 3.0 Llama 3.1 8B (Q4_0 VRAM Fit)**
  * **Description:** Next-generation general-purpose model built on Llama 3.1. Features advanced agentic compliance, native ChatML formatting, and zero safety friction. Explicitly targets the ultra-lean Q4_0 block size to protect low-spec VRAM setups.
  * **Hardware Note:** *Verified active on GTX 1650 — runs smoothly with optimal pacing rules enabled.*
  * **Terminal Command:**
    ```bash
    ollama pull hf.co/cognitivecomputations/Dolphin3.0-Llama3.1-8B-GGUF:Q4_0
    ```

* **Dolphin 2.9 Llama 3 8B**
  * **Description:** An immensely compliant, high-instruction baseline model with excellent memory retrieval capabilities over extended story timelines.
  * **Terminal Command:**
    ```bash
    ollama pull dolphin-llama3
    ```

---

### ⛓️ 3. Mid-Range Tier (13B – 15B)
*Delivers advanced descriptive vocabulary depth and heavy prompt saturation protection with moderate text computation pauses.*

* **WizardLM Uncensored 13B**
  * **Description:** A classic, highly descriptive baseline uncensored model based on Llama architecture, optimized specifically to strip out safety alignment filters.
  * **Terminal Command:**
    ```bash
    ollama pull wizardlm-uncensored:13b
    ```

* **DolphinCoder 15B**
  * **Description:** Eric Hartford's uncensored model based on the StarCoder2 structure. Its code-centric training maps exceptionally well to parsing structural tracking stubs and state matrix data arrays.
  * **Terminal Command:**
    ```bash
    ollama pull dolphincoder:15b
    ```

---

### 🛑 4. High-Density Tier (22B – 24B)
*Maximum possible logical complexity and situational tracking scale. Runs with structural timeline offloading to CPU system RAM on lower-spec hardware profiles.*

* **Dolphin 2.9.1 Mixtral 1x22B (Q4_K_M)**
  * **Description:** A completely unaligned, high-instruction single expert model extracted directly from the massive Mixtral 8x22B framework. Outstanding at structural prose.
  * **Terminal Command:**
    ```bash
    ollama pull hf.co/bartowski/dolphin-2.9.1-mixtral-1x22b-GGUF:Q4_K_M
    ```

* **Mistral Small Abliterated 24B**
  * **Description:** A 24B architecture built for complex, multi-layered constraint tracking with zero-refusal creative boundaries.
  * **Terminal Command:**
    ```bash
    ollama pull huihui_ai/mistral-small-abliterated
    ```
---

## Configuration

All hardware-specific parameters live in **`settings.json`** at the project root:

```json
{
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
```

Edit `settings.json`, restart the server, and the new values apply immediately.

---

## Usage

### 1. Create a Book Volume
Click **"Create New Volume"** on the Library Shelf. Fill in:
- **Book Title**: name your story

- **World Scenario Config**: location, time, weather, environmental rules (add as many beats as you like)

- **Main Characters**: name, health, appearance, behavioral traits per survivor

### 2. Generate Chapters
Navigate to the **Generator** panel:
- **Select a model**: auto-detected from your Ollama instance
- **Choose an author style profile**: King, McCarthy, Ennis, or a custom pack you added
- **Set context scale**: 4096 (default) for GTX 1650, 2048 for low-spec hardware
- **Toggle threat behavior**: enables high-threat special Crossed appearances
- Click **"Forge Next Chapter"** and watch the prose stream in real-time

### 3. Read
Navigate to **Reader Mode** to browse all generated chapters with a table-of-contents jump navigation.

---

## How the Engine Works

The engine uses a two-phase cycle to write fiction that stays coherent across many chapters.

**Phase 1 — Write a chapter.** 
You configure your world (location, time, environmental rules) and your characters (name, appearance, gear, personality). When you click "Forge Next Chapter," the engine bundles everything together — your setup, the author voice profile you selected, the history of what's happened so far, and a set of pacing rules that force the AI to write slowly and deliberately. The text streams into your browser token by token, so you watch the story being written in real time.

**Phase 2 — Take inventory.** 
As soon as the chapter finishes, a second AI pass scans the text with surgical precision. It extracts a structured snapshot:
- Where the characters are and how much time has passed
- Every character's physical condition and mental state
- What gear, weapons, and supplies are still with them
- What threats are immediately nearby

And the important part is that it doesn't start from scratch. It pulls up the snapshot from the *previous* chapter and compares the two. If a character was holding a knife in the last chapter and the new chapter never mentions dropping it, the knife stays in their hand. If someone had a gash on their arm and the text doesn't describe it being treated, the wound is still there.

> **The golden rule: silence means nothing changed.** The engine really is an index calculator, not a creative writer per se. If the new text doesn't explicitly say something changed, it assumes everything is exactly as it was.

This snapshot is then fed into the next chapter's prompt, so the AI never has to guess where things left off. It sees the exact state of the world — locations, injuries, inventory, threats — and writes the next chapter from that solid foundation.

The result: characters don't teleport, injuries don't magically heal, gear doesn't appear out of nowhere. Each chapter builds on the last one with surgical continuity.

---

## Adding Writing Packs

Create a new `.py` file in `core_engine/writing_packs/`:

```python
# core_engine/writing_packs/<your_name>.py
PACK_RULES = """
PROFILE: YOUR NAME
- Rule one
- Rule two
"""
```

The engine auto-discovers it, no HTML or route changes needed. It will appear in the dropdown.

---

## Adding Brain Modules

Create a new `.py` file in `core_engine/brain_modules/` with a string constant, then import it into `prompt_builder.py` and add it to the prompt manifest.

---

## Project Structure

See [FILE_TREE.md](FILE_TREE.md) for a complete annotated tree.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system layers, data flow diagrams, and extension points.

---

## License

This project is open-source. See the LICENSE file for details.
