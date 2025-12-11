// utilities.js

/* global links, settings, searchHistory, searchEngines */ 

// --- SEARCH ENGINE UTILITY ---

function getCurrentSearchEngine() {
    return searchEngines.find(e => e.name === settings.searchEngine) || searchEngines[0];
}

// --- SUGGESTIONS ---

let debounceTimer;

async function fetchExternalSuggestions(query) {
    const targetUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    
    // STRATEGY 1: Corsproxy.io (Faster, cleaner)
    try {
        // Note: corsproxy.io simply returns the raw body of the target
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            // DDG returns [{phrase: "..."}]
            if (Array.isArray(data)) return data.map(item => item.phrase).filter(p => p);
        }
    } catch(e) {
        console.warn("Primary proxy failed, switching to fallback...", e);
    }

    // STRATEGY 2: AllOrigins (Fallback)
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const wrapper = await res.json();
            // AllOrigins wraps response in 'contents' string
            const innerData = JSON.parse(wrapper.contents);
            if (Array.isArray(innerData)) return innerData.map(item => item.phrase).filter(p => p);
        }
    } catch(e) {
        console.error("All proxies failed for suggestions.", e);
    }

    return [];
}

// --- UTILS ---

function handleSuggestions() {
    const inputEl = document.getElementById('searchInput');
    const input = inputEl.value.toLowerCase().trim();
    const container = document.getElementById('suggestionsContainer');
    
    clearTimeout(debounceTimer);

    if (input.length < 2) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }
    
    // 1. Local Matches (Instant)
    let suggestions = [];
    
    if (settings.historyEnabled) { 
        const linkMatches = links
            .filter(l => l.name.toLowerCase().includes(input))
            .map(l => ({ name: l.name, url: l.url, type: 'Link' }));
            
        const historyMatches = searchHistory
            .filter(h => h.toLowerCase().includes(input))
            .map(h => ({ name: h, type: 'History' }));

        suggestions = [...linkMatches, ...historyMatches];
    }
    
    // Render Local immediately
    renderSuggestions(suggestions, container);

    // 2. External Matches (Debounced)
    if (settings.externalSuggest) {
        debounceTimer = setTimeout(() => {
            fetchExternalSuggestions(input).then(external => {
                const uniqueExternal = external.map(name => ({ name: name, type: 'Search' }))
                    .filter(ext => !suggestions.some(s => s.name.toLowerCase() === ext.name.toLowerCase()));
                
                const finalSuggestions = [...suggestions, ...uniqueExternal];
                renderSuggestions(finalSuggestions, container);
            });
        }, 300); 
    }
}

function renderSuggestions(suggestions, container) {
    container.innerHTML = '';

    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    suggestions.slice(0, 10).forEach(s => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.setAttribute('onclick', `selectSuggestion({ name: '${s.name.replace(/'/g, "\\'")}', url: '${s.url || ''}', type: '${s.type}' })`);
        
        const nameEl = document.createElement('span');
        nameEl.innerText = s.name;
        
        const typeEl = document.createElement('span');
        typeEl.className = 'suggestion-type';
        typeEl.innerText = s.type === 'Search' ? 'Web' : s.type;
        
        item.appendChild(nameEl);
        item.appendChild(typeEl);
        container.appendChild(item);
    });
    
    container.classList.remove('hidden');
}

function logSearch(query) {
    if (settings.historyEnabled && query.trim() && !searchHistory.includes(query)) {
        searchHistory.unshift(query);
        searchHistory = searchHistory.slice(0, 20); 
        localStorage.setItem('0fluff_history', JSON.stringify(searchHistory));
    }
}

function clearHistory() { 
    searchHistory = [];
    localStorage.removeItem('0fluff_history');
    document.getElementById('searchInput').focus();
    handleSuggestions(); 
    alert("Search history has been cleared.");
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

function handleImageUpload(input) {
    const file = input.files[0];
    const fileNameEl = document.getElementById('bgFileName');
    const resetBtn = document.getElementById('resetBgBtn');
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            settings.backgroundImage = e.target.result; 
            autoSaveSettings();
            fileNameEl.innerText = file.name;
            resetBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    } else {
        settings.backgroundImage = null;
        autoSaveSettings();
        fileNameEl.innerText = 'No image selected.';
        resetBtn.style.display = 'none';
    }
}

function clearBackground() {
    settings.backgroundImage = null;
    autoSaveSettings();
    document.getElementById('bgImageInput').value = '';
    document.getElementById('bgFileName').innerText = 'No image selected.';
    document.getElementById('resetBgBtn').style.display = 'none';
}

// Exports
window.fetchExternalSuggestions = fetchExternalSuggestions;
window.handleSuggestions = handleSuggestions;
window.logSearch = logSearch;
window.clearHistory = clearHistory;
window.getGreeting = getGreeting;
window.updateClock = updateClock;
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.getCurrentSearchEngine = getCurrentSearchEngine;
