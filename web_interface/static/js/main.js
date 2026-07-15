// web_interface/static/js/main.js

// App Core State Control Variables
let currentBookId = null;
let currentChapterNum = 1;
let currentBookComplete = false;
let isAudioMuted = true;
let targetedVolumeLevel = 0.35;

/**
 * Handles clean switching between application panels without disrupting animation or streaming loops
 */
function navigateView(viewName) {
    // Boundary quarantine — block generator access for completed books
    if (viewName === 'generator' && currentBookComplete) {
        navigateView('reader');
        return;
    }

    const views = ['shelf', 'generator', 'reader'];

    views.forEach(v => {
        const element = document.getElementById(`view-${v}`);
        if (element) {
            if (v === viewName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    });

    // Toggle nav button active style states
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(viewName)) {
            btn.classList.add('active');
        } else if (btn.id !== 'audio-toggle-btn') {
            btn.classList.remove('active');
        }
    });

    // Close the audio panel dropdown automatically if you navigate away
    const mixer = document.getElementById('audio-mixer-panel');
    if (mixer) mixer.classList.add('hidden');

    // Optimization check: Hide the Three.js WebGL canvas context loop when off the shelf screen
    const shelfCanvas = document.getElementById('three-shelf-canvas');
    if (shelfCanvas) {
        shelfCanvas.style.display = (viewName === 'shelf') ? 'block' : 'none';
    }

    // RE-FETCH FRESH LEDGER RECORDS IF SWAPPING TO THE SHELF MATRIX
    if (viewName === 'shelf') {
        loadVolumesFromServer();
    }
}

/**
 * Toggles the visibility state of the embedded dropdown audio control options drawer
 */
function toggleAudioPanel() {
    const mixer = document.getElementById('audio-mixer-panel');
    if (mixer) {
        mixer.classList.toggle('hidden');
    }
}

/**
 * Updates track volume variables directly from the panel slider value alterations
 */
function adjustVolumeChannels() {
    const audioTrack = document.getElementById('ambient-audio');
    const slider = document.getElementById('volume-ambience');
    const label = document.getElementById('ambience-vol-label');

    if (!audioTrack || !slider || !label) return;

    targetedVolumeLevel = slider.value / 100;
    label.innerText = `${slider.value}%`;

    if (!isAudioMuted) {
        audioTrack.volume = targetedVolumeLevel;
    }
}

/**
 * Cycles the physical play state of the single track background ambient environment loop
 */
function toggleMuteState() {
    const audioTrack = document.getElementById('ambient-audio');
    const toggleBtn = document.getElementById('audio-toggle-btn');
    const mixerBtn = document.getElementById('mixer-mute-btn');

    if (!audioTrack || !toggleBtn || !mixerBtn) return;

    if (isAudioMuted) {
        audioTrack.volume = targetedVolumeLevel;
        audioTrack.play()
            .then(() => {
                isAudioMuted = false;
                toggleBtn.innerText = "🔊 Sound On";
                mixerBtn.innerText = "Mute Track";
            })
            .catch(err => console.warn("Audio playback initialization blocked by browser user-interaction rules:", err));
    } else {
        audioTrack.pause();
        isAudioMuted = true;
        toggleBtn.innerText = "🔇 Muted";
        mixerBtn.innerText = "Unmute Track";
    }
}

/**
 * Dynamically appends an event or environmental vector block to the setup form
 */
