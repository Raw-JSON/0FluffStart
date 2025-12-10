// ui-logic.js

/* global links, settings, isEditMode, isEditingId, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory, getCurrentSearchEngine */

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
    
    // NEW: Close Settings Modal when clicking the overlay (Backdrop)
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            // Check if the click target IS the modal container (the overlay), not the inner content
            if (e.target === settingsModal) {
                closeModal('settingsModal');
            }
        });
    }
    
    // TWEAK 2: The "Escape Hatch" - Global Esc Handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const settingsModal = document.getElementById('settingsModal');
            const editorContainer = document.getElementById('linkEditorContainer');
            const dropdown = document.getElementById('engineDropdown');
            const suggestions = document.getElementById('suggestionsContainer');

            if (settingsModal?.classList.contains('active')) {
                closeModal('settingsModal');
            } else if (!editorContainer?.classList.contains('hidden')) {
                cancelEdit();
            } else if (!dropdown?.classList.contains('hidden')) {
                toggleEngineDropdown(false);
            } else if (!suggestions?.classList.contains('hidden')) {
                suggestions.classList.add('hidden');
            }
        }
    });
});

// --- CORE UI LOGIC ---

function renderLinks() {
    const grid = document.getElementById('linkGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    links.forEach(link => {
        const item = document.createElement('a');
        item.href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
        item.className = 'link-item';
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.setAttribute('data-id', link.id);
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'link-icon-circle';
        
        // Simple initial: First letter of name, or 'L' if empty
        let iconText = link.name ? link.name.charAt(0).toUpperCase() : 'L';
        const iconSpan = document.createElement('span');
        iconSpan.innerText = iconText;
        iconSpan.style.color = 'var(--text)';
        iconSpan.style.fontSize = '1.5rem';
        iconContainer.appendChild(iconSpan);
        
        const nameEl = document.createElement('div');
        nameEl.className = 'link-name';
        nameEl.innerText = link.name;
        
        item.appendChild(iconContainer);
        item.appendChild(nameEl);
        
        // Context menu / Edit overlay
        const editBtn = document.createElement('div');
        editBtn.className = 'link-edit-overlay';
        editBtn.innerHTML = `
            <svg class="edit-icon" onclick="event.preventDefault(); event.stopPropagation(); editLink('${link.id}')" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        `;
        item.appendChild(editBtn);

        grid.appendChild(item);
    });
}

// --- ENGINE LOGIC ---

function renderEngineDropdown() {
    const dropdown = document.getElementById('engineDropdown');
    const currentIcon = document.getElementById('currentEngineIcon');
    if (!dropdown || !currentIcon) return;
    
    dropdown.innerHTML = '';
    
    const currentEngine = getCurrentSearchEngine();
    currentIcon.innerText = currentEngine.initial;
    
    searchEngines.forEach(engine => {
        const option = document.createElement('div');
        option.className = 'engine-option';
        if (engine.name === settings.searchEngine) {
            option.classList.add('selected');
        }
        option.innerText = engine.name;
        option.setAttribute('onclick', `selectEngine('${engine.name}')`);
        
        const initialSpan = document.createElement('span');
        initialSpan.innerText = engine.initial;
        initialSpan.style.fontWeight = '700';
        option.appendChild(initialSpan);

        // Re-append engine name span so initial is on the right
        const nameSpan = document.createElement('span');
        nameSpan.innerText = engine.name;
        option.innerHTML = ''; // Clear temporary content
        option.appendChild(nameSpan);
        option.appendChild(initialSpan);

        dropdown.appendChild(option);
    });
}

function toggleEngineDropdown(state) {
    const dropdown = document.getElementById('engineDropdown');
    if (!dropdown) return;
    
    if (typeof state === 'boolean') {
        if (state) dropdown.classList.remove('hidden');
        else dropdown.classList.add('hidden');
    } else {
        dropdown.classList.toggle('hidden');
    }
}

function selectEngine(engineName) {
    settings.searchEngine = engineName;
    autoSaveSettings();
    renderEngineDropdown(); // Update the displayed icon/initial
    toggleEngineDropdown(false); // Close dropdown
    document.getElementById('searchInput').focus();
}

// --- SETTINGS LOGIC ---

