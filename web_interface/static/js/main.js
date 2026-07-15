// web_interface/static/js/main.js

// App Core State Control Variables
let currentBookId = null;
let currentChapterNum = 1;
let isAudioMuted = true;
let targetedVolumeLevel = 0.35;

/**
 * Handles clean switching between application panels without disrupting animation or streaming loops
 */
function navigateView(viewName) {
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

        if (name) {
            characterProfilesArray.push(
                `NAME: ${name}\n` +
                `HEALTH STATUS: ${condition || 'Healthy'}\n` +
                `PHYSICAL PROFILE: ${physical || 'Standard gear'}\n` +
                `BEHAVIORAL MATRICES: ${behavior || 'Pragmatic focus'}`
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

/**
 * Operates a 4-second real-time loading bar layout sequence on app launch
 */
function handleSystemBootLoader() {
    const loader = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-bar-progress');
    if (!loader || !progressBar) return;

    let progress = 0;
    const duration = 4000; // 4 seconds maximum boundary
    const intervalTime = 40; 
    const increment = (intervalTime / duration) * 100;

    const loaderTimer = setInterval(() => {
        progress += increment;
        if (progress >= 100) {
            progressBar.style.width = '100%';
            clearInterval(loaderTimer);
            
            // Execute smooth visual fade out
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.visibility = 'hidden';
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
 * Generates the clean HTML list structure inside the shelf overlay panel
 * @param {Array} books - Array of book objects returned from the SQLite database
 */
function renderShelfCatalog(books) {
    const shelfContainer = document.getElementById('view-shelf');
    if (!shelfContainer) return;

    // Preserve the original header layout panel and button structure
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
        bookRow.setAttribute('title', `Click to open chapters for: ${book.title}`);
        
        // Hover visual states handled via inline listeners to avoid CSS clutter
        bookRow.onmouseenter = () => bookRow.style.borderColor = '#8c2323';
        bookRow.onmouseleave = () => bookRow.style.borderColor = '#3d302a';
        
        // Click behavior binds the active session ID context dynamically
        bookRow.onclick = () => selectActiveVolume(book.id, book.title, book.scenario, book.characters);

        bookRow.innerHTML = `
            <div>
                <h4 style="font-family: 'ShenzenIndustrial', sans-serif; color: #d9d2c9; font-size: 1.2rem;">${book.title}</h4>
                <p style="font-size: 0.8rem; color: #bfa393; margin-top: 4px; max-width: 450px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${book.scenario}
                </p>
            </div>
            <span style="font-size: 0.75rem; color: #8c2323; font-family: monospace;">OPEN CHAPTERS →</span>
        `;
        gridLedger.appendChild(bookRow);
    });
}

/**
 * Assigns global runtime context state when a book row is clicked
 */
function selectActiveVolume(id, title, scenario, characters) {
    currentBookId = id;
    
    // Query the API to find how many chapters already exist to calculate the next sequence number
    fetch(`/api/books/${id}/chapters`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const chapters = response.data;
                currentChapterNum = chapters.length + 1;
                
                // Initialize the AI generation panel settings
                if (typeof initCrucibleInterface === 'function') {
                    initCrucibleInterface(scenario, characters);
                }
                
                // Populate the Reader view container immediately with the volume data
                displayChaptersInReaderView(title, chapters);
                navigateView('reader');
            }
        })
        .catch(err => console.error("Error loading relational narrative strings:", err));
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