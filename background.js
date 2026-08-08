// Background service worker

chrome.runtime.onInstalled.addListener(() => {
    // Initialize default settings
    chrome.storage.sync.get(['allowedStates'], (result) => {
        if (!result.allowedStates) {
            chrome.storage.sync.set({
                allowedStates: ['CDMX', 'Jalisco'],
                keywords: [],
                verifiedOnly: false,
                minLikes: 0,
                minRetweets: 0,
                autoBlock: true,
                showHighlights: true,
                notifyBlocked: false,
                retention: 24
            });
        }
    });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && (tab.url?.includes('twitter.com') || tab.url?.includes('x.com'))) {
        // Content script is injected, ready to scan
    }
});

// Cleanup old data
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        chrome.storage.sync.get(['retention'], (result) => {
            const hours = result.retention || 24;
            const cutoff = Date.now() - (hours * 3600000);
            
            chrome.storage.local.get(['tweetStats'], (data) => {
                const stats = data.tweetStats || {};
                if (stats.timestamp && stats.timestamp < cutoff) {
                    chrome.storage.local.set({ tweetStats: {} });
                }
            });
        });
    }
});
