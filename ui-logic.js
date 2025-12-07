// ui-logic.js

// Import required state and utilities
/* global links, settings, isEditMode, isEditingId, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions */

document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    loadSettings(); 
    setInterval(updateClock, 1000);
    renderEngineDropdown(); 
    updateClock(); 
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) {
            document.getElementById('engineDropdown')?.classList.add('hidden');
        }
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) {
            document.getElementById('suggestionsContainer')?.classList.add('hidden');
        }
    });
    
    window.handleSuggestions = handleSuggestions;
});


// --- CORE RENDER ---

function renderLinks() {
    const grid = document.getElementById('linkGrid');
    if(!grid) return;
    grid.innerHTML = '';

    links.forEach(link => {
        let domain = 'example.com';
        try {
            let urlForParse = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            domain = new URL(urlForParse).hostname;
        } catch(e) { console.error(e); }

        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const initial = link.name.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = 'link-item';
        
        item.innerHTML = `
            <div class="link-icon-circle">
                <img src="${iconUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" alt="icon">
                <span style="display:none; font-size:1.5rem; color:var(--accent); font-weight:bold;">${initial}</span>
            </div>
            <div class="link-name">${link.name}</div>
        `;
        
        item.onclick = () => {
            const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            window.location.href = finalUrl;
        };

        grid.appendChild(item);
    });
}


// --- INLINE LINK MANAGER (Settings Modal) ---

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

// --- INLINE EDITOR LOGIC ---

function openEditor(id = null) {
    // 1. Swap Views
    document.getElementById('linkListContainer').classList.add('hidden');
    document.getElementById('linkEditorContainer').classList.remove('hidden');

    // 2. Setup Inputs
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
    // Return to List View
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
    
    renderLinks();       // Update Home
    renderLinkManager(); // Update List
    cancelEdit();        // Close Form
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
        renderLinkManager();
    }
}


// --- UI UTILITIES ---

function toggleSettings() { 
    // Always start in List view when opening settings
    cancelEdit(); 
    renderLinkManager(); 
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
}


// --- SEARCH & ENGINE LOGIC ---

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

function toggleEngineDropdown() {
    document.getElementById('engineDropdown').classList.toggle('hidden');
}

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

// Expose globals
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