function addModalScenarioRow() {
    const container = document.getElementById('modal-scenarios-container');
    if (!container) return;

    const rowId = 'scenario-row-' + Date.now();
    const scenarioRow = document.createElement('div');
    scenarioRow.id = rowId;
    scenarioRow.className = 'scenario-input-block';
    scenarioRow.style = `
        border: 1px dashed #3d302a; padding: 10px; margin-bottom: 10px; 
        background: #0a0807; display: flex; flex-direction: column; gap: 8px; position: relative;
        width: 100%; box-sizing: border-box;
    `;

    scenarioRow.innerHTML = `
        <button type="button" class="nav-btn" style="position: absolute; right: 5px; top: 5px; padding: 2px 6px; font-size: 0.75rem; border-color: #8c2323; color: #8c2323;" onclick="document.getElementById('${rowId}').remove()">✕</button>
        <div style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Story Variable</label>
                <input type="text" class="scene-heading" placeholder="e.g., Story Location, Time, Weather, etc..." style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box;">
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px; width: 100%; box-sizing: border-box;">
            <label style="font-size: 0.7rem; color: #bfa393;">Detail Specifications</label>
            <textarea class="scene-detail" placeholder="Enter explicit environmental constraints or rules..." rows="2" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box; resize: none;"></textarea>
        </div>
    `;
    container.appendChild(scenarioRow);
    container.scrollTop = container.scrollHeight;
}

/**
 * Dynamically appends a new character profile row inside the setup form container
 */
