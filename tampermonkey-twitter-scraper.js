// ==UserScript==
// @name         Twitter MX Scraper Pro
// @namespace    foxynwn
// @version      3.0
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ======================== CONFIG ========================
    const CONFIG = {
        keywords: ['delito', 'robo', 'homicidio', 'violencia', 'cartel', 'narco', 'sicario'],
        excludeKeywords: ['meme', 'chiste', 'jaja'],
        verifiedOnly: false,
        minLikes: 5,
        minRetweets: 2,
        minReplies: 1,
        detectLanguage: true,
        autoExport: true,
        retentionHours: 24
    };

    // ======================== STORAGE ========================
    class Storage {
        static getTweets() {
            const data = GM_getValue('tweets_data', '[]');
            return JSON.parse(data);
        }

        static addTweet(tweet) {
            const tweets = this.getTweets();
            tweets.unshift(tweet);
            if (tweets.length > 500) tweets.pop();
            GM_setValue('tweets_data', JSON.stringify(tweets));
        }

        static clearOld() {
            const tweets = this.getTweets();
            const cutoff = Date.now() - (CONFIG.retentionHours * 3600000);
            const filtered = tweets.filter(t => t.timestamp > cutoff);
            GM_setValue('tweets_data', JSON.stringify(filtered));
        }

        static exportJSON() {
            return JSON.stringify(this.getTweets(), null, 2);
        }

        static exportCSV() {
            const tweets = this.getTweets();
            const headers = ['Author', 'Text', 'Likes', 'Retweets', 'Replies', 'URL', 'Timestamp'];
            const rows = tweets.map(t => [
                t.author,
                `"${t.text.replace(/"/g, '""')}"`,
                t.likes,
                t.retweets,
                t.replies,
                t.url,
                new Date(t.timestamp).toISOString()
            ]);
            return [headers, ...rows].map(r => r.join(',')).join('\n');
        }
    }

    // ======================== TWEET DETECTOR ========================
    class TweetDetector {
        static extract(element) {
            try {
                const textEl = element.querySelector('[data-testid="tweetText"]');
                if (!textEl) return null;

                const text = textEl.innerText.trim();
                const authorEl = element.querySelector('[data-testid="User-Name"]');
                const author = authorEl?.innerText || 'Unknown';
                
                const verified = !!element.querySelector('[data-testid="icon"]');
                
                const stats = this.getEngagementStats(element);
                const url = this.getURL(element);
                const timestamp = Date.now();

                return { text, author, verified, timestamp, url, ...stats };
            } catch (e) {
                return null;
            }
        }

        static getEngagementStats(element) {
            const stats = { likes: 0, retweets: 0, replies: 0 };
            
            element.querySelectorAll('[data-testid]').forEach(el => {
                const testid = el.getAttribute('data-testid');
                if (testid === 'like') stats.likes = parseInt(el.innerText) || 0;
                if (testid === 'retweet') stats.retweets = parseInt(el.innerText) || 0;
                if (testid === 'reply') stats.replies = parseInt(el.innerText) || 0;
            });

            return stats;
        }

        static getURL(element) {
            const link = element.querySelector('a[href*="/status/"]');
            return link ? `https://twitter.com${link.getAttribute('href')}` : '';
        }
    }

    // ======================== FILTERS ========================
    class Filter {
        static match(tweet) {
            // Verificación
            if (CONFIG.verifiedOnly && !tweet.verified) return false;

            // Engagement mínimo
            const totalEngagement = tweet.likes + tweet.retweets + tweet.replies;
            if (tweet.likes < CONFIG.minLikes) return false;
            if (tweet.retweets < CONFIG.minRetweets && tweet.likes < CONFIG.minLikes * 2) return false;

            // Keywords obligatorias
            const textLower = tweet.text.toLowerCase();
            const hasKeyword = CONFIG.keywords.some(kw => textLower.includes(kw));
            if (!hasKeyword) return false;

            // Exclusiones
            if (CONFIG.excludeKeywords.some(ex => textLower.includes(ex))) return false;

            return true;
        }

        static score(tweet) {
            return (tweet.likes * 1) + (tweet.retweets * 1.5) + (tweet.replies * 0.5);
        }
    }

    // ======================== UI ========================
    class UI {
        static createPanel() {
            GM_addStyle(`
                #scraper-panel {
                    position: fixed;
                    right: 20px;
                    top: 60px;
                    width: 340px;
                    background: white;
                    border: 2px solid #1da1f2;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    z-index: 10000;
                    font-family: system-ui, -apple-system, sans-serif;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                #scraper-panel h2 {
                    margin: 0 0 12px 0;
                    color: #1da1f2;
                    font-size: 16px;
                    font-weight: 700;
                }

                .scraper-section {
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #e1e8ed;
                }

                .scraper-stat {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin: 4px 0;
                    color: #333;
                }

                .scraper-stat strong {
                    color: #1da1f2;
                }

                .scraper-btn {
                    width: 100%;
                    padding: 8px;
                    margin: 4px 0;
                    background: #1da1f2;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .scraper-btn:hover {
                    background: #1a91da;
                }

                .scraper-btn.danger {
                    background: #e74c3c;
                }

                .scraper-btn.danger:hover {
                    background: #c0392b;
                }

                .tweet-item {
                    background: #f7f9fa;
                    border-left: 3px solid #1da1f2;
                    padding: 8px;
                    margin: 6px 0;
                    border-radius: 4px;
                    font-size: 11px;
                }

                .tweet-item strong {
                    color: #0f1419;
                    display: block;
                    margin-bottom: 4px;
                }

                .tweet-item p {
                    margin: 0 0 4px 0;
                    color: #536471;
                    line-height: 1.3;
                }

                .tweet-stats {
                    display: flex;
                    gap: 8px;
                    font-size: 10px;
                    color: #0f1419;
                }

                .scraper-badge {
                    display: inline-block;
                    background: #fffacd;
                    border-left: 4px solid #1da1f2;
                    padding: 2px 6px;
                    border-radius: 2px;
                    font-size: 10px;
                    font-weight: 600;
                    color: #1da1f2;
                }
            `);

            const panel = document.createElement('div');
            panel.id = 'scraper-panel';
            panel.innerHTML = `
                <h2>🔍 Twitter MX Scraper</h2>
                
                <div class="scraper-section">
                    <div class="scraper-stat">
                        <span>Tweets encontrados:</span>
                        <strong id="count-total">0</strong>
                    </div>
                    <div class="scraper-stat">
                        <span>Sesión actual:</span>
                        <strong id="count-session">0</strong>
                    </div>
                    <div class="scraper-stat">
                        <span>Score promedio:</span>
                        <strong id="avg-score">0</strong>
                    </div>
                    <div class="scraper-stat">
                        <span>Estado:</span>
                        <strong id="status-text" style="color: #27ae60;">Activo</strong>
                    </div>
                </div>

                <div class="scraper-section">
                    <label style="font-size: 12px; font-weight: 600; color: #333;">
                        <input type="checkbox" id="verified-check"> Solo verificados
                    </label>
                    <div style="margin-top: 8px;">
                        <input type="number" id="min-likes" value="5" placeholder="Min likes" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; margin-bottom: 4px; box-sizing: border-box;">
                        <input type="number" id="min-retweets" value="2" placeholder="Min retweets" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
                    </div>
                </div>

                <div class="scraper-section" id="recent-tweets" style="max-height: 250px; overflow-y: auto;">
                </div>

                <button class="scraper-btn" id="export-json">📥 Exportar JSON</button>
                <button class="scraper-btn" id="export-csv">📋 Exportar CSV</button>
                <button class="scraper-btn danger" id="clear-btn">🗑️ Limpiar datos</button>
            `;

            document.body.appendChild(panel);
            this.attachEvents();
            this.updateDisplay();
        }

        static attachEvents() {
            document.getElementById('export-json').addEventListener('click', () => {
                const data = Storage.exportJSON();
                this.download(data, 'tweets.json', 'application/json');
            });

            document.getElementById('export-csv').addEventListener('click', () => {
                const data = Storage.exportCSV();
                this.download(data, 'tweets.csv', 'text/csv');
            });

            document.getElementById('clear-btn').addEventListener('click', () => {
                if (confirm('¿Eliminar todos los tweets?')) {
                    GM_setValue('tweets_data', '[]');
                    this.updateDisplay();
                }
            });

            document.getElementById('verified-check').addEventListener('change', (e) => {
                CONFIG.verifiedOnly = e.target.checked;
            });

            document.getElementById('min-likes').addEventListener('change', (e) => {
                CONFIG.minLikes = parseInt(e.target.value) || 0;
            });

            document.getElementById('min-retweets').addEventListener('change', (e) => {
                CONFIG.minRetweets = parseInt(e.target.value) || 0;
            });
        }

        static updateDisplay() {
            const tweets = Storage.getTweets();
            const total = tweets.length;
            const avg = total > 0 ? Math.round(tweets.reduce((a, t) => a + Filter.score(t), 0) / total) : 0;

            document.getElementById('count-total').textContent = total;
            document.getElementById('avg-score').textContent = avg;

            const container = document.getElementById('recent-tweets');
            container.innerHTML = tweets.slice(0, 8).map(t => `
                <div class="tweet-item">
                    <strong>${t.author} ${t.verified ? '✓' : ''}</strong>
                    <p>${t.text.substring(0, 80)}${t.text.length > 80 ? '...' : ''}</p>
                    <div class="tweet-stats">
                        <span>❤️ ${t.likes}</span>
                        <span>🔄 ${t.retweets}</span>
                        <span>💬 ${t.replies}</span>
                    </div>
                </div>
            `).join('');
        }

        static download(data, filename, type) {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        static highlightTweet(element) {
            element.style.backgroundColor = '#fffacd';
            element.style.borderLeft = '4px solid #1da1f2';
        }
    }

    // ======================== SCRAPER ENGINE ========================
    class Scraper {
        constructor() {
            this.scraped = new Set();
            this.sessionCount = 0;
        }

        scan() {
            document.querySelectorAll('[data-testid="Tweet"]').forEach(el => {
                const id = this.getTweetId(el);
                if (this.scraped.has(id)) return;

                const tweet = TweetDetector.extract(el);
                if (!tweet) return;

                if (Filter.match(tweet)) {
                    this.scraped.add(id);
                    this.sessionCount++;
                    Storage.addTweet(tweet);
                    UI.highlightTweet(el);
                    UI.updateDisplay();
                    
                    const score = Filter.score(tweet);
                    console.log(`✓ [${tweet.author}] ${tweet.text.substring(0, 50)}... | Score: ${score}`);
                }
            });
        }

        getTweetId(element) {
            const link = element.querySelector('a[href*="/status/"]');
            return link ? link.getAttribute('href') : element.innerText.substring(0, 50);
        }

        start() {
            this.scan();
            const observer = new MutationObserver(() => this.scan());
            observer.observe(document.body, { childList: true, subtree: true });
            
            setInterval(() => Storage.clearOld(), 3600000);
        }
    }

    // ======================== INIT ========================
    UI.createPanel();
    const scraper = new Scraper();
    scraper.start();
})();