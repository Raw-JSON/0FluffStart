// --- STATE MANAGEMENT ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');

let settings = JSON.parse(localStorage.getItem('0fluff_settings') || JSON.stringify({
    theme: 'dark',
    clockFormat: '24h',
    searchEngine: 'Google' // Default search engine
}));

let isEditingId = null;
let isEditMode = false; // NEW STATE: Toggle edit/navigation focus

const searchEngines = [
    { name: 'Google', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', url: 'https://search.brave.com/search?q=' },
    { name: 'Qwant', url: 'https://www.qwant.com/?q=' },
    { name: 'Bing', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=' },
    { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Set up initial state and listeners
    renderLinks();
    loadSettings();
    setInterval(updateClock, 1000); // Start the functional clock
    
    document.getElementById('searchInput').addEventListener('keypress', handleSearch);
    
    // Populate search engine dropdown
    const searchSelect = document.getElementById('searchEngineSelect');
    searchEngines.forEach(engine => {
        const option = document.createElement('option');
        option.value = engine.name;
        option.innerText = engine.name;
        searchSelect.appendChild(option);
    });
});

// --- DATA & SETTINGS MANAGEMENT ---
function saveLinks() {
    localStorage.setItem('0fluff_links', JSON.stringify(links));
}

function saveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.clockFormat = document.querySelector('input[name="clockFormat"]:checked').value;
    settings.searchEngine = document.getElementById('searchEngineSelect').value;
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    
    // Apply changes immediately
    applySettings();
    updateClock(); 
    toggleSettings();
}

function loadSettings() {
    // Apply theme
    applySettings();

    // Set form defaults
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('searchEngineSelect').value = settings.searchEngine;
    document.querySelector(`input[value="${settings.clockFormat}"]`).checked = true;
}

function applySettings() {
    document.body.className = settings.theme;
}

// --- CLOCK MODULE ---
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('clockDisplay');
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let period = '';
    
    if (settings.clockFormat === '12h') {
        period = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // The hour '0' should be '12'
    }
    
    hours = String(hours).padStart(2, '0');
    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');
    
    timeEl.innerText = `${hours}:${minutes}:${seconds}${period}`;
}


// --- RENDERING & NEW EDIT MODE TOGGLE ---

function toggleEditMode(e) {
    if (e) e.stopPropagation(); // Prevent modal close or other conflicts
    isEditMode = !isEditMode;
    renderLinks();
}


function renderLinks() {
    const grid = document.getElementById('linkGrid');
    grid.innerHTML = '';
    
    // Update the visibility of the primary link actions based on edit mode
    const addLinkBtn = document.querySelector('.add-link-btn');
    const editModeBtn = document.querySelector('.edit-mode-btn');

    if (isEditMode) {
        addLinkBtn.classList.add('hidden');
        editModeBtn.innerText = '✅ Done';
        editModeBtn.style.background = 'var(--accent)';
    } else {
        addLinkBtn.classList.remove('hidden');
        editModeBtn.innerText = '✏️ Edit Links';
        editModeBtn.style.background = 'var(--card-hover)';
    }

    links.forEach(link => {
        const card = document.createElement('div'); // Changed back to <div> for conditional linking
        card.className = `link-card ${isEditMode ? 'edit-mode-active' : ''}`;
        card.setAttribute('data-id', link.id);
        
        // Use DuckDuckGo's non-tracking favicon service for real icons
        // Sanitizes the URL for the favicon service
        const safeUrl = link.url.replace(/^https?:\/\//, '').split('/')[0];
        const iconUrl = `https://icons.duckduckgo.com/ip3/${safeUrl}.ico`;
        
        // Inner content structure
        const iconHtml = `<img src="${iconUrl}" onerror="this.onerror=null;this.src='fallback.png';" alt="${link.name}" class="link-icon">`;
        const initial = link.name.charAt(0).toUpperCase();
        
        card.innerHTML = `
            <div class="icon-container">
                <img src="${iconUrl}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Ctext x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'40\\' fill=\\'%2300aaff\\' font-family=\\'Arial, sans-serif\\'>${initial}%3C/text%3E%3C/svg%3E'" alt="${link.name}" class="link-icon">
            </div>
            <div class="link-name">${link.name}</div>
            
            ${isEditMode ? 
                `<div class="edit-actions">
                    <button class="icon-btn edit-btn" onclick="editLink('${link.id}', event)">✏️</button>
                    <button class="icon-btn delete-btn" onclick="deleteLink('${link.id}', event)">🗑</button>
                </div>` 
                : ''}
        `;
        
        // Primary action: navigation ONLY when not in edit mode
        if (!isEditMode) {
            card.onclick = (e) => {
                window.location.href = link.url.startsWith('http') ? link.url : `http://${link.url}`;
            };
        }
        
        grid.appendChild(card);
    });
}

// --- LINK EDITOR (CRUD) ---

function openEditor(id = null) {
    const modal = document.getElementById('linkEditorModal');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    
    isEditingId = id;
    
    if (id) {
        const link = links.find(l => l.id === id);
        if (link) {
            nameInput.value = link.name;
            urlInput.value = link.url;
            modal.querySelector('h2').innerText = "Edit Link";
        }
    } else {
        nameInput.value = '';
        urlInput.value = '';
        modal.querySelector('h2').innerText = "Add New Link";
    }
    modal.classList.add('active');
}

function saveLink() {
    const name = document.getElementById('editName').value.trim();
    const url = document.getElementById('editUrl').value.trim();
    
    if (!name || !url) return alert("Both name and URL are required.");

    if (isEditingId) {
        const index = links.findIndex(l => l.id === isEditingId);
        if (index !== -1) {
            links[index].name = name;
            links[index].url = url;
        }
    } else {
        const newLink = {
            id: Date.now().toString(), 
            name,
            url
        };
        links.push(newLink);
    }
    
    saveLinks();
    renderLinks();
    closeModal('linkEditorModal');
}

function editLink(id, e) {
    // Crucial fix: stop the event from bubbling up to the card's navigation logic
    e.stopPropagation(); 
    openEditor(id);
}

function deleteLink(id, e) {
    e.stopPropagation(); 
    if(confirm(`Are you sure you want to delete this link?`)) {
        links = links.filter(l => l.id !== id);
        saveLinks();
        renderLinks();
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- SEARCH / QUICK-LAUNCH ---
function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const input = document.getElementById('searchInput').value.trim();
        if (!input) return;

        let url = input;
        
        if (!input.includes('.') || input.includes(' ')) {
            // It's a search query. Find the engine URL.
            const engine = searchEngines.find(s => s.name === settings.searchEngine);
            const baseUrl = engine ? engine.url : searchEngines[0].url; 
            url = `${baseUrl}${encodeURIComponent(input)}`;
        } else if (!input.startsWith('http')) {
            // It's a domain, but missing protocol. Assume HTTPS.
            url = `https://${input}`;
        }
        
        window.location.href = url;
        e.preventDefault(); 
    }
}

// --- SETTINGS MODAL ---
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.toggle('active');
}


// --- EXPOSE FUNCTIONS GLOBALLY ---
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.closeModal = closeModal;
window.handleSearch = handleSearch;
window.toggleSettings = toggleSettings;
window.saveSettings = saveSettings;
window.toggleEditMode = toggleEditMode;
