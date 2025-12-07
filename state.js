// state.js

// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');
// UPDATED DEFAULT: Add externalSuggest: false
let settings = JSON.parse(localStorage.getItem('0fluff_settings') || '{"theme":"dark","clockFormat":"24h","searchEngine":"Google", "userName": "", "externalSuggest": false}'); 
let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]'); 
let isEditMode = false;
let isEditingId = null;

// Engine Configuration (Initial + Icon Initials)
const searchEngines = [
// ... (Remains the same) ...
    { name: 'Google', initial: 'G', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', initial: 'D', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', initial: 'B', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', initial: 'b', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', initial: 'S', url: 'https://www.startpage.com/sp/search?query=' }
];
