# Mexico States Scraper

**Real-time Twitter/X scraper with geolocation filtering for Mexican states**

## Features

✅ Multi-account pool rotation (anti-ban protection)  
✅ Geolocation filtering by Mexican states  
✅ Advanced filters: keywords, verified users, engagement thresholds  
✅ Real-time WebSocket interface  
✅ 24h cache with SQLite  
✅ Dark mode web UI  
✅ No export overhead (streaming only)  

## Setup

### 1. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Accounts

```bash
cp .env.example .env
```

Edit `.env` with your Twitter/X credentials (minimum 5-10 accounts):

```env
ACCOUNT1_USER=your_email@gmail.com
ACCOUNT1_PASS=your_password
ACCOUNT1_EMAIL_RECOVERY=recovery_email@gmail.com
ACCOUNT1_EMAIL_PASS=recovery_password
```

### 3. Run

```bash
python main.py
```

Open browser: `http://localhost:8000`

## Usage

1. **Select State**: Choose from 8 Mexican states (Chiapas, Jalisco, CDMX, etc.)
2. **Filter Options**:
   - Keywords: Comma-separated search terms
   - Verified Only: Toggle to show only verified accounts
   - Engagement Min: Minimum likes + retweets + replies
3. **Scrape**: Click "Scrape Estado" for single state or "Scrape Todos" for all
4. **View Cache**: Show tweets from last 24 hours

## Architecture

- **Backend**: FastAPI + twscrape + SQLite
- **Frontend**: Vanilla JS + WebSocket
- **Database**: 24h in-memory cache with SQLite persistence
- **Anti-Ban**: Account rotation, randomized delays, intelligent backoff

## States Included

- Chiapas (16.24°N, 91.50°W)
- Jalisco (20.66°N, 103.35°W)
- CDMX (19.43°N, 99.13°W)
- Veracruz (19.50°N, 96.13°W)
- Yucatán (20.59°N, 87.30°W)
- Guanajuato (21.02°N, 101.26°W)
- Oaxaca (17.06°N, 96.72°W)
- Guerrero (17.55°N, 101.55°W)

## Legal Notice

Twitter/X Terms of Service: Scraping without official API may violate ToS. Use at your own risk for ethical, legal purposes only.

## License

MIT