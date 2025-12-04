// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');
let settings = JSON.parse(localStorage.getItem('0fluff_settings') || '{"theme":"dark","clockFormat":"24h","searchEngine":"Google", "userName": ""}');
let isEditMode = false;
let isEditingId = null;

const searchEngines = [
    { name: 'Google', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', url: 'https://www.bing.com/search?q=' },
    { name: 'Qwant', url: 'https://www.qwant.com/?q=' },
    { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=' }
];

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    loadSettings();
    setInterval(updateClock, 1000);
    populateSearchEngines();
    updateClock(); 
});

// --- CORE FUNCTIONS ---

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editToggleBtn');
    
    if(isEditMode) {
        btn.classList.add('active');
        btn.innerText = '✓'; // Change icon to Checkmark when done
    } else {
        btn.classList.remove('active');
        btn.innerText = '✎';
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
            
            // In this specific design, clicking the main icon in edit mode opens the editor
            item.onclick = (e) => editLink(link.id, e);
        } else {
            // Normal Mode: Navigate
            item.onclick = () => {
                const finalUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                window.location.href = finalUrl;
            };
        }

        item.innerHTML = html;
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
    // Load current user name into the input before opening
    document.getElementById('userNameInput').value = settings.userName;
    document.getElementById('settingsModal').classList.add('active'); 
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function handleSearch(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const val = document.getElementById('searchInput').value.trim();
        if (!val) return;
        
        const engine = searchEngines.find(s => s.name === settings.searchEngine) || searchEngines[0];
        if (val.includes('.') && !val.includes(' ')) {
            window.location.href = val.startsWith('http') ? val : `https://${val}`;
        } else {
            window.location.href = `${engine.url}${encodeURIComponent(val)}`;
        }
    }
}

// NEW: Dynamic Greeting Function
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
        
        // FIX: Remove leading zero padding for 12h format
        if (h < 10) h = String(h).replace(/^0+/, ''); 
    } else {
         h = String(h).padStart(2, '0'); // Keep padding for 24h
    }
    
    // Update Clock
    document.getElementById('clockDisplay').innerText = `${h}:${m}:${s}${suffix}`;

    // Update Greeting (Less frequent, perhaps every 60s, but we'll do it here for simplicity)
    document.getElementById('greetingDisplay').innerText = getGreeting(settings.userName);
}

function populateSearchEngines() {
    const sel = document.getElementById('searchEngineSelect');
    sel.innerHTML = ''; 
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
    
    // Handle Radio Selection manually
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.value === settings.clockFormat) r.checked = true;
    }
    
    // Update the greeting text in the header
    updateClock(); 
}

function saveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.searchEngine = document.getElementById('searchEngineSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim(); // NEW: Save user name
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.checked) settings.clockFormat = r.value;
    }
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    loadSettings(); 
    updateClock();
    closeModal('settingsModal');
}
