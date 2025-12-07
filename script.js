// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');
// UPDATED DEFAULT: Add externalSuggest: false
let settings = JSON.parse(localStorage.getItem('0fluff_settings') || '{"theme":"dark","clockFormat":"24h","searchEngine":"Google", "userName": "", "externalSuggest": false}'); 
let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]'); 
let isEditMode = false;
let isEditingId = null;

// Engine Configuration (Initial + Icon Initials)
const searchEngines = [
// ... (Remains the same) ...
    { name: 'Google', initial: 'G', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', initial: 'D', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', initial: 'B', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', initial: 'b', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', initial: 'S', url: 'https://www.startpage.com/sp/search?query=' }
];

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
// ... (Remains the same) ...
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
});

// --- NEW EXTERNAL FETCH UTILITY (Switched to DuckDuckGo) ---

async function fetchExternalSuggestions(query) {
    // 0Fluff architecture requires using a proxy for external fetches.
    // Switching to DuckDuckGo AutoSuggest API (JSON format, cleaner)
    const duckduckgoSuggestUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(duckduckgoSuggestUrl)}`;

    try {
        const res = await fetch(proxyUrl);
        
        if (!res.ok) {
            throw new Error(`Proxy/API returned status ${res.status}`);
        }

        const data = await res.json(); 
        
        // DuckDuckGo returns an array of objects: [{phrase: "suggestion1"}, {phrase: "suggestion2"}, ...]
        if (Array.isArray(data)) {
            return data.map(item => item.phrase).filter(p => p); // Extract the phrase
        }
    } catch (e) {
        console.error("External suggestion fetch failed:", e);
    }
    return [];
}


// --- NEW: SUGGESTION LOGIC (Updated) ---

async function handleSuggestions() {
    const inputEl = document.getElementById('searchInput');
    const input = inputEl.value.toLowerCase().trim();
    const container = document.getElementById('suggestionsContainer');
    
    container.innerHTML = '';
    
    if (input.length < 2) {
        container.classList.add('hidden');
        return;
    }
    
    let suggestions = [];
    
    // 1. Internal Private Suggestions (Always used as fallback/link priority)
    // Link Name Suggestions
    const linkMatches = links
        .filter(l => l.name.toLowerCase().includes(input))
        .map(l => ({ name: l.name, url: l.url, type: 'Link' }));
        
    suggestions.push(...linkMatches);
    
    // Search History Suggestions (excluding any text already matched as a link)
    const historyMatches = searchHistory
        .filter(h => h.toLowerCase().includes(input) && !linkMatches.some(l => l.name.toLowerCase() === h.toLowerCase()))
        .map(h => ({ name: h, type: 'History' }));
        
    suggestions.push(...historyMatches);
    
    // 2. External Suggestions (If enabled by user)
    if (settings.externalSuggest) {
        // Now using the privacy-respecting DuckDuckGo API
        const external = await fetchExternalSuggestions(input);
        
        // Merge external results, avoiding duplicates from internal list
        external.forEach(term => {
            if (!suggestions.some(s => s.name.toLowerCase() === term.toLowerCase())) {
                 // Mark external results with the Search type
                suggestions.push({ name: term, type: 'Search' }); 
            }
        });
    }

    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    // Render Suggestions (Limit to top 8 now that we have external sources)
    suggestions.slice(0, 8).forEach(s => { 
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <span>${s.name}</span>
            <span class="suggestion-type">${s.type}</span>
        `;
        
        item.onclick = () => selectSuggestion(s);
        container.appendChild(item);
    });
    
    container.classList.remove('hidden');
}

// --- CORE FUNCTIONS ---

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editToggleBtn');
    
    if(isEditMode) {
        btn.classList.add('active');
        btn.querySelector('.edit-icon-svg').classList.add('hidden');
        btn.querySelector('.check-icon-svg').classList.remove('hidden');
    } else {
        btn.classList.remove('active');
        btn.querySelector('.edit-icon-svg').classList.remove('hidden');
        btn.querySelector('.check-icon-svg').classList.add('hidden');
    }
    
    renderLinks();
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
            // Delete badge (X)
            html += `<div class="delete-badge" onclick="deleteLink('${link.id}', event)">✕</div>`;
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

// --- SEARCH ENGINE UI LOGIC ---

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
    autoSaveSettings(); // Auto-save trigger
    renderEngineDropdown(); // Re-render to update checkmarks/selected state
    toggleEngineDropdown(); // Close
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
    }
}

// --- UTILS ---
function toggleSettings() { 
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function logSearch(query) {
    query = query.trim();
    if (query === '' || query.includes('.') && !query.includes(' ')) return; // Don't log URLs
    
    // Remove if already exists and push to the front
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.unshift(query);
    
    // Limit history size to keep storage clean
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    localStorage.setItem('0fluff_history', JSON.stringify(searchHistory));
}

function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        
        // Log the search before executing it
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
        // If it's a link, navigate immediately
        const finalUrl = suggestion.url.startsWith('http') ? suggestion.url : `https://${suggestion.url}`;
        window.location.href = finalUrl;
    } else {
        // If it's history, close suggestions and prepare for search
        document.getElementById('suggestionsContainer').classList.add('hidden');
        inputEl.focus();
    }
}

function getGreeting(userName) {
    const hour = new Date().getHours();
    let greeting = "Hello";
    if (hour < 5) greeting = "Good Night";
    else if (hour < 12) greeting = "Good Morning";
    else if (hour < 17) greeting = "Good Afternoon";
    else if (hour < 22) greeting = "Good Evening";
    else greeting = "Good Night";
    
    const name = userName ? `, ${userName}` : '';
    return `${greeting}${name}.`;
}

function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = String(now.getMinutes()).padStart(2, '0');
    let s = String(now.getSeconds()).padStart(2, '0');
    let suffix = '';

    if (settings.clockFormat === '12h') {
        suffix = h >= 12 ? ' PM' : ' AM';
        h = h % 12 || 12;
        if (h < 10) h = String(h).replace(/^0+/, ''); 
    } else {
         h = String(h).padStart(2, '0'); 
    }
    
    document.getElementById('clockDisplay').innerText = `${h}:${m}:${s}${suffix}`;
    document.getElementById('greetingDisplay').innerText = getGreeting(settings.userName);
}

function loadSettings() {
    document.body.className = settings.theme; 
    document.getElementById('themeSelect').value = settings.theme;
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.value === settings.clockFormat) r.checked = true;
    }
    
    // Load external suggest toggle state
    document.getElementById('externalSuggestToggle').checked = settings.externalSuggest;
    
    updateClock(); 
    renderEngineDropdown();
}

function autoSaveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim();
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.checked) settings.clockFormat = r.value;
    }
    
    // Save external suggest toggle state
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    
    document.body.className = settings.theme;
    updateClock();
}

// Expose handleSuggestions globally for HTML binding
window.handleSuggestions = handleSuggestions;
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
window.updateClock = updateClock;
window.loadSettings = loadSettings;
window.autoSaveSettings = autoSaveSettings;

