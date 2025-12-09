// ui-logic.js

/* global links, settings, isEditMode, isEditingId, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory */

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    loadSettings(); 
    renderEngineDropdown(); 
    updateClock(); 
    setInterval(updateClock, 1000);

    // TWEAK 1: Instant Focus on Load
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.focus();

    // Event Delegation for clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) {
            document.getElementById('engineDropdown')?.classList.add('hidden');
        }
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) {
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
        }
    });
    
    // TWEAK 2: The "Escape Hatch" - Global Esc Handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close Modals
            document.getElementById('settingsModal')?.classList.remove('active');
            // Close Dropdowns & Suggestions
            document.getElementById('engineDropdown')?.classList.add('hidden');
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
            // Close Advanced Settings Drawer
            const advContent = document.getElementById('advancedSettings');
            const advBtn = document.getElementById('advancedToggleBtn');
            if(advContent?.classList.contains('open')) {
                advContent.classList.remove('open');
                advBtn.classList.remove('active');
            }
            // If editing a link, cancel it
            if(!document.getElementById('linkEditorContainer')?.classList.contains('hidden')) {
                cancelEdit();
            }
        }
    });
    
    window.handleSuggestions = handleSuggestions;
});

// --- INTERACTIONS ---
function toggleAdvanced() {
    const content = document.getElementById('advancedSettings');
    const btn = document.getElementById('advancedToggleBtn');
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        btn.classList.remove('active');
    } else {
        content.classList.add('open');
        btn.classList.add('active');
    }
}

// --- BACKGROUND ---
function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('bgFileName').innerText = `Selected: ${file.name}`;
    if (file.size > 3 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 3MB.");
        input.value = ''; 
        document.getElementById('bgFileName').innerText = "No image selected.";
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            settings.backgroundImage = e.target.result;
            localStorage.setItem('0fluff_settings', JSON.stringify(settings));
            loadSettings(); 
        } catch (err) {
            alert("Storage limit reached. Try a smaller image.");
        }
    };
    reader.readAsDataURL(file);
}

function clearBackground() {
    settings.backgroundImage = null;
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    document.getElementById('bgImageInput').value = '';
    loadSettings();
}

// --- LINKS ---
function renderLinks() {
    const grid = document.getElementById('linkGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    links.forEach(link => {
        // Monogram Logic
        const words = link.name.split(' ').filter(w => w.length > 0);
        let acronym = words.map(word => word.charAt(0).toUpperCase()).join('');
        if (words.length === 1 && acronym.length === 1 && link.name.length > 1) {
             acronym = link.name.substring(0, 2).toUpperCase();
        }
        const display = acronym.substring(0, 3);
        
        let fontSize = '1.5rem';
        let letterSpacing = '-1px';
        if (display.length === 1) fontSize = '2rem';
        else if (display.length === 2) fontSize = '1.6rem';
        else { fontSize = '1.2rem'; letterSpacing = '-0.5px'; }

        const item = document.createElement('div');
        item.className = 'link-item';
        
        item.innerHTML = `
            <div class="link-icon-circle">
                <span style="
                    font-size: ${fontSize}; 
                    color: var(--accent); 
                    font-weight: 800; 
                    letter-spacing: ${letterSpacing};
                    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    font-family: var(--font-main);
                ">${display}</span>
            </div>
            <div class="link-name">${link.name}</div>
        `;
        
        // Left Click: Go to URL
        item.onclick = () => {
            const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            window.location.href = finalUrl;
        };

        // TWEAK 3: Right Click: Quick Edit
        item.oncontextmenu = (e) => {
            e.preventDefault(); // Stop default browser menu
            // Open settings first (to ensure modal structure is visible)
            toggleSettings();
            // Then immediately switch to editor mode for this ID
            openEditor(link.id);
        };

        grid.appendChild(item);
    });
}

// --- LINK MANAGER (Settings) ---
function renderLinkManager() {
    const linkManagerContent = document.getElementById('linkManagerContent');
    if(!linkManagerContent) return;
    linkManagerContent.innerHTML = '';
    if (links.length === 0) {
        linkManagerContent.innerHTML = '<div style="color:var(--dim); text-align:center; padding:10px;">No links yet.</div>';
        return;
    }
    const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-manager-item';
        item.innerHTML = `
            <span class="link-name">${link.name}</span>
            <div class="link-actions">
                <button class="icon-btn secondary" onclick="editLink('${link.id}')" title="Edit">${editIcon}</button>
                <button class="icon-btn delete-btn" onclick="deleteLink('${link.id}')" title="Delete">${deleteIcon}</button>
            </div>
        `;
        linkManagerContent.appendChild(item);
    });
}

function openEditor(id = null) {
    document.getElementById('linkListContainer').classList.add('hidden');
    document.getElementById('linkEditorContainer').classList.remove('hidden');
    const titleEl = document.getElementById('editorTitle');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    isEditingId = id;
    if (id) {
        const link = links.find(l => l.id === id);
        if(link) {
            titleEl.innerText = "Edit Link";
            nameInput.value = link.name;
            urlInput.value = link.url;
        }
    } else {
        titleEl.innerText = "Add New Link";
        nameInput.value = '';
        urlInput.value = '';
    }
}

