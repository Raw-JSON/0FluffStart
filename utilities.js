// utilities.js

// Import required state from state.js (Assumes state.js is loaded first in HTML)
/* global links, settings, searchHistory, searchEngines */ 

// --- UPDATED EXTERNAL FETCH UTILITY (Dual-Proxy FIX) ---

async function fetchExternalSuggestions(query) {
    const duckduckgoSuggestUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    const proxies = [
        { url: `https://corsproxy.io/?${encodeURIComponent(duckduckgoSuggestUrl)}`, type: 'raw' }, // Primary
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(duckduckgoSuggestUrl)}`, type: 'wrapped' } // Secondary
    ];

    for (const proxy of proxies) {
        try {
            console.log(`Attempting fetch via: ${proxy.url}`);
            const res = await fetch(proxy.url);
            
            if (!res.ok) {
                throw new Error(`Proxy status: ${res.status}`);
            }

            let data;
            if (proxy.type === 'raw') {
                // Type 'raw' (corsproxy.io): Expects direct JSON response
                data = await res.json(); 
            } else {
                // Type 'wrapped' (allorigins.win): Response is wrapped in { contents: "..." }
                const wrappedData = await res.json();
                if (wrappedData.contents) {
                     // Crucial step: Parse the contents string to get the final JSON array
                    data = JSON.parse(wrappedData.contents); 
                } else {
                    throw new Error("AllOrigins contents missing.");
                }
            }

            // DuckDuckGo returns an array of objects: [{phrase: "suggestion1"}, ...]
            if (Array.isArray(data) && data.length > 0) {
                console.log("Successfully fetched and parsed data.");
                return data.map(item => item.phrase).filter(p => p); 
            }
        } catch (e) {
            console.warn(`Proxy failed (${proxy.type}): ${e.message}`);
        }
    }
    return [];
}


// --- NEW: SUGGESTION LOGIC (Updated) ---
// Requires selectSuggestion, which is in ui-logic.js (must be exposed globally/imported)
/* global selectSuggestion */

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
        
        // selectSuggestion is in ui-logic.js
        item.onclick = () => selectSuggestion(s);
        container.appendChild(item);
    });
    
    container.classList.remove('hidden');
}


// --- UTILS ---

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

// Requires renderEngineDropdown from ui-logic.js
/* global renderEngineDropdown */
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
    renderEngineDropdown(); // Renders UI element
}

// Requires updateClock from this file, but only affects settings object and localStorage
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

// Expose these for external use (e.g., HTML events or ui-logic.js)
window.handleSuggestions = handleSuggestions;
window.logSearch = logSearch;
window.updateClock = updateClock;
window.loadSettings = loadSettings;
window.autoSaveSettings = autoSaveSettings;
