// state.js

// --- HELPER: SAFE PARSING ---
// Prevents app crash if LocalStorage is corrupted (malformed JSON)
function safeParse(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`[0FluffStart] Corrupt data detected for '${key}'. Resetting to default.`);
        return fallback;
    }
}

// --- STATE ---
let links = safeParse('0fluff_links', []);

// Default Settings Object
const defaultSettings = {
    theme: "dark",
    clockFormat: "24h",
    searchEngine: "Google", 
    userName: "", 
    externalSuggest: false,
    backgroundImage: null,
    historyEnabled: true
};

// Merge saved settings with defaults to ensure new keys (like historyEnabled) exist even if old config is loaded
let savedSettings = safeParse('0fluff_settings', {});
let settings = { ...defaultSettings, ...savedSettings };

let searchHistory = safeParse('0fluff_history', []); 

let isEditMode = false;
let isEditingId = null;

// Engine Configuration
const searchEngines = [
    { name: 'Google', initial: 'G', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', initial: 'D', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', initial: 'B', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', initial: 'b', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', initial: 'S', url: 'https://www.startpage.com/sp/search?query=' }
];
