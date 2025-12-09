// state.js

// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');

// Removed newsEnabled, newsTopic
let settings = JSON.parse(localStorage.getItem('0fluff_settings') || JSON.stringify({
    theme: "dark",
    clockFormat: "24h",
    searchEngine: "Google", 
    userName: "", 
    externalSuggest: false,
    backgroundImage: null,
    historyEnabled: true,
    quotesEnabled: true // <--- NEW: Enabled by default
})); 

let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]'); 
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
