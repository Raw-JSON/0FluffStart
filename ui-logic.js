// ui-logic.js

/* global links, settings, isEditMode, isEditingId, searchEngines, NEWS_TOPICS */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, fetchNews */

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core UI
    renderLinks();
    loadSettings(); 
    renderEngineDropdown(); 
    updateClock(); 
    
    // 2. Start Clock Interval
    setInterval(updateClock, 1000);

    // 3. Initialize News (if enabled)
    if(settings.newsEnabled) renderNews();

    // 4. Global Click Listeners
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


// --- UI INTERACTIONS ---

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


// --- BACKGROUND IMAGE LOGIC ---

function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // UI Update immediately for feedback
    document.getElementById('bgFileName').innerText = `Selected: ${file.name}`;

    if (file.size > 3 * 1024 * 1024) { // 3MB Limit
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
            loadSettings(); // Re-apply immediately
        } catch (err) {
            alert("Storage limit reached. Try a smaller image.");
            console.error(err);
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


// --- NEWS LOGIC ---
async function renderNews() {
    const container = document.getElementById('newsContainer');
    const list = document.getElementById('newsList');
    
    if (!settings.newsEnabled) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    list.innerHTML = '<div class="news-loading">Loading visuals...</div>';
    
    // Get Topic Name for Header
    const topicKey = settings.newsTopic || "TOP";
    const topicName = NEWS_TOPICS[topicKey] ? NEWS_TOPICS[topicKey].name : "Top Stories";
    
    // Update header if exists (create if logic needed, but simpler to just update text if element exists)
    const headerEl = container.querySelector('.news-header');
    if(headerEl) headerEl.innerText = `${topicName} Headlines`;
    
    const headlines = await fetchNews();
    list.innerHTML = '';
    
    if (headlines.length === 0) {
        list.innerHTML = '<div class="news-loading">No news available.</div>';
        return;
    }

    headlines.forEach(item => {
        const card = document.createElement('a');
        card.className = 'news-card';
        card.href = item.link;
        card.target = "_blank";
        
        // Visual Card Layout
        card.innerHTML = `
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-source">${item.source}</span>
                <span class="news-time">${item.time}</span>
            </div>
        `;
        list.appendChild(card);
    });
}


// --- CORE RENDER (Links) ---
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
    cancelEdit(); 
    renderLinkManager(); 
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
}


// --- SETTINGS LOGIC ---
function loadSettings() {
    // 1. Theme
    document.body.className = settings.theme; 
    
    // 2. Background Image
    const overlay = document.getElementById('bgOverlay');
    const resetBtn = document.getElementById('resetBgBtn');
    const fileNameInfo = document.getElementById('bgFileName');

    if (settings.backgroundImage) {
        document.body.style.backgroundImage = `url('${settings.backgroundImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        if(overlay) overlay.style.opacity = '1';
        
        // Show Reset Button
        if(resetBtn) resetBtn.style.display = 'block';
        if(fileNameInfo) fileNameInfo.innerText = "Custom image active";
    } else {
        document.body.style.backgroundImage = ''; 
        if(overlay) overlay.style.opacity = '0';
        
        // Hide Reset Button
        if(resetBtn) resetBtn.style.display = 'none';
        if(fileNameInfo) fileNameInfo.innerText = "No image selected.";
    }

    // 3. Inputs
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('userNameInput').value = settings.userName || '';
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.value === settings.clockFormat) r.checked = true;
    }
    
    document.getElementById('externalSuggestToggle').checked = settings.externalSuggest;
    document.getElementById('newsToggle').checked = settings.newsEnabled;
    
    // New: Topic Selector
    const topicSelect = document.getElementById('newsTopicSelect');
    if(topicSelect) topicSelect.value = settings.newsTopic || "TOP";
    
    updateClock(); 
    renderEngineDropdown();
}

function autoSaveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim();
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.checked) settings.clockFormat = r.value;
    
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    
    // News Logic
    const newsState = document.getElementById('newsToggle').checked;
    const topicSelect = document.getElementById('newsTopicSelect').value;
    
    const needsRefresh = (settings.newsEnabled !== newsState) || (settings.newsTopic !== topicSelect);
    
    settings.newsEnabled = newsState;
    settings.newsTopic = topicSelect;
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    
    if (needsRefresh) {
        loadSettings();
        renderNews(); 
    }
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

// Expose globals for HTML binding
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
