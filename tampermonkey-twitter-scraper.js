// ==UserScript==
// @name         Twitter MX Scraper
// @namespace    foxynwn
// @version      2.0
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    const KEYWORDS = ['delito', 'robo', 'homicidio', 'violencia', 'cartel'];
    const VERIFIED_ONLY = false;
    const MIN_ENGAGEMENT = 0;

    const scraped = new Set();

    function getTweetData(el) {
        const text = el.querySelector('[data-testid="tweetText"]')?.innerText || '';
        const author = el.querySelector('[data-testid="User-Name"]')?.innerText || '';
        const likes = parseInt(el.querySelector('[data-testid="like"]')?.innerText) || 0;
        const verified = !!el.querySelector('[data-testid="icon"]');
        return { text, author, likes, verified };
    }

    function matches(tweet) {
        if (VERIFIED_ONLY && !tweet.verified) return false;
        if (tweet.likes < MIN_ENGAGEMENT) return false;
        return KEYWORDS.some(kw => tweet.text.toLowerCase().includes(kw));
    }

    function highlight(el) {
        el.style.backgroundColor = '#fffacd';
        el.style.borderLeft = '4px solid #1da1f2';
    }

    function scan() {
        document.querySelectorAll('[data-testid="Tweet"]').forEach(el => {
            const id = el.getAttribute('data-testid-id') || el.innerText.substring(0, 50);
            if (scraped.has(id)) return;
            
            const tweet = getTweetData(el);
            if (matches(tweet)) {
                scraped.add(id);
                highlight(el);
                console.log(`✓ [${tweet.author}] ${tweet.text.substring(0, 60)}... (${tweet.likes})`);
            }
        });
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
})();