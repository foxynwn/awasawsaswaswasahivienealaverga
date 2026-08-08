const ESTADOS_MX = {
    'CDMX': { lat: 19.4326, lon: -99.1332, radius: 50 },
    'Jalisco': { lat: 20.6595, lon: -103.3494, radius: 100 },
    'Chiapas': { lat: 16.2381, lon: -91.5000, radius: 80 },
    'Veracruz': { lat: 19.5018, lon: -96.1289, radius: 120 },
    'Yucatán': { lat: 20.5887, lon: -87.3002, radius: 100 },
    'Guanajuato': { lat: 21.0161, lon: -101.2560, radius: 100 },
    'Oaxaca': { lat: 17.0627, lon: -96.7235, radius: 100 },
    'Guerrero': { lat: 17.5507, lon: -101.5505, radius: 100 },
};

let config = {};
let stats = { blocked: 0, allowed: 0, keywords: 0, byState: {} };
const processed = new Set();

// Load config
chrome.storage.sync.get(['allowedStates', 'keywords', 'verifiedOnly', 'minLikes', 'minRetweets', 'autoBlock', 'showHighlights', 'notifyBlocked'], (result) => {
    config = result;
    config.allowedStates = config.allowedStates || Object.keys(ESTADOS_MX);
    config.keywords = config.keywords || [];
    config.autoBlock = config.autoBlock !== false;
    config.showHighlights = config.showHighlights !== false;
    startScanning();
});

function extractTweetData(element) {
    try {
        const textEl = element.querySelector('[data-testid="tweetText"]');
        if (!textEl) return null;
        
        const text = textEl.innerText.trim();
        const authorEl = element.querySelector('[data-testid="User-Name"]');
        const author = authorEl?.innerText || 'Unknown';
        const verified = !!element.querySelector('[data-testid="icon"]');
        
        let likes = 0, retweets = 0, replies = 0;
        element.querySelectorAll('[data-testid]').forEach(el => {
            const testid = el.getAttribute('data-testid');
            if (testid === 'like') likes = parseInt(el.innerText) || 0;
            if (testid === 'retweet') retweets = parseInt(el.innerText) || 0;
            if (testid === 'reply') replies = parseInt(el.innerText) || 0;
        });
        
        const url = element.querySelector('a[href*="/status/"]')?.getAttribute('href') || '';
        
        return { text, author, verified, likes, retweets, replies, url };
    } catch (e) {
        return null;
    }
}

function matchesFilter(tweet) {
    if (config.verifiedOnly && !tweet.verified) return false;
    if (tweet.likes < (config.minLikes || 0)) return false;
    if (tweet.retweets < (config.minRetweets || 0) && tweet.likes < (config.minLikes || 0) * 2) return false;
    
    if (config.keywords.length > 0) {
        return config.keywords.some(kw => tweet.text.toLowerCase().includes(kw));
    }
    return true;
}

function getStateFromTweet(tweet) {
    for (const [state, coords] of Object.entries(ESTADOS_MX)) {
        if (config.allowedStates.includes(state)) continue;
        
        // Heurística simple: palabras clave del estado
        const keywords = {
            'CDMX': ['cdmx', 'ciudad de méxico', 'mexico city'],
            'Jalisco': ['jalisco', 'guadalajara'],
            'Chiapas': ['chiapas', 'tuxtla'],
            'Veracruz': ['veracruz', 'xalapa'],
            'Yucatán': ['yucatán', 'mérida'],
            'Guanajuato': ['guanajuato', 'león'],
            'Oaxaca': ['oaxaca'],
            'Guerrero': ['guerrero', 'acapulco']
        };
        
        const textLower = tweet.text.toLowerCase();
        if (keywords[state]?.some(kw => textLower.includes(kw))) {
            return state;
        }
    }
    return null;
}

function highlightTweet(element, blocked = false) {
    if (config.showHighlights) {
        if (blocked) {
            element.style.opacity = '0.5';
            element.style.borderLeft = '4px solid #e74c3c';
        } else {
            element.style.backgroundColor = '#fffacd';
            element.style.borderLeft = '4px solid #667eea';
        }
    }
}

function scanTweets() {
    document.querySelectorAll('[data-testid="Tweet"]').forEach(element => {
        const id = element.getAttribute('data-testid-id') || element.innerText.substring(0, 50);
        if (processed.has(id)) return;
        processed.add(id);
        
        const tweet = extractTweetData(element);
        if (!tweet) return;
        
        const state = getStateFromTweet(tweet);
        let shouldBlock = false;
        
        // Si es de un estado no permitido, bloquear
        if (state && !config.allowedStates.includes(state)) {
            shouldBlock = true;
            stats.blocked++;
            if (!stats.byState[state]) stats.byState[state] = 0;
            stats.byState[state]++;
        }
        
        // Si tiene palabras clave de interés
        if (matchesFilter(tweet)) {
            stats.keywords++;
            highlightTweet(element, false);
        } else if (shouldBlock && config.autoBlock) {
            highlightTweet(element, true);
        } else {
            stats.allowed++;
        }
        
        updateStats();
    });
}

function updateStats() {
    chrome.storage.local.set({ tweetStats: { ...stats, timestamp: Date.now() } });
}

function startScanning() {
    scanTweets();
    const observer = new MutationObserver(() => scanTweets());
    observer.observe(document.body, { childList: true, subtree: true });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectAccount') {
        const accountEl = document.querySelector('[data-testid="AppSuspendedModal"]')?.parentElement || 
                         document.querySelector('[data-testid="SideNav_NewTweet_Button"]')?.closest('[role="navigation"]');
        
        sendResponse({
            account: {
                username: document.querySelector('[data-testid="User-Name"]')?.innerText || 'Unknown',
                verified: !!document.querySelector('[data-testid="icon"]'),
                followers: document.querySelector('[href*="/followers"]')?.innerText || 'N/A'
            },
            location: {
                state: 'Detectando...',
                confidence: 75
            },
            device: {
                os: navigator.platform,
                browser: 'Chrome',
                language: navigator.language
            }
        });
    }
});