function addModalCharacterRow() {
    const container = document.getElementById('modal-characters-container');
    if (!container) return;

    const rowId = 'char-row-' + Date.now();
    const charRow = document.createElement('div');
    charRow.id = rowId;
    charRow.className = 'character-input-block';
    charRow.style = `
        border: 1px dashed #3d302a; padding: 10px; margin-bottom: 10px; 
        background: #0a0807; display: flex; flex-direction: column; gap: 8px; position: relative;
        width: 100%; box-sizing: border-box;
    `;

    charRow.innerHTML = `
        <button type="button" class="nav-btn" style="position: absolute; right: 5px; top: 5px; padding: 2px 6px; font-size: 0.75rem; border-color: #8c2323; color: #8c2323;" onclick="document.getElementById('${rowId}').remove()">✕</button>
        <div style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Character Name</label>
                <input type="text" class="char-name" placeholder="e.g., Li Wei" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Initial Condition</label>
                <input type="text" class="char-condition" placeholder="e.g., Healthy, Scratched cheek" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box;">
            </div>
        </div>
        <div style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Physical Appearance & Gear</label>
                <input type="text" class="char-physical" placeholder="e.g., Dark jacket, holding utility knife" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Behavioral Profile / Traits</label>
                <input type="text" class="char-behavior" placeholder="e.g., Highly anxious, protective" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box;">
            </div>
        </div>
        <div style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Character Type</label>
                <select class="char-type" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 6px; font-family: inherit; box-sizing: border-box; cursor: pointer;">
                    <option value="survivor">Survivor</option>
                    <option value="infected">Infected (Crossed)</option>
                </select>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <label style="font-size: 0.7rem; color: #bfa393;">Protagonist</label>
                <div style="display: flex; align-items: center; height: 32px; gap: 8px;">
                    <input type="checkbox" class="char-protagonist" style="accent-color: #8c2323; transform: scale(1.2);">
                    <span style="font-size: 0.75rem; color: #bfa393;">Is main character</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(charRow);
    container.scrollTop = container.scrollHeight;
}

/**
 * Spawns a cleanly organized user onboarding form overlay styled like a field notebook folder
 */
function openNewVolumeModal() {
    if (document.getElementById('modal-overlay-wrapper')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-overlay-wrapper';
    modalOverlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(12, 10, 9, 0.96); z-index: 999;
        display: flex; align-items: center; justify-content: center;
    `;

    modalOverlay.innerHTML = `
        <div class="overlay-panel" style="width: 600px; max-height: 95vh; display: flex; flex-direction: column; border: 3px solid #000; background: #1a1412; box-shadow: 10px 10px 0px #000; overflow: hidden; padding: 30px; box-sizing: border-box;">
            <h2 style="font-family: 'ShenzenIndustrial', sans-serif; margin-bottom: 5px; color: #8c2323;">New Book Settings</h2>
            <p style="font-size: 0.85rem; color: #bfa393; margin-bottom: 15px; border-bottom: 1px dashed #3d302a; padding-bottom: 10px;">Build your own Crossed story.</p>
            
            <div style="flex-grow: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
                <div style="display: flex; flex-direction: column; gap: 5px; width: 100%; box-sizing: border-box;">
                    <label style="font-size: 0.8rem; color: #bfa393;">Book Title</label>
                    <input type="text" id="modal-title-input" placeholder="e.g., Dead Run Volume 1..." style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 10px; font-family: inherit; box-sizing: border-box;">
                </div>

                <div style="display: flex; gap: 15px; width: 100%; box-sizing: border-box;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.8rem; color: #bfa393;">Total Chapter Ceiling</label>
                        <input type="number" id="modal-chapters-count" min="3" max="12" value="5" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 10px; font-family: inherit; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.8rem; color: #bfa393;">Narrative Resolution Mode</label>
                        <select id="modal-ending-type" style="width: 100%; background: #000; border: 1px solid #3d302a; color: #d9d2c9; padding: 10px; font-family: inherit; box-sizing: border-box; cursor: pointer;">
                            <option value="bleak">Absolute Bleak Devastation</option>
                            <option value="hopeful">Bitter Hopeful Escape</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 5px; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; width: 100%; box-sizing: border-box;">
                        <label style="font-size: 0.8rem; color: #bfa393;">World Scenario Config</label>
                        <button type="button" class="action-btn" style="padding: 2px 10px; font-size: 0.8rem;" onclick="addModalScenarioRow()">+ Add Context Beat</button>
                    </div>
                    <div id="modal-scenarios-container" style="max-height: 180px; overflow-y: auto; background: #120f0d; border: 1px solid #3d302a; padding: 10px; width: 100%; box-sizing: border-box;">
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 5px; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; width: 100%; box-sizing: border-box;">
                        <label style="font-size: 0.8rem; color: #bfa393;">Main Characters</label>
                        <button type="button" class="action-btn" style="padding: 2px 10px; font-size: 0.8rem;" onclick="addModalCharacterRow()">+ Add Character</button>
                    </div>
                    <div id="modal-characters-container" style="max-height: 220px; overflow-y: auto; background: #120f0d; border: 1px solid #3d302a; padding: 10px; width: 100%; box-sizing: border-box;">
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 1px dashed #3d302a; padding-top: 15px; width: 100%; box-sizing: border-box;">
                <button class="nav-btn" onclick="document.getElementById('modal-overlay-wrapper').remove()">Discard</button>
                <button class="action-btn" onclick="submitNewVolumeRun()">Initialize Volume</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    // Auto-seed baseline structural fields right away
    addModalScenarioRow();
    addModalCharacterRow();
}

/**
 * Validates inputs, serializes multi-block dynamic context layouts, and maps them to database records
 */
function submitNewVolumeRun() {
    const titleText = document.getElementById('modal-title-input').value;
    const title = titleText.trim() || "Untitled Volume Run";

    // 1. Serialize dynamic scenario vector arrays
    const scenarioBlocks = document.querySelectorAll('.scenario-input-block');
    const scenarioBeatsArray = [];

    scenarioBlocks.forEach(block => {
        const heading = block.querySelector('.scene-heading').value.trim();
        const detail = block.querySelector('.scene-detail').value.trim();
        if (heading && detail) {
            scenarioBeatsArray.push(`[${heading.toUpperCase()}]: ${detail}`);
        }
    });

    const scenario = scenarioBeatsArray.join('\n');

    // 2. Serialize dynamic character dossiers
    const characterBlocks = document.querySelectorAll('.character-input-block');
    const characterProfilesArray = [];

    characterBlocks.forEach(block => {
        const name = block.querySelector('.char-name').value.trim();
        const condition = block.querySelector('.char-condition').value.trim();
        const physical = block.querySelector('.char-physical').value.trim();
        const behavior = block.querySelector('.char-behavior').value.trim();
        const charType = block.querySelector('.char-type').value;
        const isProtagonist = block.querySelector('.char-protagonist').checked ? 1 : 0;

        if (name) {
            characterProfilesArray.push(
                `NAME: ${name}\n` +
                `HEALTH STATUS: ${condition || 'Healthy'}\n` +
                `PHYSICAL PROFILE: ${physical || 'Standard gear'}\n` +
                `BEHAVIORAL MATRICES: ${behavior || 'Pragmatic focus'}\n` +
                `CHARACTER_TYPE: ${charType}\n` +
                `IS_PROTAGONIST: ${isProtagonist}`
            );
        }
    });

    const characters = characterProfilesArray.join('\n---\n');

    if (scenarioBeatsArray.length === 0 || characterProfilesArray.length === 0) {
        alert("The setup layer requires at least one world context beat and one survivor dossier.");
        return;
    }

    const totalChapters = parseInt(document.getElementById('modal-chapters-count').value) || 5;
    const endingType = document.getElementById('modal-ending-type').value || 'bleak';

    fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scenario, characters, total_chapters: totalChapters, ending_type: endingType })
    })
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                currentBookId = response.book_id;
                currentChapterNum = 1;

                document.getElementById('modal-overlay-wrapper').remove();
                navigateView('generator');

                if (typeof initCrucibleInterface === 'function') {
                    initCrucibleInterface(scenario, characters);
                }
            } else {
                alert("Database tracking setup failed: " + response.message);
            }
        })
        .catch(err => console.error("Network response tracking cycle failed to resolve properly:", err));
}

// Global click wrapper hook to cleanly collapse the sound settings drawer if clicking out side bounds
window.addEventListener('click', (e) => {
    const panel = document.getElementById('audio-mixer-panel');
    const toggleBtn = document.getElementById('audio-toggle-btn');
    if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== toggleBtn) {
        panel.classList.add('hidden');
    }
});

// Append directly to the end of web_interface/static/js/main.js

// web_interface/static/js/main.js

// --- REPLACE WITH ---
/**
 * Operates a 4-second real-time loading bar layout sequence on app launch
 * Cyclically shifts dark, thematic Crossed universe markers to ground the user tension context.
 */
function handleSystemBootLoader() {
    const loader = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-bar-progress');
    const subtext = loader ? loader.querySelector('.loading-subtext') : null;
    if (!loader || !progressBar) return;

    // Curated atmospheric horror survival markers
    const phrases = [
        "June 12, 2008. The day the world changed forever.",
        "Watch their faces. If you see the cross, you run.",
        "They remember your name. They know how to lie.",
        "Don't try to help them. There is nothing left inside but the urge to hurt.",
        "The shortwave radio is just static now. The evacuation points aren't responding.",
        "Keep your grip tight on the wrench. Don't blink. Don't slow down."
    ];

    let progress = 0;
    const duration = 6000; // Locked down to exactly 6 seconds total run boundary
    const intervalTime = 40;
    const increment = (intervalTime / duration) * 100;
    
    // Explicitly defines the text rotation speed milestone limit (2000ms = 2 seconds per phrase)
    const msPerTextChange = 2000; 

    const loaderTimer = setInterval(() => {
        progress += increment;

        // Calculates absolute elapsed time to shift the phrase index exactly every 2 seconds
        if (subtext) {
            const currentElapsedMs = (progress / 100) * duration;
            const phraseIndex = Math.min(Math.floor(currentElapsedMs / msPerTextChange), phrases.length - 1);
            
            if (subtext.innerText !== phrases[phraseIndex]) {
                subtext.innerText = phrases[phraseIndex];
            }
        }

        if (progress >= 100) {
            progressBar.style.width = '100%';
            clearInterval(loaderTimer);

            // Execute clean fading sequence animations
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.visibility = 'hidden';
                // Shutdown the heavy background animation engine loops when loading screen terminates to save VRAM
                if (window.stopLoadingSceneLoop) window.stopLoadingSceneLoop();
            }, 800);
        } else {
            progressBar.style.width = `${progress}%`;
        }
    }, intervalTime);
}

/**
 * Global interface helper rules to clear error notifications
 */
function dismissErrorOverlay() {
    const errorScreen = document.getElementById('critical-error-overlay');
    if (errorScreen) {
        errorScreen.classList.add('hidden');
    }
}

// Register boot engine sequence directly into window loader stack
window.addEventListener('DOMContentLoaded', handleSystemBootLoader);

/**
 * Queries the local API for all saved volumes and renders them on the library shelf
 */
/**
 * Queries the local API for all saved volumes and renders them on the library shelf
 */
function loadVolumesFromServer() {
    const shelfContainer = document.getElementById('view-shelf');
    if (!shelfContainer) return;

    fetch('/api/books')
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                renderShelfCatalog(response.data);
            }
        })
        .catch(err => console.error("Failed to fetch library volumes from database:", err));
}

/**
 * Generates the clean HTML list structure inside the shelf overlay panel (Screen 1: Book List View)
 * @param {Array} books - Array of book objects returned from the SQLite database
 */
function renderShelfCatalog(books) {
    const shelfContainer = document.getElementById('view-shelf');
    if (!shelfContainer) return;

    shelfContainer.innerHTML = `
        <div class="overlay-panel text-center">
            <h2>Your Book Collection</h2>
            <p>Select a chronicle from the shelf below or construct a completely new volume run.</p>
            <button class="action-btn" style="margin-top: 20px;" onclick="openNewVolumeModal()" title="Start configuring a new book project">Create New Volume</button>
            
            <div id="book-grid-ledger" style="margin-top: 30px; display: flex; flex-direction: column; gap: 15px; text-align: left;">
            </div>
        </div>
    `;

    const gridLedger = document.getElementById('book-grid-ledger');
    if (books.length === 0) {
        gridLedger.innerHTML = `<p style="color: #bfa393; text-align: center; font-style: italic; margin-top: 20px;">Your archive is empty.</p>`;
        return;
    }

    books.forEach(book => {
        const bookRow = document.createElement('div');
        bookRow.style = `
            background: #000; border: 1px solid #3d302a; padding: 15px; 
            cursor: pointer; display: flex; justify-content: space-between; align-items: center;
            transition: border-color 0.2s ease;
        `;
        bookRow.setAttribute('title', `Click to view chapters for: ${book.title}`);

        bookRow.onmouseenter = () => bookRow.style.borderColor = '#8c2323';
        bookRow.onmouseleave = () => bookRow.style.borderColor = '#3d302a';

        // Passes both the technical scenario rules for the generator and the clean synopsis for the interface layout
        bookRow.onclick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('delete-btn')) return;
            selectActiveVolume(book.id, book.title, book.scenario, book.characters, book.synopsis, book.total_chapters);
        };

        // For legacy stories, dynamically strip out technical layout brackets on the fly
        const cleanPreviewText = book.synopsis || book.scenario.replace(/\[[^\]]+\]:\s*/g, ' ');

        bookRow.innerHTML = `
            <div style="flex-grow: 1; min-width: 0; padding-right: 15px;">
                <h4 style="font-family: 'ShenzenIndustrial', sans-serif; color: #d9d2c9; font-size: 1.2rem;">${book.title}</h4>
                <p style="font-size: 0.8rem; color: #bfa393; margin-top: 4px; max-width: 450px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${cleanPreviewText}
                </p>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; flex-shrink: 0;">
                <button class="delete-btn nav-btn" style="padding: 4px 10px; font-size: 0.75rem; border-color: #8c2323; color: #8c2323; background: transparent;" onclick="event.stopPropagation(); deleteVolumeFromServer(${book.id}, '${book.title.replace(/'/g, "\\'")}')">DELETE</button>
                <span style="font-size: 0.75rem; color: #8c2323; font-family: monospace;">VIEW CHAPTERS →</span>
            </div>
        `;
        gridLedger.appendChild(bookRow);
    });
}

/**
 * Switches the inner layout to the sub-screen panel inside the bookshelf view (Screen 2: Chapter Menu)
 */
function selectActiveVolume(id, title, scenario, characters, synopsis, total_chapters) {
    currentBookId = id;

    fetch(`/api/books/${id}/chapters`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const chapters = response.data;

                // Set completion flag before rendering
                currentBookComplete = chapters.length >= total_chapters;

                // Initialize the AI generation runtime matrix properties behind the scenes using raw variables
                if (typeof initCrucibleInterface === 'function') {
                    initCrucibleInterface(scenario, characters);
                }

                // Keep the background canvas active and render the layout with the clean synopsis blurb
                renderShelfChapterList(id, title, scenario, characters, chapters, synopsis, total_chapters);
            }
        })
        .catch(err => console.error("Error loading relational narrative strings:", err));
}

/**
 * Builds the intermediate chapter select directory window straight inside the bookshelf panel view
 */
function renderShelfChapterList(id, title, scenario, characters, chapters, synopsis, total_chapters) {
    const shelfContainer = document.getElementById('view-shelf');
    if (!shelfContainer) return;

    const isComplete = chapters.length >= total_chapters;

    // Clean scrubbing pass handles raw parameter boxes for historical database entries cleanly
    const blurbText = synopsis || scenario.replace(/\[[^\]]+\]:\s*/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();

    // Determine shelf appearance and generator action based on completion
    const shelfBorderStyle = isComplete ? 'border-color: #2b221e;' : '';
    const generatorButtonHtml = isComplete
        ? `<div style="padding: 8px 16px; font-size: 0.85rem; color: #5a4a3d; border: 1px solid #2b221e; background: #0a0807; text-align: center; letter-spacing: 1px;">[VOLUME SEALED & ARCHIVED IN VAULT]</div>`
        : `<button class="action-btn" style="padding: 8px 16px; font-size: 0.85rem;" onclick="currentChapterNum = ${chapters.length + 1}; navigateView('generator');" title="Advance directly into the AI writing terminal tool">
                    Open Generator Workspace (Ch. ${chapters.length + 1})
                </button>`;

    shelfContainer.innerHTML = `
        <div class="overlay-panel text-center" style="max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; ${shelfBorderStyle}">
            <div style="text-align: left; margin-bottom: 10px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                <button class="nav-btn" onclick="loadVolumesFromServer()" style="font-size: 0.8rem; padding: 4px 10px;" title="Return to the global archive catalog">← Back to Collection</button>
                <button class="nav-btn" style="font-size: 0.8rem; padding: 4px 10px; border-color: #8c2323; color: #8c2323;" onclick="deleteVolumeFromServer(${id}, '${title.replace(/'/g, "\\'")}')">✕ Delete Volume</button>
            </div>
            <h2 style="font-family: 'ShenzenIndustrial', sans-serif; color: #8c2323; text-transform: uppercase; margin-bottom: 10px; flex-shrink: 0;">${title}</h2>
            ${isComplete ? '<p style="font-size: 0.75rem; color: #5a4a3d; margin-bottom: 8px;">This chronicle has reached its chapter ceiling.</p>' : ''}
            
            <div style="max-height: 160px; overflow-y: auto; background: #070605; border: 1px solid #2b221e; padding: 12px 18px; max-width: 560px; margin-left: auto; margin-right: auto; margin-bottom: 20px; box-sizing: border-box; flex-shrink: 0; text-align: left;">
                <p style="color: #bfa393; font-size: 0.85rem; line-height: 1.6; font-style: italic; letter-spacing: 0.3px; white-space: pre-line; margin: 0; font-family: inherit;">${blurbText}</p>
            </div>
            
            <div style="margin-bottom: 20px; border-bottom: 1px dashed #3d302a; padding-bottom: 15px; flex-shrink: 0;">
                ${generatorButtonHtml}
            </div>

            <div id="shelf-chapter-ledger" style="display: flex; flex-direction: column; gap: 10px; text-align: left; max-width: 520px; margin-left: auto; margin-right: auto; overflow-y: auto; padding-right: 5px; box-sizing: border-box; flex-grow: 1;">
            </div>
        </div>
    `;

    const chapterLedger = document.getElementById('shelf-chapter-ledger');
    if (chapters.length === 0) {
        chapterLedger.innerHTML = `<p style="color: #bfa393; text-align: center; font-style: italic; margin-top: 10px;">No text segments have been forged for this chronicle yet.</p>`;
        return;
    }

    chapters.forEach(ch => {
        const chRow = document.createElement('div');
        chRow.style = `
            background: #000; border: 1px solid #3d302a; padding: 12px 15px; 
            cursor: pointer; display: flex; justify-content: space-between; align-items: center;
            transition: border-color 0.2s ease;
        `;
        chRow.onmouseenter = () => chRow.style.borderColor = '#8c2323';
        chRow.onmouseleave = () => chRow.style.borderColor = '#3d302a';

        chRow.onclick = () => {
            // Compile the whole book into Reader view structures
            displayChaptersInReaderView(title, chapters);
            // Hop over to the text presenter layout canvas
            navigateView('reader');
            // Execute automated smooth tracking down to the targeted element anchor
            setTimeout(() => {
                const targetBlock = document.getElementById(`reader-ch-${ch.chapter_number}`);
                if (targetBlock) {
                    targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 60);
        };

        chRow.innerHTML = `
            <span style="font-family: 'ShenzenIndustrial', sans-serif; color: #d9d2c9; font-size: 1.1rem; text-transform: uppercase;">${ch.title}</span>
            <span style="font-size: 0.75rem; color: #8c2323; font-family: monospace; font-weight: bold; padding-left: 10px;">READ →</span>
        `;
        chapterLedger.appendChild(chRow);
    });
}

/**
 * Builds a readable chapter index map with smooth jump anchors inside Reader Mode
 */
function displayChaptersInReaderView(volumeTitle, chapters) {
    const readerTitle = document.getElementById('reader-title');
    const readerBody = document.getElementById('reader-body');
    if (!readerTitle || !readerBody) return;

    readerTitle.innerText = volumeTitle.toUpperCase();
    readerBody.innerHTML = "";

    if (chapters.length === 0) {
        readerBody.innerHTML = `<p style="text-align: center; text-indent: 0; color: #1c1714; opacity: 0.7;">No text segments have been generated for this volume yet. Head to the AI Generator screen to start writing.</p>`;
        return;
    }

    // 1. Build an internal table of contents navigation bar at the top
    const navIndexPanel = document.createElement('div');
    navIndexPanel.style = "background: rgba(0,0,0,0.05); border: 1px dashed #000; padding: 15px; margin-bottom: 35px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;";

    chapters.forEach(ch => {
        const targetAnchorId = `reader-ch-${ch.chapter_number}`;
        const jumpBtn = document.createElement('button');
        jumpBtn.className = 'nav-btn';
        jumpBtn.style = "font-size: 0.85rem; padding: 4px 10px; background: transparent; color: #8c2323; border-color: rgba(140,35,35,0.3);";
        jumpBtn.innerText = ch.title.toUpperCase();
        jumpBtn.onclick = () => {
            const targetBlock = document.getElementById(targetAnchorId);
            if (targetBlock) {
                targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        navIndexPanel.appendChild(jumpBtn);
    });
    readerBody.appendChild(navIndexPanel);

    // 2. Render each chapter section with unique scroll identifier anchors
    chapters.forEach(ch => {
        const chapterSection = document.createElement('div');
        chapterSection.id = `reader-ch-${ch.chapter_number}`;
        chapterSection.style = "margin-bottom: 45px; border-bottom: 1px dashed rgba(0,0,0,0.15); padding-bottom: 35px; scroll-margin-top: 20px;";

        const chapterHeader = document.createElement('h3');
        chapterHeader.style = "font-family: 'ShenzenIndustrial', sans-serif; font-size: 1.4rem; color: #8c2323; margin-bottom: 15px;";
        chapterHeader.innerText = `${ch.title.toUpperCase()}`;

        const chapterContent = document.createElement('div');
        const paragraphBlocks = ch.content.split('\n\n');
        paragraphBlocks.forEach(pText => {
            if (pText.trim()) {
                const pElement = document.createElement('p');
                pElement.innerText = pText.trim();
                chapterContent.appendChild(pElement);
            }
        });

        chapterSection.appendChild(chapterHeader);
        chapterSection.appendChild(chapterContent);
        readerBody.appendChild(chapterSection);
    });
}

// Hook catalog initialization process into the master window load sequence
window.addEventListener('DOMContentLoaded', loadVolumesFromServer);

/**
 * Issues an atomic HTTP DELETE request to purge a book volume and triggers a catalog refresh
 */
function deleteVolumeFromServer(bookId, title) {
    // Prevent duplicate confirmation modals from spawning simultaneously
    if (document.getElementById('delete-confirm-modal-wrapper')) return;

    // 1. Construct an immersive, in-theme modal overlay container matching the Vault aesthetic
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'delete-confirm-modal-wrapper';
    modalOverlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(12, 10, 9, 0.98); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
    `;

    modalOverlay.innerHTML = `
        <div class="overlay-panel" style="width: 480px; border: 3px solid #000; background: #1a1412; box-shadow: 10px 10px 0px #000; padding: 30px; box-sizing: border-box; text-align: center;">
            <h2 style="font-family: 'ShenzenIndustrial', sans-serif; margin-bottom: 10px; color: #8c2323; letter-spacing: 1px;">PURGE THE FLITH?</h2>
            <p style="font-size: 0.9rem; color: #bfa393; line-height: 1.5; margin-bottom: 25px; border-bottom: 1px dashed #3d302a; padding-bottom: 15px;">
                Are you absolutely sure you want to permanently erase <span style="color: #d9d2c9; font-weight: bold; font-style: normal;">"${title}"</span>? All relational data, historical chapters, and compiled context stubs will be completely stripped from the database ledger. This action cannot be undone.
            </p>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; width: 100%; box-sizing: border-box;">
                <button id="confirm-delete-cancel" class="nav-btn" style="padding: 8px 16px; font-size: 0.85rem;">ABORT</button>
                <button id="confirm-delete-execute" class="action-btn" style="padding: 8px 16px; font-size: 0.85rem; background: #8c2323; border-color: #000;">WIPE BOOK</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // 2. Wire the Cancel / Dismiss behavioral hook
    document.getElementById('confirm-delete-cancel').onclick = () => {
        modalOverlay.remove();
    };

    // 3. Wire the Destruction / Execution network pipeline hook
    document.getElementById('confirm-delete-execute').onclick = () => {
        const executeBtn = document.getElementById('confirm-delete-execute');
        const cancelBtn = document.getElementById('confirm-delete-cancel');
        
        // Lock inputs immediately to guard against multi-click transaction races
        executeBtn.disabled = true;
        cancelBtn.disabled = true;
        executeBtn.innerText = "WIPING RECORD...";

        fetch('/api/books/' + bookId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(res => res.json())
            .then(response => {
                modalOverlay.remove(); // Dismantle confirmation view block layer
                if (response.status === 'success') {
                    navigateView('shelf'); 
                    loadVolumesFromServer();
                } else {
                    alert(`Purge operation failed: ${response.message}`);
                    loadVolumesFromServer();
                }
            })
            .catch(err => {
                console.error("Network fault encountered during ledger purge pass:", err);
                modalOverlay.remove();
                loadVolumesFromServer();
            });
    };
}