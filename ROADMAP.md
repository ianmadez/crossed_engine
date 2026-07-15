# Crossed Engine -- Development Roadmap

> This is an experimental, open-source hobby project inspired by the Crossed universe (Garth Ennis / Jacen Burrows). It has no affiliation with the original works. No copyright infringement intended. The engine has real limitations -- performance depends entirely on your local hardware and the quality of the model you have pulled. It is being actively improved.

---

## Current Baseline Architecture (Achieved)

- **Dynamic Decoupling Framework:** Local model inventory discovery and asynchronous text streaming.
- **State Delta Matrix Calculator:** Sequential history tracking utilizing low-temperature analytical delta sweeps to enforce absolute narrative permanence across chapters.
- **Spatial Isolation Gate:** Dynamic prompt cast filtration quarantining off-screen characters to completely eliminate token-clump bleeding and geographical hallucinations.
- **Dynamic VRAM Scaling Protection:** Runtime token calculation preventing context window overruns on entry-level hardware targets (4GB VRAM limits).

---

## Phase 1: Sequential & Optimized Local Image Generation

**Objective:** Integrate a low-footprint, sequential local diffusion asset pipeline to generate hyper-coherent chapter illustrations without triggering out-of-memory (OOM) VRAM allocation crashes.

### Core Milestones

- **API Integration Gate:** Build an asynchronous connection layer targeting local stable diffusion backends (ComfyUI API, Automatic1111, or local execution pipelines).

- **Hardware-Aware Serialization:** Implement strict process mutual exclusion. The text generation pipeline must completely yield and offload from VRAM before the image diffusion pipeline initializes, protecting the system low-spec threshold.

- **Matrix-Driven Prompt Extraction:** Rather than passing creative prose to the image generator, a dedicated parser will extract visual metadata directly from the structured [LOCATION/TIME], [STATUS], and [LOGISTICS] lines of the State Delta Matrix to generate rock-solid scene prompts.

- **Lightweight Model Validation:** Standardize on fast, hyper-efficient distillation weights (e.g., Flux.Schnell GGUF or SDXL Turbo) running 4-step processing passes for near-instant rendering cycles.

---

## Phase 2: Advanced Brain Module Prompt Optimizations

**Objective:** Refine the runtime prompt assembly engine to push local 8B models to absolute limits of instruction adherence and psychological dread execution.

### Core Milestones

- **Token Budget Compaction:** Audit the active 7-layer context prompt matrix to strip out syntactic redundancy, maximizing space for long-form creative string completions.

- **Dynamic Trajectory Injection:** Expand the Progressive Narrative Trajectory Phase Calculator to inject granular stylistic limits unique to each genre sub-type (e.g., scaling up coppery sensory markers in blood-soaked corridors during acute action phases).

- **Negative Prompt Constraints Enforcement:** Build explicit structural rule-checks that scan generated tokens in real-time to intercept and scrub forbidden phrases, cliche cinematic tropes, or generic safety refusals.

---

## Phase 3: The Local Narrator Engine

**Objective:** Orchestrate a deep, atmospheric audio generation layer capable of transforming raw streaming chapter text into a high-fidelity audio experience.

### Core Milestones

- **Token Stream Pipelining:** Establish a zero-latency audio generation flow that feeds token outputs directly into a local Text-to-Speech (TTS) pipeline in small paragraph chunks.

- **Hyper-Expressive Local Voice Synthesis:** Deploy highly optimized local open-weight speech systems (e.g., Kokoro-82M, Piper, or XTTSv2) capable of handling deep voice modulation, intentional breathing pauses, and intense emotional stress variations.

- **Procedural Soundscape Aggregation:** Wire a sound engine layer that looks up environmental keywords in the saved chapter state ledger (e.g., "desert storm," "distant gunfire," "radio static") and mixes matching low-volume ambient loops dynamically behind the narrator track.
