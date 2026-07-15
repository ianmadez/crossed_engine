// web_interface/static/js/stream_view.js

// Internal state storage vectors resolved via modal creation hooks
let activeScenarioContext = "";
let activeCharacterContext = "";

/**
 * Hook triggered by main.js to pass setup values directly to the generator view.
 * Also triggers model + pack discovery to populate dynamic dropdowns.
 */
function initCrucibleInterface(scenario, characters) {
    activeScenarioContext = scenario;
    activeCharacterContext = characters;
    const terminal = document.getElementById('hud-terminal');
    terminal.innerHTML += `<p class="sys-msg">[Setup]: Prompt matrices mapped cleanly inside session cache.</p>`;
    terminal.scrollTop = terminal.scrollHeight;

    // If book is complete, lock down the generator panel
    if (typeof currentBookComplete !== 'undefined' && currentBookComplete) {
        const forgeBtn = document.querySelector('.action-btn[onclick*="triggerChapterGeneration"]');
        if (forgeBtn) {
            forgeBtn.disabled = true;
            forgeBtn.textContent = '[RECORD CONCLUDED]';
            forgeBtn.style.opacity = '0.4';
            forgeBtn.style.cursor = 'not-allowed';
        }
        // Grey out all config inputs
        document.querySelectorAll('#model-selection, #pack-selection, #context-scale-selection, #threat-toggle, #two-pass-toggle')
            .forEach(el => { el.disabled = true; el.style.opacity = '0.4'; });
    }
    
    // Fire dynamic discovery fetches when entering the generator view
    fetchModelList();
    fetchPackList();
}

/**
 * Queries /api/discover/models and populates the model-selection dropdown.
 * Keeps any user-selected value stable across re-population.
 */
function fetchModelList() {
    const modelSelect = document.getElementById('model-selection');
    if (!modelSelect) return;

    const previouslySelected = modelSelect.value;

    fetch('/api/discover/models')
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success' && response.data.length > 0) {
                // Clear placeholder
                modelSelect.innerHTML = '';
                response.data.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model.name;
                    opt.textContent = model.name;
                    modelSelect.appendChild(opt);
                });
                // Restore previous selection if still valid, else pick first
                if (previouslySelected && [...modelSelect.options].some(o => o.value === previouslySelected)) {
                    modelSelect.value = previouslySelected;
                }
            }
        })
        .catch(err => console.warn("Model discovery fetch failed:", err));
}

/**
 * Queries /api/discover/packs and merges discovered packs into the
 * existing pack-selection dropdown without removing the hardcoded options.
 */
function fetchPackList() {
    const packSelect = document.getElementById('pack-selection');
    if (!packSelect) return;

    fetch('/api/discover/packs')
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success' && response.data.length > 0) {
                // Collect existing value strings so we don't duplicate
                const existingValues = new Set();
                for (let i = 0; i < packSelect.options.length; i++) {
                    existingValues.add(packSelect.options[i].value);
                }
                // Append any packs not already listed in the hardcoded set
                response.data.forEach(packName => {
                    if (!existingValues.has(packName)) {
                        const opt = document.createElement('option');
                        opt.value = packName;
                        opt.textContent = packName.charAt(0).toUpperCase() + packName.slice(1);
                        packSelect.appendChild(opt);
                    }
                });
            }
        })
        .catch(err => console.warn("Pack discovery fetch failed:", err));
}

/**
 * Opens the line connection to the Server-Sent Events endpoint and parses the incoming data payload
 */
function triggerChapterGeneration() {
    if (!currentBookId) {
        alert("Initialize a volume ledger timeline partition via the bookshelf first.");
        return;
    }

    const textCanvas = document.getElementById('live-text-canvas');
    const terminal = document.getElementById('hud-terminal');
    const packName = document.getElementById('pack-selection').value;
    const specialThreat = document.getElementById('threat-toggle').checked;
    const modelName = document.getElementById('model-selection').value;

    // CAPTURE NEW HARDWARE VALUES DYNAMICALLY
    const contextScale = parseInt(document.getElementById('context-scale-selection').value) || 4096;

    textCanvas.innerHTML = "";
    terminal.innerHTML += `<p class="sys-msg" style="color: #d1c7bd;">[Engine]: Initializing streaming connection loop constraints (Scale: ${contextScale} tokens)...</p>`;
    terminal.scrollTop = terminal.scrollHeight;

    let totalTokensReceived = 0;

    const requestPayload = {
        book_id: currentBookId,
        chapter_num: currentChapterNum,
        title: `Chapter ${currentChapterNum}`,
        scenario: activeScenarioContext,
        characters: activeCharacterContext,
        pack_name: packName || null,
        special_threat: specialThreat,
        context_scale: contextScale,
        model_name: modelName || null,
        two_pass: document.getElementById('two-pass-toggle').checked
    };

    fetch('/api/stream-forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
    })
    .then(response => {
        if (!response.body) throw new Error("Server transmission context frame is unreadable.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        return function readStreamChunk() {
            return reader.read().then(({ done, value }) => {
                if (done) return;

                const rawString = decoder.decode(value, { stream: true });
                const packetLines = rawString.split('\n\n');

                packetLines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.token) {
                                totalTokensReceived++;
                                const textNode = document.createTextNode(data.token);
                                textCanvas.appendChild(textNode);
                                textCanvas.scrollTop = textCanvas.scrollHeight;
                            }
                            if (data.done) {
                                if (totalTokensReceived === 0) {
                                    const errorOverlay = document.getElementById('critical-error-overlay');
                                    if (errorOverlay) {
                                        document.getElementById('error-status-msg').textContent = "DATA LINK SHUTDOWN: Stream returned empty textual matrix.";
                                        errorOverlay.classList.remove('hidden');
                                    }
                                    return;
                                }
                                terminal.innerHTML += `<p class="sys-msg" style="color: #4a8c4a;">[Success]: Prose chunk write resolved. Memory matrix stub updated safely.</p>`;
                                if (data.summary_stub) {
                                    terminal.innerHTML += `<div style="color: #bfa393; font-size: 0.8rem; margin: 5px 0; padding-left: 5px; border-left: 2px solid #8c2323;">${data.summary_stub}</div>`;
                                }
                                terminal.scrollTop = terminal.scrollHeight;
                                currentChapterNum++;
                            }
                        } catch (e) {}
                    }
                });
                return readStreamChunk();
            });
        }();
    })
    .catch(err => {
        const errorOverlay = document.getElementById('critical-error-overlay');
        if (errorOverlay) {
            errorOverlay.classList.remove('hidden');
        }
        terminal.innerHTML += `<p class="sys-msg" style="color: #8c2323;">[Critical Failure]: Network link dropped execution traces.</p>`;
        terminal.scrollTop = terminal.scrollHeight;
    });
}