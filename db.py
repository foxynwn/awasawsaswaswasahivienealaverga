# db.py
import aiosqlite
import json
from datetime import datetime, timedelta

DB_PATH = "tweets.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tweets (
                id TEXT PRIMARY KEY,
                author_id TEXT,
                username TEXT,
                author_verified INTEGER,
                author_location TEXT,
                text TEXT,
                created_at TEXT,
                likes INTEGER,
                retweets INTEGER,
                replies INTEGER,
                estado TEXT,
                keywords TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_estado ON tweets(estado)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_scraped_at ON tweets(scraped_at)
        """)
        await db.commit()

async def save_tweets(tweets, estado, keywords):
    async with aiosqlite.connect(DB_PATH) as db:
        for tweet in tweets:
            try:
                await db.execute("""
                    INSERT OR IGNORE INTO tweets 
                    (id, author_id, username, author_verified, author_location, 
                     text, created_at, likes, retweets, replies, estado, keywords)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(tweet.id),
                    str(tweet.author_id),
                    tweet.author.username,
                    1 if tweet.author.verified else 0,
                    tweet.author.location or "",
                    tweet.rawContent,
                    tweet.createdAt.isoformat() if tweet.createdAt else "",
                    tweet.likeCount or 0,
                    tweet.retweetCount or 0,
                    tweet.replyCount or 0,
                    estado,
                    json.dumps(keywords)
                ))
            except Exception as e:
                print(f"❌ Error saving tweet {tweet.id}: {e}")
        await db.commit()

async def get_tweets(estado=None, verified_only=False, min_engagement=0, limit=100):
    """Get tweets from cache (24h)"""
    async with aiosqlite.connect(DB_PATH) as db:
        query = """
            SELECT * FROM tweets 
            WHERE scraped_at > datetime('now', '-24 hours')
        """
        params = []
        
        if estado:
            query += " AND estado = ?"
            params.append(estado)
        
        if verified_only:
            query += " AND author_verified = 1"
        
        if min_engagement > 0:
            query += " AND (likes + retweets + replies) >= ?"
            params.append(min_engagement)
        
        query += " ORDER BY scraped_at DESC LIMIT ?"
        params.append(limit)
        
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            cols = [desc[0] for desc in cursor.description]
            return [dict(zip(cols, row)) for row in rows]

async def purge_old_tweets():
    """Elimina tweets > 24h"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM tweets WHERE scraped_at < datetime('now', '-24 hours')")
        await db.commit()