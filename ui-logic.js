// ui-logic.js

/* global links:writable, settings, isEditMode, isEditingId:writable, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory */
/* global fetchExternalSuggestions, selectSuggestion, saveBgToDB, getBgFromDB */

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    bindStaticEvents();
    renderLinks();
    loadSettings(); 
    renderEngineDropdown(); 
    updateClock(); 
    setInterval(updateClock, 1000);

    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.focus();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) {
            document.getElementById('engineDropdown')?.classList.add('hidden');
        }
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) {
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('settingsModal')?.classList.remove('active');
            document.getElementById('engineDropdown')?.classList.add('hidden');
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
            
            const advContent = document.getElementById('advancedSettings');
            const advBtn = document.getElementById('advancedToggleBtn');
            if(advContent?.classList.contains('open')) {
                advContent.classList.remove('open');
                advBtn.classList.remove('active');
            }
            if(!document.getElementById('linkEditorContainer')?.classList.contains('hidden')) {
                cancelEdit();
            }
        }
    });
});

// --- CSP EVENT BINDING ---
function bindStaticEvents() {
    // Header & Settings
    document.getElementById('settingsToggleBtn').addEventListener('click', toggleSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('settingsModal')) closeModal('settingsModal');
    });

    // Search Bar
    document.getElementById('engineDropdownBtn').addEventListener('click', toggleEngineDropdown);
    document.getElementById('searchSubmitBtn').addEventListener('click', () => handleSearch({ key: 'Enter', type: 'click', preventDefault: () => {} }));
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSuggestions);
    searchInput.addEventListener('keypress', handleSearch);

    // Repointed GitHub Button to main repo
    document.getElementById('githubBtn').addEventListener('click', () => window.open('https://github.com/Raw-JSON/0FluffStart', '_blank'));
    
    document.getElementById('addLinkBtn').addEventListener('click', () => openEditor());
    document.getElementById('saveLinkBtn').addEventListener('click', saveLink);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    document.getElementById('userNameInput').addEventListener('input', autoSaveSettings);
    document.getElementById('themeSelect').addEventListener('change', autoSaveSettings);
    
    // Background Inputs
    const bgInput = document.getElementById('bgImageInput');
    bgInput.addEventListener('change', () => handleImageUpload(bgInput));
    document.getElementById('resetBgBtn').addEventListener('click', clearBackground);

    // Advanced Settings
    document.getElementById('advancedToggleBtn').addEventListener('click', toggleAdvanced);
    document.getElementById('externalSuggestToggle').addEventListener('change', autoSaveSettings);
    document.getElementById('historyEnabledToggle').addEventListener('change', autoSaveSettings);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Backup & Restore
    document.getElementById('backupDataBtn').addEventListener('click', backupData);
    document.getElementById('restoreDataBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
    document.getElementById('restoreInput').addEventListener('change', restoreData);

    document.querySelectorAll('.clock-radio').forEach(radio => {
        radio.addEventListener('change', autoSaveSettings);
    });
}

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

// --- BACKUP & RESTORE ---
function backupData() {
    const data = {
        links: JSON.parse(localStorage.getItem('0fluff_links') || '[]'),
        settings: JSON.parse(localStorage.getItem('0fluff_settings') || '{}'),
        history: JSON.parse(localStorage.getItem('0fluff_history') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `0FluffStart_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function restoreData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.links && !data.settings) {
                alert("Invalid backup file. Missing core data.");
                return;
            }

            if (confirm("This will overwrite your current settings, links, and history. Are you sure?")) {
                if(data.links) localStorage.setItem('0fluff_links', JSON.stringify(data.links));
                if(data.settings) localStorage.setItem('0fluff_settings', JSON.stringify(data.settings));
                if(data.history) localStorage.setItem('0fluff_history', JSON.stringify(data.history));
                
                alert("Restore successful! Reloading...");
                window.location.reload();
            }
        } catch (err) {
            alert("Error parsing backup file: " + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// --- LINKS ---
function renderLinks() {
    const grid = document.getElementById('linkGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    links.forEach(link => {
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
        
        item.addEventListener('click', () => {
            const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            window.location.href = finalUrl; 
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            toggleSettings();
            openEditor(link.id);
        });

        grid.appendChild(item);
    });
}

function renderLinkManager() {
    const linkManagerContent = document.getElementById('linkManagerContent');
    if(!linkManagerContent) return;
    linkManagerContent.innerHTML = '';
    if (links.length === 0) {
        linkManagerContent.innerHTML = '<div style="color:var(--dim); text-align:center; padding:10px;">No links yet.</div>';
        return;
    }
    const editIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    const deleteIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    
    links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-manager-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'link-name';
        nameSpan.innerText = link.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'link-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn secondary';
        editBtn.innerHTML = editIconSVG;
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', (e) => editLink(link.id, e));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.innerHTML = deleteIconSVG;
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => deleteLink(link.id, e));
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        
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
async function loadSettings() {
    document.body.className = settings.theme; 
    const overlay = document.getElementById('bgOverlay');
    const resetBtn = document.getElementById('resetBgBtn');
    const fileNameInfo = document.getElementById('bgFileName');

    // --- BACKGROUND MIGRATION & LOAD ---
    // Zero-data-loss migration: Detect legacy base64 format and move it to IndexedDB
    if (settings.backgroundImage && settings.backgroundImage.length > 100 && settings.backgroundImage !== 'indexeddb') {
        console.log("0fluf DB Action: Migrating background from LocalStorage to IndexedDB.");
        try {
            await saveBgToDB(settings.backgroundImage); // Store the legacy DataURL in IDB
            settings.backgroundImage = 'indexeddb'; // Clean up localStorage pointer
            autoSaveSettings(); 
        } catch(e) {
            console.error("Migration failed:", e);
        }
    }

    if (settings.backgroundImage === 'indexeddb') {
        try {
            const bgData = await getBgFromDB();
            if (bgData) {
                // Determine if it's a native File/Blob or a migrated Base64 string
                const url = (bgData instanceof Blob || bgData instanceof File) 
                    ? URL.createObjectURL(bgData) 
                    : bgData;
                
                document.body.style.backgroundImage = `url('${url}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                
                if(overlay) overlay.style.opacity = '1';
                if(resetBtn) resetBtn.style.display = 'block';
                if(fileNameInfo) fileNameInfo.innerText = "Custom image active";
            } else {
                settings.backgroundImage = null;
                autoSaveSettings();
            }
        } catch(e) {
            console.error("Failed to load background from DB:", e);
        }
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
    document.getElementById('historyEnabledToggle').checked = settings.historyEnabled;
    
    updateClock(); 
    renderEngineDropdown();
}

function autoSaveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim();
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.checked) settings.clockFormat = r.value;
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    settings.historyEnabled = document.getElementById('historyEnabledToggle').checked;
    
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
        div.addEventListener('click', () => selectEngine(e.name));
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

// Exports
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
window.backupData = backupData;
window.restoreData = restoreData;
