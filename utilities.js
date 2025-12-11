// utilities.js

/* global links, settings, searchHistory, searchEngines */ 

// --- SEARCH ENGINE UTILITY ---

/**
 * Retrieves the currently selected search engine object from the global list.
 * Defaults to the first engine in the list if the current setting is invalid or missing.
 * @returns {object} The current search engine configuration object.
 */
function getCurrentSearchEngine() {
    return searchEngines.find(e => e.name === settings.searchEngine) || searchEngines[0];
}

// --- SUGGESTIONS ---

// Debounce timer to prevent API spamming
let debounceTimer;

// Keeps external suggestion functionality if user enables it, but simplifies everything else.
async function fetchExternalSuggestions(query) {
    // CORS is a problem, so we use a proxy (allorigins) for the DuckDuckGo API call.
    const targetUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    // CORS Awareness: This is the proxy handling, mandatory for client-side fetching.
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const res = await fetch(proxyUrl);
        if (!res.ok) return [];
        const data = await res.json();
        // The data.contents is a stringified JSON from the proxied endpoint.
        const innerData = JSON.parse(data.contents);
        if (Array.isArray(innerData)) return innerData.map(item => item.phrase).filter(p => p);
    } catch(e) { console.error("Suggestion Error", e); }
    return [];
}

// --- UTILS ---

function handleSuggestions() {
    const inputEl = document.getElementById('searchInput');
    const input = inputEl.value.toLowerCase().trim();
    const container = document.getElementById('suggestionsContainer');
    
    // Clear pending external fetch if user keeps typing
    clearTimeout(debounceTimer);

    if (input.length < 2) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }
    
    // 1. Gather Local Matches (Instant)
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
    
    // 2. Render Local Immediately (Zero Latency UX)
    renderSuggestions(suggestions, container);

    // 3. Fetch External (Debounced & Engine Agnostic)
    if (settings.externalSuggest) {
        // We wait 300ms. If user types again, this timer is cleared above.
        debounceTimer = setTimeout(() => {
            fetchExternalSuggestions(input).then(external => {
                // Filter out exact duplicates from internal lists
                const uniqueExternal = external.map(name => ({ name: name, type: 'Search' }))
                    .filter(ext => !suggestions.some(s => s.name.toLowerCase() === ext.name.toLowerCase()));
                
                // Combine and re-render
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
    
    // Only show the top 10 results to prevent massive screen takeover
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
        // Prepend new query and limit history to 20 items for efficiency
        searchHistory.unshift(query);
        searchHistory = searchHistory.slice(0, 20); 
        localStorage.setItem('0fluff_history', JSON.stringify(searchHistory));
    }
}

function clearHistory() { 
    searchHistory = [];
    localStorage.removeItem('0fluff_history');
    document.getElementById('searchInput').focus();
    handleSuggestions(); // Clear any visible suggestions
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
            settings.backgroundImage = e.target.result; // Base64 storage
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
    document.getElementById('bgImageInput').value = ''; // Reset file input
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
window.getCurrentSearchEngine = getCurrentSearchEngine; // NEW EXPORT