function renderLinkManagerList() {
    const container = document.getElementById('linkManagerContent');
    if (!container) return;
    
    container.innerHTML = '';
    links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-manager-item';
        item.innerHTML = `
            <span class="link-name">${link.name}</span>
            <div class="link-actions">
                <button onclick="editLink('${link.id}')" class="icon-btn" title="Edit Link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </button>
                <button onclick="deleteLink('${link.id}')" class="icon-btn delete-btn" title="Delete Link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function openEditor(link = null) {
    const editorContainer = document.getElementById('linkEditorContainer');
    const listContainer = document.getElementById('linkListContainer');
    const titleEl = document.getElementById('editorTitle');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    const saveBtn = editorContainer.querySelector('.save-btn');
    
    if (!editorContainer) return;
    
    listContainer.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    
    if (link) {
        // Edit Mode
        isEditMode = true;
        isEditingId = link.id;
        titleEl.innerText = 'Edit Link';
        nameInput.value = link.name;
        urlInput.value = link.url;
        saveBtn.innerText = 'Update';
        nameInput.focus();
    } else {
        // New Link Mode
        isEditMode = false;
        isEditingId = null;
        titleEl.innerText = 'Add New Link';
        nameInput.value = '';
        urlInput.value = '';
        saveBtn.innerText = 'Save';
        nameInput.focus();
    }
}

function cancelEdit() {
    const editorContainer = document.getElementById('linkEditorContainer');
    const listContainer = document.getElementById('linkListContainer');
    
    if (editorContainer) {
        editorContainer.classList.add('hidden');
    }
    if (listContainer) {
        listContainer.classList.remove('hidden');
    }
    isEditMode = false;
    isEditingId = null;
}

function saveLink() {
    const name = document.getElementById('editName').value.trim();
    let url = document.getElementById('editUrl').value.trim();
    
    if (!name || !url) {
        alert('Name and URL are required.');
        return;
    }

    if (!url.includes('.')) {
        alert('URL must contain a domain (e.g., example.com).');
        return;
    }

    // Enforce protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    if (isEditMode) {
        // Update existing link
        links = links.map(l => (l.id === isEditingId ? { ...l, name, url } : l));
        alert('Link updated.');
    } else {
        // Add new link
        const newLink = { id: Date.now().toString(), name, url };
        links.push(newLink);
        alert('Link added.');
    }
    
    localStorage.setItem('0fluff_links', JSON.stringify(links));
    renderLinks();
    renderLinkManagerList();
    cancelEdit();
}

function editLink(id) {
    const linkToEdit = links.find(l => l.id === id);
    if (linkToEdit) {
        openEditor(linkToEdit);
    }
}

function deleteLink(id) {
    if (confirm('Seriously? Delete this link?')) {
        links = links.filter(l => l.id !== id);
        localStorage.setItem('0fluff_links', JSON.stringify(links));
        renderLinks();
        renderLinkManagerList();
    }
}

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.toggle('active');
        if (modal.classList.contains('active')) {
            loadSettings();
            renderLinkManagerList();
        } else {
            // Re-focus search bar when settings close
            document.getElementById('searchInput').focus();
        }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('searchInput').focus();
    }
}

function loadSettings() {
    // Apply theme
    document.body.className = settings.theme;
    
    // Apply name
    document.getElementById('userNameInput').value = settings.userName || '';
    
    // Apply theme selector
    document.getElementById('themeSelect').value = settings.theme;
    
    // Apply clock format
    document.querySelector(`input[name="clockFormat"][value="${settings.clockFormat}"]`).checked = true;
    
    // Apply suggestions toggle
    document.getElementById('externalSuggestToggle').checked = settings.externalSuggest;
    
    // Apply history toggle
    document.getElementById('historyEnabledToggle').checked = settings.historyEnabled;

    // Apply background image (if exists)
    const bgOverlay = document.getElementById('bgOverlay');
    const resetBtn = document.getElementById('resetBgBtn');
    const fileNameEl = document.getElementById('bgFileName');

    if (settings.backgroundImage) {
        bgOverlay.style.backgroundImage = `url('${settings.backgroundImage}')`;
        bgOverlay.style.opacity = '1';
        resetBtn.style.display = 'inline-block';
        fileNameEl.innerText = 'Custom Image Loaded.';
    } else {
        bgOverlay.style.backgroundImage = 'none';
        bgOverlay.style.opacity = '0';
        resetBtn.style.display = 'none';
        fileNameEl.innerText = 'No image selected.';
    }
    
    // Engine is loaded and rendered in DOMContentLoaded
}

function autoSaveSettings() {
    settings.userName = document.getElementById('userNameInput').value.trim();
    settings.theme = document.getElementById('themeSelect').value;
    settings.clockFormat = document.querySelector('input[name="clockFormat"]:checked').value;
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    settings.historyEnabled = document.getElementById('historyEnabledToggle').checked;
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    
    // Re-render components that rely on settings immediately
    document.body.className = settings.theme;
    updateClock(); 
    renderLinks(); 
    renderEngineDropdown();
}

function toggleAdvanced() {
    const advancedSettings = document.getElementById('advancedSettings');
    const toggleBtn = document.getElementById('advancedToggleBtn');
    
    if (advancedSettings) {
        // Toggle the 'active' class (Fixed logic)
        const isActive = advancedSettings.classList.toggle('active'); 
        
        // Find the chevron within the toggle button
        const chevron = toggleBtn.querySelector('.chevron');
        
        // Rotate chevron based on new state
        if (chevron) {
            chevron.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

function handleSearch(event) {
    // Only proceed on Enter or explicit click
    if (event.key === 'Enter' || event.type === 'click' || event.type === 'synthetic') {
        event.preventDefault(); // Stop form submission
        
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        
        // --- ARCHITECTURAL FIX: Use the new utility ---
        const engine = getCurrentSearchEngine(); 
        
        logSearch(val);
        document.getElementById('suggestionsContainer').classList.add('hidden');

        // Check for direct URL (must contain a dot and no spaces, e.g., google.com)
        if (val.includes('.') && !val.includes(' ')) {
            window.location.href = val.startsWith('http') ? val : `https://${val}`;
        } else {
            // Standard search query
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

// Global exports for inline HTML functions
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
