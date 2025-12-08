// utilities.js

/* global links, settings, searchHistory, searchEngines */ 

let debounceTimer; // Architectural state for debouncing

// --- SUGGESTIONS ---
// Keeps external suggestion functionality if user enables it, but simplifies everything else.
async function fetchExternalSuggestions(query) {
    const targetUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const res = await fetch(proxyUrl);
        if (!res.ok) return [];
        const data = await res.json();
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
    
    // 1. Reset UI immediately for the new keystroke
    container.innerHTML = '';
    
    if (input.length < 2) {
        container.classList.add('hidden');
        return;
    }
    
    let suggestions = [];
    
    // 2. Local Matches (Instant / Synchronous)
    // We process these immediately so the user sees feedback instantly
    const linkMatches = links
        .filter(l => l.name.toLowerCase().includes(input))
        .map(l => ({ name: l.name, url: l.url, type: 'Link' }));
    suggestions.push(...linkMatches);
    
    const historyMatches = searchHistory
        .filter(h => h.toLowerCase().includes(input) && !linkMatches.some(l => l.name.toLowerCase() === h.toLowerCase()))
        .map(h => ({ name: h, type: 'History' }));
    suggestions.push(...historyMatches);
    
    // Render Local Results immediately
    suggestions.slice(0, 8).forEach(s => { 
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<span>${s.name}</span><span class="suggestion-type">${s.type}</span>`;
        item.onclick = () => selectSuggestion(s);
        container.appendChild(item);
    });

    if(suggestions.length > 0) container.classList.remove('hidden');

    // 3. External Matches (Debounced / Asynchronous)
    // Only fire this if the user pauses typing for 300ms
    clearTimeout(debounceTimer); // Cancel previous pending request
    
    if (settings.externalSuggest) {
        debounceTimer = setTimeout(() => {
            fetchExternalSuggestions(input).then(external => {
                 // STATE CHECK: Verify the input is still what we searched for.
                 // If user typed more while we were fetching, discard these results.
                 const currentVal = document.getElementById('searchInput').value.toLowerCase().trim();
                 if (currentVal !== input) return;

                 if(container.classList.contains('hidden') && external.length > 0) container.classList.remove('hidden');
                 
                 external.forEach(term => {
                    // Avoid duplicates with local data
                    if (!suggestions.some(s => s.name.toLowerCase() === term.toLowerCase())) {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.innerHTML = `<span>${term}</span><span class="suggestion-type">Search</span>`;
                        item.onclick = () => selectSuggestion({name:term, type:'Search'});
                        container.appendChild(item);
                    }
                 });
            });
        }, 300); // 300ms Delay
    }
}

function logSearch(query) {
    query = query.trim();
    if (query === '' || query.includes('.') && !query.includes(' ')) return;
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 10) searchHistory = searchHistory.slice(0, 10);
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

// Expose
window.handleSuggestions = handleSuggestions;
window.logSearch = logSearch;
window.updateClock = updateClock;
