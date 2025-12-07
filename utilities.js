// utilities.js

/* global links, settings, searchHistory, searchEngines, NEWS_TOPICS */ 

// --- GENERIC PROXY FETCH (Reusable) ---
async function fetchViaProxy(targetUrl) {
    const proxies = [
        { url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, type: 'raw' },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, type: 'wrapped' }
    ];

    for (const proxy of proxies) {
        try {
            const res = await fetch(proxy.url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            
            if (proxy.type === 'raw') return await res.text(); // Return text (JSON or XML)
            
            // Wrapped (AllOrigins)
            const json = await res.json();
            return json.contents; 
        } catch (e) {
            console.warn(`Proxy ${proxy.type} failed:`, e);
        }
    }
    return null;
}

// --- SUGGESTIONS ---
async function fetchExternalSuggestions(query) {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;
    try {
        const rawData = await fetchViaProxy(url);
        if(!rawData) return [];
        
        const data = JSON.parse(rawData); // DuckDuckGo returns JSON
        if (Array.isArray(data)) return data.map(item => item.phrase).filter(p => p);
    } catch(e) { console.error("Suggestion Parse Error", e); }
    return [];
}

// --- NEWS FEED LOGIC (Enhanced) ---
async function fetchNews() {
    if (!settings.newsEnabled) return [];
    
    // Get URL based on topic setting
    const topicKey = settings.newsTopic || "TOP";
    const feedUrl = NEWS_TOPICS[topicKey] ? NEWS_TOPICS[topicKey].url : NEWS_TOPICS["TOP"].url;
    
    try {
        const rawXML = await fetchViaProxy(feedUrl);
        if (!rawXML) throw new Error("No data from proxies");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawXML, "text/xml");
        const items = xmlDoc.querySelectorAll("item");
        
        const headlines = [];
        // No limit - get all available items for "Endless Scroll" feel
        items.forEach(item => {
            let titleRaw = item.querySelector("title")?.textContent || "No Title";
            const link = item.querySelector("link")?.textContent || "#";
            const pubDate = item.querySelector("pubDate")?.textContent || "";
            
            // Google News Format: "Headline - Source Name"
            // We split this to make visual cards
            let source = "News";
            let title = titleRaw;
            
            const lastDash = titleRaw.lastIndexOf(" - ");
            if (lastDash !== -1) {
                title = titleRaw.substring(0, lastDash);
                source = titleRaw.substring(lastDash + 3);
            }
            
            // Format time (simple relative or short date)
            let timeDisplay = "";
            if (pubDate) {
                const date = new Date(pubDate);
                const now = new Date();
                const diffMs = now - date;
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                
                if (diffHrs < 1) timeDisplay = "Just now";
                else if (diffHrs < 24) timeDisplay = `${diffHrs}h ago`;
                else timeDisplay = date.toLocaleDateString();
            }

            headlines.push({ title, source, time: timeDisplay, link });
        });
        
        return headlines;
    } catch (e) {
        console.error("News Fetch Error:", e);
        return [{ title: "Unable to load news feed.", source: "System", time: "Now", link: "#" }];
    }
}

// --- UTILS --- (Keep existing logSearch, getGreeting, updateClock)

function handleSuggestions() {
    const inputEl = document.getElementById('searchInput');
    const input = inputEl.value.toLowerCase().trim();
    const container = document.getElementById('suggestionsContainer');
    
    container.innerHTML = '';
    
    if (input.length < 2) {
        container.classList.add('hidden');
        return;
    }
    
    let suggestions = [];
    
    // Internal
    const linkMatches = links
        .filter(l => l.name.toLowerCase().includes(input))
        .map(l => ({ name: l.name, url: l.url, type: 'Link' }));
    suggestions.push(...linkMatches);
    
    const historyMatches = searchHistory
        .filter(h => h.toLowerCase().includes(input) && !linkMatches.some(l => l.name.toLowerCase() === h.toLowerCase()))
        .map(h => ({ name: h, type: 'History' }));
    suggestions.push(...historyMatches);
    
    // External (Async)
    if (settings.externalSuggest) {
        fetchExternalSuggestions(input).then(external => {
             if(container.classList.contains('hidden')) return;
             external.forEach(term => {
                if (!suggestions.some(s => s.name.toLowerCase() === term.toLowerCase())) {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.innerHTML = `<span>${term}</span><span class="suggestion-type">Search</span>`;
                    item.onclick = () => selectSuggestion({name:term, type:'Search'});
                    container.appendChild(item);
                }
             });
        });
    }

    suggestions.slice(0, 8).forEach(s => { 
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<span>${s.name}</span><span class="suggestion-type">${s.type}</span>`;
        item.onclick = () => selectSuggestion(s);
        container.appendChild(item);
    });
    
    if(suggestions.length > 0 || settings.externalSuggest) container.classList.remove('hidden');
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
window.fetchNews = fetchNews;
window.handleSuggestions = handleSuggestions;
window.logSearch = logSearch;
window.updateClock = updateClock;