function cancelEdit() {
    document.getElementById('linkEditorContainer').classList.add('hidden');
    document.getElementById('linkListContainer').classList.remove('hidden');
    isEditingId = null;
}

function saveLink() {
    const name = document.getElementById('editName').value.trim();
    const url = document.getElementById('editUrl').value.trim();
    if (!name || !url) return alert("Please fill in both name and URL.");
    if (isEditingId) {
        const idx = links.findIndex(l => l.id === isEditingId);
        if (idx > -1) { links[idx].name = name; links[idx].url = url; }
    } else {
        links.push({ id: Date.now().toString(), name, url });
    }
    localStorage.setItem('0fluff_links', JSON.stringify(links));
    renderLinks();       
    renderLinkManager(); 
    cancelEdit();        
}

function editLink(id, e) { if(e) e.stopPropagation(); openEditor(id); }
function deleteLink(id, e) {
    if(e) e.stopPropagation();
    if(confirm("Delete this link?")) {
        links = links.filter(l => l.id !== id);
        localStorage.setItem('0fluff_links', JSON.stringify(links));
        renderLinks();
        renderLinkManager();
    }
}

// --- SETTINGS ---
function loadSettings() {
    document.body.className = settings.theme; 
    const overlay = document.getElementById('bgOverlay');
    const resetBtn = document.getElementById('resetBgBtn');
    const fileNameInfo = document.getElementById('bgFileName');

    if (settings.backgroundImage) {
        document.body.style.backgroundImage = `url('${settings.backgroundImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        if(overlay) overlay.style.opacity = '1';
        if(resetBtn) resetBtn.style.display = 'block';
        if(fileNameInfo) fileNameInfo.innerText = "Custom image active";
    } else {
        document.body.style.backgroundImage = ''; 
        if(overlay) overlay.style.opacity = '0';
        if(resetBtn) resetBtn.style.display = 'none';
        if(fileNameInfo) fileNameInfo.innerText = "No image selected.";
    }

    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('userNameInput').value = settings.userName || '';
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) { if(r.value === settings.clockFormat) r.checked = true; }
    
    document.getElementById('externalSuggestToggle').checked = settings.externalSuggest;
    document.getElementById('historyEnabledToggle').checked = settings.historyEnabled; // <--- ADDED TOGGLE LOAD
    
    updateClock(); 
    renderEngineDropdown();
}

function autoSaveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim();
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.checked) settings.clockFormat = r.value;
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    settings.historyEnabled = document.getElementById('historyEnabledToggle').checked; // <--- ADDED TOGGLE SAVE
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    loadSettings();
}

function toggleSettings() { 
    cancelEdit(); 
    renderLinkManager(); 
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- SEARCH ---
function renderEngineDropdown() {
    const dropdown = document.getElementById('engineDropdown');
    if(!dropdown) return;
    dropdown.innerHTML = '';
    const current = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
    const iconEl = document.getElementById('currentEngineIcon');
    if(iconEl) iconEl.innerText = current.initial;
    searchEngines.forEach(e => {
        const div = document.createElement('div');
        div.className = `engine-option ${e.name === settings.searchEngine ? 'selected' : ''}`;
        div.innerHTML = `<span>${e.name}</span> <span>${e.initial}</span>`;
        div.onclick = () => selectEngine(e.name);
        dropdown.appendChild(div);
    });
}
function toggleEngineDropdown() { document.getElementById('engineDropdown').classList.toggle('hidden'); }
function selectEngine(name) {
    settings.searchEngine = name;
    autoSaveSettings(); 
    renderEngineDropdown(); 
    toggleEngineDropdown(); 
}
function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        logSearch(val); 
        const engine = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
        if (val.includes('.') && !val.includes(' ')) {
            window.location.href = val.startsWith('http') ? val : `https://${val}`;
        } else {
            window.location.href = `${engine.url}${encodeURIComponent(val)}`;
        }
    }
}
function selectSuggestion(suggestion) {
    const inputEl = document.getElementById('searchInput');
    inputEl.value = suggestion.name;
    if (suggestion.type === 'Link') {
        const finalUrl = suggestion.url.startsWith('http') ? suggestion.url : `https://${suggestion.url}`;
        window.location.href = finalUrl;
    } else {
        document.getElementById('suggestionsContainer').classList.add('hidden');
        handleSearch({ key: 'Enter', type: 'synthetic', preventDefault: () => {} });
    }
}

window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.renderLinks = renderLinks;
window.renderEngineDropdown = renderEngineDropdown;
window.toggleEngineDropdown = toggleEngineDropdown;
window.selectEngine = selectEngine;
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.toggleSettings = toggleSettings;
window.closeModal = closeModal;
window.handleSearch = handleSearch;
window.selectSuggestion = selectSuggestion;
window.cancelEdit = cancelEdit;
window.autoSaveSettings = autoSaveSettings;
window.toggleAdvanced = toggleAdvanced;
window.clearHistory = clearHistory;
