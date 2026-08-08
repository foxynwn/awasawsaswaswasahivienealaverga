// ==UserScript==
// @name         Twitter Mexico Scraper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Scrape and filter tweets by location, keywords, and engagement
// @author       foxynwn
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const ESTADOS_MX = {
        "Chiapas": {"lat": 16.2381, "lon": -91.5000},
        "Jalisco": {"lat": 20.6595, "lon": -103.3494},
        "CDMX": {"lat": 19.4326, "lon": -99.1332},
        "Veracruz": {"lat": 19.5018, "lon": -96.1289},
        "Yucatán": {"lat": 20.5887, "lon": -87.3002},
        "Guanajuato": {"lat": 21.0161, "lon": -101.2560},
        "Oaxaca": {"lat": 17.0627, "lon": -96.7235},
        "Guerrero": {"lat": 17.5507, "lon": -101.5505},
    };

    // Inicializar configuración
    function initConfig() {
        if (!GM_getValue('config')) {
            GM_setValue('config', {
                keywords: [],
                verifiedOnly: false,
                minEngagement: 0,
                estado: 'CDMX',
                active: true,
                tweets: []
            });
        }
    }

    // Crear panel de control
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'twitter-scraper-panel';
        panel.innerHTML = `
            <div style="position: fixed; right: 20px; top: 20px; width: 320px; background: #fff; border: 2px solid #1da1f2; border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                <h3 style="margin: 0 0 12px 0; color: #1da1f2; font-size: 14px; font-weight: bold;">🔍 Twitter Scraper MX</h3>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Estado:</label>
                    <select id="estado-select" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
                        ${Object.keys(ESTADOS_MX).map(e => `<option value="${e}">${e}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Keywords (separadas por coma):</label>
                    <input type="text" id="keywords-input" placeholder="ej: delito, robo" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Min. Engagement:</label>
                    <input type="number" id="engagement-input" value="0" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; font-size: 12px;">
                        <input type="checkbox" id="verified-only" style="margin-right: 6px;">
                        <span>Solo verificados</span>
                    </label>
                </div>

                <button id="scrape-btn" style="width: 100%; padding: 8px; background: #1da1f2; color: white; border: none; border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer; transition: background 0.2s;">Activar Scraper</button>
                
                <div id="results-container" style="margin-top: 12px; max-height: 300px; overflow-y: auto; border: 1px solid #e1e8ed; border-radius: 4px; padding: 8px;">
                    <p style="font-size: 11px; color: #666; margin: 0;">Tweets encontrados: <strong id="count">0</strong></p>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        attachPanelEvents();
    }

    // Eventos del panel
    function attachPanelEvents() {
        const scrapeBtn = document.getElementById('scrape-btn');
        const estadoSelect = document.getElementById('estado-select');
        const keywordsInput = document.getElementById('keywords-input');
        const engagementInput = document.getElementById('engagement-input');
        const verifiedOnly = document.getElementById('verified-only');

        scrapeBtn.addEventListener('click', () => {
            const config = {
                keywords: keywordsInput.value.split(',').map(k => k.trim().toLowerCase()).filter(k => k),
                verifiedOnly: verifiedOnly.checked,
                minEngagement: parseInt(engagementInput.value) || 0,
                estado: estadoSelect.value,
                active: true
            };

            GM_setValue('config', config);
            scrapeBtn.textContent = '⏸ Scraper Activo';
            scrapeBtn.style.background = '#e74c3c';
            startScrapingTweets();
        });
    }

    // Extraer datos de un tweet
    function extractTweetData(tweetElement) {
        try {
            const textEl = tweetElement.querySelector('[data-testid="tweet"]');
            if (!textEl) return null;

            const text = textEl.innerText || '';
            const authorEl = tweetElement.querySelector('[data-testid="User-Name"]');
            const author = authorEl ? authorEl.innerText : 'Unknown';
            
            const verifiedEl = tweetElement.querySelector('[data-testid="icon"]');
            const isVerified = verifiedEl && verifiedEl.innerHTML.includes('verified');

            const engagementEl = tweetElement.querySelector('[data-testid="like"]');
            let engagement = 0;
            if (engagementEl) {
                const engText = engagementEl.innerText;
                engagement = parseInt(engText) || 0;
            }

            return {
                text,
                author,
                isVerified,
                engagement,
                timestamp: new Date().toLocaleString()
            };
        } catch (e) {
            return null;
        }
    }

    // Filtrar tweets según criterios
    function filterTweet(tweetData, config) {
        if (!tweetData) return false;

        // Filtro de verificación
        if (config.verifiedOnly && !tweetData.isVerified) return false;

        // Filtro de engagement
        if (tweetData.engagement < config.minEngagement) return false;

        // Filtro de keywords
        if (config.keywords.length > 0) {
            const textLower = tweetData.text.toLowerCase();
            return config.keywords.some(kw => textLower.includes(kw));
        }

        return true;
    }

    // Scraper principal
    function startScrapingTweets() {
        const config = GM_getValue('config');
        const scrapedTweets = new Set();

        const observer = new MutationObserver(() => {
            const tweets = document.querySelectorAll('[data-testid="tweet"]');

            tweets.forEach(tweet => {
                const tweetId = tweet.closest('[data-testid="Tweet"]')?.getAttribute('data-testid') || tweet.innerText;
                
                if (scrapedTweets.has(tweetId)) return;

                const tweetElement = tweet.closest('[data-testid="Tweet"]') || tweet;
                const tweetData = extractTweetData(tweetElement);

                if (tweetData && filterTweet(tweetData, config)) {
                    scrapedTweets.add(tweetId);
                    
                    const tweets = GM_getValue('config').tweets || [];
                    tweets.unshift(tweetData);
                    if (tweets.length > 100) tweets.pop();

                    const newConfig = GM_getValue('config');
                    newConfig.tweets = tweets;
                    GM_setValue('config', newConfig);

                    updateResultsDisplay(tweets);
                    highlightTweet(tweetElement);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false
        });
    }

    // Destacar tweets encontrados
    function highlightTweet(element) {
        element.style.backgroundColor = '#fffacd';
        element.style.borderLeft = '4px solid #1da1f2';
        element.style.paddingLeft = '12px';
    }

    // Actualizar display de resultados
    function updateResultsDisplay(tweets) {
        const container = document.getElementById('results-container');
        const count = document.getElementById('count');

        count.textContent = tweets.length;

        container.innerHTML = `<p style="font-size: 11px; color: #666; margin: 0 0 8px 0;">Tweets encontrados: <strong>${tweets.length}</strong></p>`;

        tweets.slice(0, 5).forEach(tweet => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 6px; border-bottom: 1px solid #e1e8ed; font-size: 11px; color: #333;';
            div.innerHTML = `
                <strong>${tweet.author}</strong> ${tweet.isVerified ? '✓' : ''}<br>
                <span style="color: #666;">${tweet.text.substring(0, 50)}...</span><br>
                <span style="color: #1da1f2;">❤️ ${tweet.engagement}</span>
            `;
            container.appendChild(div);
        });
    }

    // Inicializar
    initConfig();
    createControlPanel();

})();