// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');
let settings = JSON.parse(localStorage.getItem('0fluff_settings') || '{"theme":"dark","clockFormat":"24h","searchEngine":"Google"}');
let isEditMode = false;
let isEditingId = null;

const searchEngines = [
    { name: 'Google', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', url: 'https://www.bing.com/search?q=' }
];

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    loadSettings();
    setInterval(updateClock, 1000);
    populateSearchEngines();
});

// --- CORE FUNCTIONS ---

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editToggleBtn');
    
    // Visual feedback for the button itself
    if(isEditMode) {
        btn.style.background = 'var(--accent)';
        btn.style.color = 'var(--bg)';
    } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text)';
    }
    
    renderLinks();
}

function renderLinks() {
    const grid = document.getElementById('linkGrid');
    grid.innerHTML = '';

    links.forEach(link => {
        // Safe URL parsing for favicon
        let domain = 'example.com';
        try {
            // Add https if missing to parse correctly
            let urlForParse = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            domain = new URL(urlForParse).hostname;
        } catch(e) { console.error(e); }

        // Use Google's service for high-quality favicons
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const initial = link.name.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = `link-item ${isEditMode ? 'editing' : ''}`;
        
        // HTML Structure
        let html = `
            <div class="link-icon-circle">
                <img src="${iconUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" alt="icon">
                <span style="display:none; font-size:1.5rem; color:var(--accent);">${initial}</span>
            </div>
            <div class="link-name">${link.name}</div>
        `;

        // If Editing, add badges
        if (isEditMode) {
            html += `
                <div class="delete-badge" onclick="deleteLink('${link.id}', event)">✕</div>
                <div class="edit-badge" onclick="editLink('${link.id}', event)">✎</div>
            `;
        }

        item.innerHTML = html;

        // Click Logic
        item.onclick = () => {
            if (!isEditMode) {
                // Navigate
                const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                window.location.href = finalUrl;
            }
        };

        grid.appendChild(item);
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
        nameInput.value = link.name;
        urlInput.value = link.url;
    } else {
        nameInput.value = '';
        urlInput.value = '';
    }
    modal.classList.add('active');
}

function saveLink() {
    const name = document.getElementById('editName').value.trim();
    const url = document.getElementById('editUrl').value.trim();
    if (!name || !url) return alert("Fill in both fields.");

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

function editLink(id, e) { e.stopPropagation(); openEditor(id); }
function deleteLink(id, e) {
    e.stopPropagation();
    if(confirm("Delete link?")) {
        links = links.filter(l => l.id !== id);
        localStorage.setItem('0fluff_links', JSON.stringify(links));
        renderLinks();
    }
}

// --- UTILS ---
function toggleSettings() { document.getElementById('settingsModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        
        const engine = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
        // Check if it's a URL
        if (val.includes('.') && !val.includes(' ')) {
            window.location.href = val.startsWith('http') ? val : `https://${val}`;
        } else {
            window.location.href = `${engine.url}${encodeURIComponent(val)}`;
        }
    }
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
    }
    h = String(h).padStart(2, '0');
    document.getElementById('clockDisplay').innerText = `${h}:${m}:${s}${suffix}`;
}

function populateSearchEngines() {
    const sel = document.getElementById('searchEngineSelect');
    searchEngines.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.name;
        opt.innerText = e.name;
        sel.appendChild(opt);
    });
}

function loadSettings() {
    document.body.className = settings.theme;
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('searchEngineSelect').value = settings.searchEngine;
    
    // Select radio button
    const radio = document.querySelector(`input[name="clockFormat"][value="${settings.clockFormat}"]`);
    if(radio) radio.checked = true;
}

function saveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.searchEngine = document.getElementById('searchEngineSelect').value;
    settings.clockFormat = document.querySelector('input[name="clockFormat"]:checked').value;
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    loadSettings(); // Apply theme
    updateClock();
    closeModal('settingsModal');
}
