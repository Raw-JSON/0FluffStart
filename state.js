// state.js

// --- STATE ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');

let settings = JSON.parse(localStorage.getItem('0fluff_settings') || JSON.stringify({
    theme: "dark",
    clockFormat: "24h",
    searchEngine: "Google", 
    userName: "", 
    externalSuggest: false,
    backgroundImage: null, 
    newsEnabled: false,
    newsTopic: "TOP" // New: Default to Top Stories
})); 

let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]'); 
let isEditMode = false;
let isEditingId = null;

// Google News Topic Map (US/EN locale hardcoded for consistency)
const NEWS_TOPICS = {
    "TOP": { name: "Top Stories", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
    "TECH": { name: "Technology", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en" },
    "BUSINESS": { name: "Business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en" },
    "SCIENCE": { name: "Science", url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en" },
    "HEALTH": { name: "Health", url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en" },
    "SPORTS": { name: "Sports", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en" },
    "ENTERTAINMENT": { name: "Entertainment", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en" }
};

// Engine Configuration
const searchEngines = [
    { name: 'Google', initial: 'G', url: 'https://www.google.com/search?q=' },
    { name: 'DuckDuckGo', initial: 'D', url: 'https://duckduckgo.com/?q=' },
    { name: 'Brave', initial: 'B', url: 'https://search.brave.com/search?q=' },
    { name: 'Bing', initial: 'b', url: 'https://www.bing.com/search?q=' },
    { name: 'Startpage', initial: 'S', url: 'https://www.startpage.com/sp/search?query=' }
];
