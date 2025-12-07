// ui-logic.js

/* global links, settings, isEditMode, isEditingId, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, fetchNews */

document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    loadSettings(); 
    setInterval(updateClock, 1000);
    renderEngineDropdown(); 
    updateClock(); 
    
    // News Init
    if(settings.newsEnabled) renderNews();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.engine-switcher')) document.getElementById('engineDropdown')?.classList.add('hidden');
        if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionsContainer')) document.getElementById('suggestionsContainer')?.classList.add('hidden');
    });
    
    window.handleSuggestions = handleSuggestions;
});

// --- BACKGROUND IMAGE LOGIC ---
function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) { // 3MB Limit
        alert("Image is too large. Please select an image under 3MB to keep the app fast.");
        input.value = ''; // Reset
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            settings.backgroundImage = e.target.result;
            localStorage.setItem('0fluff_settings', JSON.stringify(settings));
            loadSettings(); // Re-apply immediately
        } catch (err) {
            alert("Storage limit reached. Try a smaller image.");
            console.error(err);
        }
    };
    reader.readAsDataURL(file);
}

function clearBackground() {
    settings.backgroundImage = null;
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    document.getElementById('bgImageInput').value = '';
    loadSettings();
}

// --- NEWS LOGIC ---
async function renderNews() {
    const container = document.getElementById('newsContainer');
    const list = document.getElementById('newsList');
    
    if (!settings.newsEnabled) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    list.innerHTML = '<div class="news-loading">Updating...</div>';
    
    const headlines = await fetchNews();
    list.innerHTML = '';
    
    if (headlines.length === 0) {
        list.innerHTML = '<div class="news-item">No news available.</div>';
        return;
    }

    headlines.forEach(item => {
        const div = document.createElement('a');
        div.className = 'news-item';
        div.href = item.link;
        div.target = "_blank";
        div.textContent = item.title;
        list.appendChild(div);
    });
}

// --- SETTINGS LOGIC (Updated) ---
function loadSettings() {
    // 1. Apply Theme Class
    document.body.className = settings.theme; 
    
    // 2. Apply Background Image (If exists)
    const overlay = document.getElementById('bgOverlay');
    if (settings.backgroundImage) {
        document.body.style.backgroundImage = `url('${settings.backgroundImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        if(overlay) overlay.style.opacity = '1'; // Show overlay to dim image
    } else {
        document.body.style.backgroundImage = ''; // Reset
        if(overlay) overlay.style.opacity = '0';
    }

    // 3. Set Inputs
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('userNameInput').value = settings.userName || '';
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) {
        if(r.value === settings.clockFormat) r.checked = true;
    }
    
    document.getElementById('externalSuggestToggle').checked = settings.externalSuggest;
    document.getElementById('newsToggle').checked = settings.newsEnabled;
    
    updateClock(); 
    renderEngineDropdown();
}

function autoSaveSettings() {
    settings.theme = document.getElementById('themeSelect').value;
    settings.userName = document.getElementById('userNameInput').value.trim();
    
    const radios = document.getElementsByName('clockFormat');
    for(let r of radios) if(r.checked) settings.clockFormat = r.value;
    
    settings.externalSuggest = document.getElementById('externalSuggestToggle').checked;
    
    // Check if News toggle changed
    const newsState = document.getElementById('newsToggle').checked;
    if (settings.newsEnabled !== newsState) {
        settings.newsEnabled = newsState;
        renderNews(); // Trigger fetch/hide immediately
    }
    
    localStorage.setItem('0fluff_settings', JSON.stringify(settings));
    loadSettings(); // Re-apply
}

// Expose globals (Keep previous ones + new ones)
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
// ... (Previous exports: renderLinks, renderEngineDropdown, etc.)
window.renderLinks = renderLinks;
window.renderEngineDropdown = renderEngineDropdown;
window.toggleEngineDropdown = toggleEngineDropdown;
window.selectEngine = selectEngine;
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.toggleSettings = toggleSettings;
window.closeModal = closeModal;
window.handleSearch = handleSearch;
window.selectSuggestion = selectSuggestion;
window.cancelEdit = cancelEdit;
window.autoSaveSettings = autoSaveSettings;
