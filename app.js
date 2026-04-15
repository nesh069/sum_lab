// Wordly Dictionary Application
const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const searchForm = document.getElementById('search-form');
const wordInput = document.getElementById('word-input');
const resultsSection = document.getElementById('results-section');
const loadingDiv = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const favoritesList = document.getElementById('favorites-list');
const themeToggle = document.getElementById('theme-toggle');

// State
let currentWord = null;
let favorites = JSON.parse(localStorage.getItem('wordly_favorites')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    displayFavorites();
    setupEventListeners();
});

function setupEventListeners() {
    searchForm.addEventListener('submit', handleSearch);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Audio button
    document.getElementById('audio-btn').addEventListener('click', playAudio);
    
    // Favorite button
    document.getElementById('favorite-btn').addEventListener('click', toggleFavorite);
}

// Search Handler
async function handleSearch(e) {
    e.preventDefault();
    const word = wordInput.value.trim().toLowerCase();
    
    if (!word) {
        showError('Please enter a word to search');
        return;
    }
    
    if (!/^[a-zA-Z\s-]+$/.test(word)) {
        showError('Please enter a valid word (letters only)');
        return;
    }
    
    clearError();
    showLoading();
    hideResults();
    
    try {
        const data = await fetchWordData(word);
        currentWord = data[0];
        displayResults(currentWord);
        updateFavoriteButton();
    } catch (error) {
        handleFetchError(error, word);
    } finally {
        hideLoading();
    }
}

// Fetch Data
async function fetchWordData(word) {
    const response = await fetch(`${API_URL}${word}`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Sorry, we couldn't find the word "${word}". Please check the spelling and try again.`);
        }
        throw new Error('Failed to fetch data. Please try again later.');
    }
    
    return response.json();
}

// Display Results
function displayResults(data) {
    // Set word title
    document.getElementById('word-title').textContent = data.word;
    
    // Set phonetic
    const phoneticText = document.getElementById('phonetic-text');
    const phonetic = data.phonetics.find(p => p.text) || data.phonetics[0];
    phoneticText.textContent = phonetic ? phonetic.text : '';
    
    // Store audio URL
    const audioObj = data.phonetics.find(p => p.audio);
    if (audioObj && audioObj.audio) {
        document.getElementById('audio-btn').dataset.audio = audioObj.audio;
        document.getElementById('audio-btn').style.display = 'flex';
    } else {
        document.getElementById('audio-btn').style.display = 'none';
    }
    
    // Display meanings
    const meaningsContainer = document.getElementById('meanings-container');
    meaningsContainer.innerHTML = '';
    
    data.meanings.forEach(meaning => {
        const meaningCard = createMeaningCard(meaning);
        meaningsContainer.appendChild(meaningCard);
    });
    
    // Set source link
    const sourceLink = document.getElementById('source-link');
    if (data.sourceUrls && data.sourceUrls[0]) {
        sourceLink.href = data.sourceUrls[0];
        sourceLink.textContent = 'Free Dictionary API';
    }
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Create Meaning Card
function createMeaningCard(meaning) {
    const card = document.createElement('div');
    card.className = 'meaning-card';
    
    // Part of speech
    const pos = document.createElement('div');
    pos.className = 'part-of-speech';
    pos.textContent = meaning.partOfSpeech;
    card.appendChild(pos);
    
    // Definitions
    if (meaning.definitions && meaning.definitions.length > 0) {
        const defList = document.createElement('ul');
        defList.className = 'definition-list';
        
        meaning.definitions.slice(0, 3).forEach((def, index) => {
            const li = document.createElement('li');
            
            const definitionText = document.createElement('div');
            definitionText.textContent = def.definition;
            li.appendChild(definitionText);
            
            // Example
            if (def.example) {
                const example = document.createElement('div');
                example.className = 'example';
                example.textContent = `"${def.example}"`;
                li.appendChild(example);
            }
            
            defList.appendChild(li);
        });
        
        card.appendChild(defList);
    }
    
    // Synonyms
    if (meaning.synonyms && meaning.synonyms.length > 0) {
        const synDiv = document.createElement('div');
        synDiv.className = 'synonyms';
        
        const synLabel = document.createElement('strong');
        synLabel.textContent = 'Synonyms: ';
        synDiv.appendChild(synLabel);
        
        meaning.synonyms.slice(0, 5).forEach(syn => {
            const tag = document.createElement('span');
            tag.className = 'synonym-tag';
            tag.textContent = syn;
            synDiv.appendChild(tag);
        });
        
        card.appendChild(synDiv);
    }
    
    return card;
}

// Audio Playback
function playAudio() {
    const audioUrl = document.getElementById('audio-btn').dataset.audio;
    if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => {
            console.error('Audio playback failed:', err);
            showError('Audio playback not available for this word');
        });
    }
}

// Favorites Management
function toggleFavorite() {
    if (!currentWord) return;
    
    const word = currentWord.word;
    const index = favorites.indexOf(word);
    
    if (index === -1) {
        favorites.push(word);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('wordly_favorites', JSON.stringify(favorites));
    updateFavoriteButton();
    displayFavorites();
}

function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    const icon = btn.querySelector('i');
    
    if (currentWord && favorites.includes(currentWord.word)) {
        btn.classList.add('active');
        icon.classList.remove('far');
        icon.classList.add('fas');
        btn.title = 'Remove from favorites';
    } else {
        btn.classList.remove('active');
        icon.classList.remove('fas');
        icon.classList.add('far');
        btn.title = 'Add to favorites';
    }
}

function displayFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-state">No saved words yet. Start searching and save your favorites!</p>';
        return;
    }
    
    favoritesList.innerHTML = '';
    favorites.forEach(word => {
        const tag = document.createElement('div');
        tag.className = 'favorite-tag';
        tag.innerHTML = `
            <span>${word}</span>
            <i class="fas fa-times" data-word="${word}"></i>
        `;
        
        tag.querySelector('span').addEventListener('click', () => {
            wordInput.value = word;
            handleSearch({ preventDefault: () => {} });
        });
        
        tag.querySelector('i').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(word);
        });
        
        favoritesList.appendChild(tag);
    });
}

function removeFavorite(word) {
    const index = favorites.indexOf(word);
    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem('wordly_favorites', JSON.stringify(favorites));
        displayFavorites();
        if (currentWord && currentWord.word === word) {
            updateFavoriteButton();
        }
    }
}

// Theme Management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wordly_theme', theme);
    
    const icon = themeToggle.querySelector('i');
    icon.classList.remove('fa-sun', 'fa-moon');
    icon.classList.add(theme === 'dark' ? 'fa-sun' : 'fa-moon');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('wordly_theme') || 'light';
    setTheme(savedTheme);
}

// Utility Functions
function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function hideResults() {
    resultsSection.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

function handleFetchError(error, word) {
    console.error('Fetch error:', error);
    showError(error.message || `An error occurred while searching for "${word}"`);
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWordData,
        displayResults,
        validateInput: (word) => /^[a-zA-Z\s-]+$/.test(word)
    };
}