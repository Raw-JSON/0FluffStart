// --- STATE MANAGEMENT ---
let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');
let isEditingId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    renderLinks();
    
    // Attach event listener for the search bar
    document.getElementById('searchInput').addEventListener('keypress', handleSearch);
});

// --- DATA MANAGEMENT ---
function saveLinks() {
    localStorage.setItem('0fluff_links', JSON.stringify(links));
}

// --- RENDERING ---
function renderLinks() {
    const grid = document.getElementById('linkGrid');
    grid.innerHTML = '';

    links.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.setAttribute('data-id', link.id);
        
        // Use the first letter of the name as a minimal "icon"
        const initial = link.name.charAt(0).toUpperCase();

        card.innerHTML = `
            <div style="font-size: 2.5rem; color: var(--accent);">${initial}</div>
            <div class="link-name">${link.name}</div>
            
            <div class="edit-overlay">
                <button onclick="editLink('${link.id}', event)">✏️ Edit</button>
                <button onclick="deleteLink('${link.id}', event)" style="color: var(--delete); border-color: var(--delete);">🗑 Delete</button>
            </div>
        `;
        
        // Primary action: navigate on click
        card.onclick = (e) => {
            // Check if the click was inside the edit overlay buttons
            if (e.target.closest('.edit-overlay')) return;
            window.location.href = link.url.startsWith('http') ? link.url : `http://${link.url}`;
        };
        
        grid.appendChild(card);
    });
}

// --- LINK EDITOR (CRUD) ---

function openEditor(id = null) {
    const modal = document.getElementById('linkEditorModal');
    const nameInput = document.getElementById('editName');
    const urlInput = document.getElementById('editUrl');
    
    isEditingId = id;
    
    if (id) {
        // Edit mode
        const link = links.find(l => l.id === id);
        if (link) {
            nameInput.value = link.name;
            urlInput.value = link.url;
            modal.querySelector('h2').innerText = "Edit Link";
        }
    } else {
        // Create mode
        nameInput.value = '';
        urlInput.value = '';
        modal.querySelector('h2').innerText = "Add New Link";
    }
    modal.classList.add('active');
}

function saveLink() {
    const name = document.getElementById('editName').value.trim();
    const url = document.getElementById('editUrl').value.trim();
    
    if (!name || !url) return alert("Both name and URL are required.");

    if (isEditingId) {
        // Update existing link
        const index = links.findIndex(l => l.id === isEditingId);
        if (index !== -1) {
            links[index].name = name;
            links[index].url = url;
        }
    } else {
        // Create new link
        const newLink = {
            id: Date.now().toString(), // Use timestamp as unique ID
            name,
            url
        };
        links.push(newLink);
    }
    
    saveLinks();
    renderLinks();
    closeModal('linkEditorModal');
}

function editLink(id, e) {
    // Prevent the card's primary navigation click
    e.stopPropagation(); 
    openEditor(id);
}

function deleteLink(id, e) {
    // Prevent the card's primary navigation click
    e.stopPropagation(); 
    if(confirm(`Are you sure you want to delete this link?`)) {
        links = links.filter(l => l.id !== id);
        saveLinks();
        renderLinks();
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- SEARCH / QUICK-LAUNCH ---
function handleSearch(e) {
    if (e.key === 'Enter') {
        const input = document.getElementById('searchInput').value.trim();
        if (!input) return;

        // Simple check: is it a URL or a search query?
        let url = input;
        
        if (!input.includes('.') || input.includes(' ')) {
            // It's likely a search query. Use Google as the default engine.
            url = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
        } else if (!input.startsWith('http')) {
            // It's a domain, but missing protocol. Assume HTTPS.
            url = `https://${input}`;
        }
        
        window.location.href = url;
        e.preventDefault(); // Stop form submission behavior
    }
}


// --- EXPOSE FUNCTIONS GLOBALLY ---
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.closeModal = closeModal;
