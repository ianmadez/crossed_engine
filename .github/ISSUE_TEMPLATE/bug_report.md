---
name: 🐛 Bug Report (Strict Verification)
about: Report a narrative deviation, model error, or engine crash.
title: '[BUG]: '
labels: bug, unverified
assignees: ''
---

## 🚨 CRITICAL SUBMISSION REQUIREMENT: REPRODUCIBILITY
> **STOP:** Before filling out this report, you must verify that this issue is **100% reproducible** on a clean instance of the engine. Issues stating "it randomly stopped working" or providing no configuration logs will be closed immediately as untriable.

- [ ] I have verified that this issue occurs consistently under the same conditions.
- [ ] I have tested this bug against a clean database state or provided the exact seed parameters used.

---

### 📝 1. The Broken Behavior
Describe exactly what went wrong. Did the model experience token bleeding? Did a character break a state constraint or geographical boundary?

* **Expected Behavior:** * **Actual Behavior:** ### ⚙️ 2. Runtime Environment & Configurations
Provide the exact system variables active when the failure occurred.

* **Local Ollama Model Used:** (e.g., Dolphin 3.0 Llama 3.1 8B, Llama 3.2 3B)
* **VRAM Safe Scale Toggle Selected:** (e.g., 2048 Context / 4096 Context)
* **Total Chapter Ceiling Value:** * **Active Narrative Resolution Mode:** (Bleak / Hopeful)

### steps 3. Exact Steps to Reproduce
Provide a numbered sequence showing how to force the engine into this exact failure state.

1. Create a new volume run with the title `...`
2. Input these exact Scenario Beats: `...`
3. Advance generation to Chapter `...`
4. Observe the system terminal logs returning:

### 📊 4. Relevant Logs / Matrix Dumps
Paste the exact text output from the `#hud-terminal` view panel or the specific `[CH n STATE MATRIX]` block from your database history ledger that highlights the logic failure.

```text
[Paste terminal error lines or malformed state matrix blocks here]