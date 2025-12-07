// ui-logic.js

// Import required state and utilities (Assumes state.js and utilities.js are loaded first)
/* global links, settings, isEditMode, isEditingId, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions */
// renderEngineDropdown is also defined here, but needs state variables

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial Setup
    renderLinks();
    loadSettings(); 
    setInterval(updateClock, 1000);
    renderEngineDropdown(); 
    updateClock(); 
    
    // Global click listener to close dropdowns and suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) {
            document.getElementById('engineDropdown').classList.add('hidden');
        }
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) {
            document.getElementById('suggestionsContainer').classList.add('hidden');
        }
    });
    
    // Expose handleSuggestions globally for input element binding
    window.handleSuggestions = handleSuggestions;
});


// --- CORE FUNCTIONS ---

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editToggleBtn');
    
    // This is now the "Done" button in the settings modal
    if(isEditMode) {
        btn.classList.add('active');
        btn.querySelector('.edit-icon-svg').classList.add('hidden');
        btn.querySelector('.check-icon-svg').classList.remove('hidden');
    } else {
        btn.classList.remove('active');
        btn.querySelector('.edit-icon-svg').classList.remove('hidden');
        btn.querySelector('.check-icon-svg').classList.add('hidden');
    }
    
    // Crucially, render the links on the main page.
    renderLinks();
    
    // If we're toggling edit mode *from* the settings panel, also update the list in the panel.
    if(document.getElementById('settingsModal').classList.contains('active')) {
        renderLinkManager();
    }
}

function renderLinks() {
    const grid = document.getElementById('linkGrid');
    grid.innerHTML = '';

    links.forEach(link => {
        let domain = 'example.com';
        try {
            let urlForParse = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            domain = new URL(urlForParse).hostname;
        } catch(e) { console.error(e); }

        // Handle icons from links or settings
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const initial = link.name.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = `link-item ${isEditMode ? 'editing' : ''}`;
        
        let html = `
            <div class="link-icon-circle">
                <img src="${iconUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" alt="icon">
                <span style="display:none; font-size:1.5rem; color:var(--accent); font-weight:bold;">${initial}</span>
            </div>
            <div class="link-name">${link.name}</div>
        `;

        if (isEditMode) {
            // Delete badge (X) - Still on the home page for quick removal
            html += `<div class="delete-badge" onclick="deleteLink('${link.id}', event)">✕</div>`;
            // Clicks in edit mode now open the editor modal directly from the homepage
            item.onclick = (e) => editLink(link.id, e);
        } else {
            // Normal Mode
            item.onclick = () => {
                const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                window.location.href = finalUrl;
            };
        }

        item.innerHTML = html;
        grid.appendChild(item);
    });
}

// --- SEARCH ENGINE UI LOGIC (No change) ---

function renderEngineDropdown() {
    const dropdown = document.getElementById('engineDropdown');
    dropdown.innerHTML = '';
    
    // Find current to verify validity
    const current = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
    document.getElementById('currentEngineIcon').innerText = current.initial;

    searchEngines.forEach(e => {
        const div = document.createElement('div');
        div.className = `engine-option ${e.name === settings.searchEngine ? 'selected' : ''}`;
        div.innerHTML = `<span>${e.name}</span> <span>${e.initial}</span>`;
        div.onclick = () => selectEngine(e.name);
        dropdown.appendChild(div);
    });
}

function toggleEngineDropdown() {
    const el = document.getElementById('engineDropdown');
    el.classList.toggle('hidden');
}

function selectEngine(name) {
    settings.searchEngine = name;
    autoSaveSettings(); // Utility function
    renderEngineDropdown(); // Re-render to update checkmarks/selected state
    toggleEngineDropdown(); // Close
}

// --- LINK MANAGER (NEW FUNCTION) ---

function renderLinkManager() {
    const linkManagerContent = document.getElementById('linkManagerContent');
    linkManagerContent.innerHTML = '';

    links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'link-manager-item';
        item.innerHTML = `
            <span class="link-name">${link.name}</span>
            <div class="link-actions">
                <button class="icon-btn secondary" onclick="editLink('${link.id}')">✏️ Edit</button>
                <button class="icon-btn delete-btn" onclick="deleteLink('${link.id}')">🗑️ Delete</button>
            </div>
        `;
        linkManagerContent.appendChild(item);
    });
}


// --- CRUD ---
function openEditor(id = null) {
    const modal = document.getElementById('linkEditorModal');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    isEditingId = id;

    if (id) {
        const link = links.find(l => l.id === id);
        if(link) {
            nameInput.value = link.name;
            urlInput.value = link.url;
        }
    } else {
        nameInput.value = '';
        urlInput.value = '';
    }
    modal.classList.add('active');
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
    
    // CRITICAL: If settings modal is open, re-render the manager list
    if(document.getElementById('settingsModal').classList.contains('active')) {
        renderLinkManager();
    }
    
    closeModal('linkEditorModal');
}

function editLink(id, e) { 
    if(e) e.stopPropagation(); 
    openEditor(id); 
}

function deleteLink(id, e) {
    if(e) e.stopPropagation();
    if(confirm("Delete this link?")) {
        links = links.filter(l => l.id !== id);
        localStorage.setItem('0fluff_links', JSON.stringify(links));
        renderLinks();
        
        // CRITICAL: If settings modal is open, re-render the manager list
        if(document.getElementById('settingsModal').classList.contains('active')) {
            renderLinkManager();
        }
    }
}

// --- UTILS (MODIFIED) ---
function toggleSettings() { 
    // CRITICAL: Populate link manager before showing settings modal
    renderLinkManager(); 
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
}


function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        
        // Log the search before executing it (Utility function)
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
    
    // Check if it's a search term (History or External Search)
    if (suggestion.type === 'Link') {
        // Handle Links: Navigate immediately
        const finalUrl = suggestion.url.startsWith('http') ? suggestion.url : `https://${suggestion.url}`;
        window.location.href = finalUrl;
    } else {
        // Handle Search Terms (History/Search): Execute the search
        
        // Hide suggestions dropdown
        document.getElementById('suggestionsContainer').classList.add('hidden');
        
        // Execute the search function by mimicking an 'Enter' keypress/click
        handleSearch({ key: 'Enter', type: 'synthetic', preventDefault: () => {} });
    }
}


// Expose all necessary functions globally for HTML binding
window.toggleEditMode = toggleEditMode;
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

// Expose the new manager function
window.renderLinkManager = renderLinkManager;
