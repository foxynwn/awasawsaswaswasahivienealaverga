# scraper.py
import asyncio
import random
import time
from twscrape import API, gather
from config import ACCOUNTS, ESTADOS_MX
from db import save_tweets, purge_old_tweets

class MexicoScraper:
    def __init__(self):
        self.api = API()
        self.current_account_idx = 0
        self.request_count = {}
        self.locked_accounts = set()
        
    async def init_accounts(self):
        """Cargar todas las cuentas"""
        for idx, acc in enumerate(ACCOUNTS):
            try:
                await self.api.pool.add_account(
                    username=acc["username"],
                    password=acc["password"],
                    email=acc["email"],
                    email_password=acc["email_password"]
                )
                print(f"✅ Account {idx+1} loaded")
                self.request_count[idx] = 0
            except Exception as e:
                print(f"❌ Account {idx+1} failed: {e}")
    
    async def _rotate_account(self):
        """Selecciona siguiente cuenta disponible con jitter"""
        await asyncio.sleep(random.uniform(3, 8))
        
        available = [
            i for i in range(len(ACCOUNTS))
            if i not in self.locked_accounts
        ]
        
        if not available:
            print("⚠️  Todas las cuentas están bloqueadas. Esperando 60s...")
            await asyncio.sleep(60)
            self.locked_accounts.clear()
            available = list(range(len(ACCOUNTS)))
        
        for acc_idx in available:
            if self.request_count.get(acc_idx, 0) < 30:
                self.current_account_idx = acc_idx
                self.request_count[acc_idx] += 1
                return
        
        self.request_count = {i: 0 for i in range(len(ACCOUNTS))}
        self.current_account_idx = random.choice(available)
        self.request_count[self.current_account_idx] = 1
    
    async def scrape_estado(self, estado, keywords=None, verified_only=False, min_engagement=0):
        """
        Scrape tweets de un estado específico
        
        Args:
            estado: Nombre del estado (key en ESTADOS_MX)
            keywords: Lista de palabras clave a filtrar
            verified_only: Solo usuarios verificados
            min_engagement: Mínimo de likes+retweets+replies
        """
        if estado not in ESTADOS_MX:
            return {"error": f"Estado no válido. Opciones: {list(ESTADOS_MX.keys())}"}
        
        coords = ESTADOS_MX[estado]
        
        query = f"geocode:{coords['lat']},{coords['lon']},{coords['radius']}km lang:es -is:retweet"
        
        if verified_only:
            query += " is:verified"
        
        if keywords:
            keyword_str = " OR ".join(keywords)
            query = f"({keyword_str}) {query}"
        
        print(f"🔍 Scraping {estado}: {query}")
        
        try:
            await self._rotate_account()
            
            tweets = await gather(
                self.api.search(query, limit=200)
            )
            
            if min_engagement > 0:
                tweets = [
                    t for t in tweets 
                    if (t.likeCount or 0) + (t.retweetCount or 0) + (t.replyCount or 0) >= min_engagement
                ]
            
            await save_tweets(tweets, estado, keywords or [])
            
            print(f"✅ {len(tweets)} tweets guardados de {estado}")
            return {
                "estado": estado,
                "count": len(tweets),
                "tweets": [
                    {
                        "username": t.author.username,
                        "verified": t.author.verified,
                        "location": t.author.location,
                        "text": t.rawContent[:150],
                        "likes": t.likeCount or 0,
                        "retweets": t.retweetCount or 0,
                        "engagement": (t.likeCount or 0) + (t.retweetCount or 0) + (t.replyCount or 0)
                    }
                    for t in tweets[:20]
                ]
            }
        
        except Exception as e:
            print(f"❌ Error scraping {estado}: {e}")
            if "403" in str(e) or "429" in str(e):
                self.locked_accounts.add(self.current_account_idx)
            return {"error": str(e), "estado": estado}
    
    async def scrape_all_estados(self, keywords=None, verified_only=False):
        """Scrape todos los estados en paralelo"""
        tasks = [
            self.scrape_estado(estado, keywords, verified_only)
            for estado in ESTADOS_MX.keys()
        ]
        results = await asyncio.gather(*tasks)
        await purge_old_tweets()
        return results