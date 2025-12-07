// state.js

// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');

let settings = JSON.parse(localStorage.getItem('0fluff_settings') || JSON.stringify({
    theme: "dark",
    clockFormat: "24h",
    searchEngine: "Google", 
    userName: "", 
    externalSuggest: false,
    backgroundImage: null, // New: Stores Base64 image
    newsEnabled: false     // New: Toggle for RSS
})); 

let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]'); 
let isEditMode = false;
let isEditingId = null;

// Default RSS Feed (BBC World News - reliable, CORS-friendly usually)
const DEFAULT_RSS = 'http://feeds.bbci.co.uk/news/world/rss.xml';

// Engine Configuration
const searchEngines = [
    { name: 'Google', initial: 'G', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', initial: 'D', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', initial: 'B', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', initial: 'b', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', initial: 'S', url: 'https://www.startpage.com/sp/search?query=' }
];
