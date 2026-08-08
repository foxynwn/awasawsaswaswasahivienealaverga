# config.py
import os
from dotenv import load_dotenv

load_dotenv()

ESTADOS_MX = {
    "Chiapas": {"lat": 16.2381, "lon": -91.5000, "radius": 80},
    "Jalisco": {"lat": 20.6595, "lon": -103.3494, "radius": 100},
    "CDMX": {"lat": 19.4326, "lon": -99.1332, "radius": 50},
    "Veracruz": {"lat": 19.5018, "lon": -96.1289, "radius": 120},
    "Yucatán": {"lat": 20.5887, "lon": -87.3002, "radius": 100},
    "Guanajuato": {"lat": 21.0161, "lon": -101.2560, "radius": 100},
    "Oaxaca": {"lat": 17.0627, "lon": -96.7235, "radius": 100},
    "Guerrero": {"lat": 17.5507, "lon": -101.5505, "radius": 100},
}

# Extraer credenciales desde .env
ACCOUNTS = []
i = 1
while True:
    user = os.getenv(f"ACCOUNT{i}_USER")
    if not user:
        break
    ACCOUNTS.append({
        "username": user,
        "password": os.getenv(f"ACCOUNT{i}_PASS"),
        "email": user,
    })
    i += 1

if not ACCOUNTS:
    raise ValueError("⚠️  No accounts configured in .env")

print(f"✅ Loaded {len(ACCOUNTS)} accounts")
