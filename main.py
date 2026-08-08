# main.py
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import asyncio
import json
from scraper import MexicoScraper
from db import init_db, get_tweets
from config import ESTADOS_MX

app = FastAPI()
scraper = MexicoScraper()

connections = set()

@app.on_event("startup")
async def startup():
    """Inicializar BD y cuentas"""
    await init_db()
    await scraper.init_accounts()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket para streaming en tiempo real"""
    await websocket.accept()
    connections.add(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            
            if action == "scrape":
                estado = data.get("estado")
                keywords = data.get("keywords", [])
                verified_only = data.get("verified_only", False)
                min_engagement = data.get("min_engagement", 0)
                
                result = await scraper.scrape_estado(
                    estado, keywords, verified_only, min_engagement
                )
                await websocket.send_json({"type": "scrape_result", "data": result})
            
            elif action == "scrape_all":
                keywords = data.get("keywords", [])
                verified_only = data.get("verified_only", False)
                
                results = await scraper.scrape_all_estados(keywords, verified_only)
                await websocket.send_json({"type": "all_results", "data": results})
            
            elif action == "get_cache":
                estado = data.get("estado")
                limit = data.get("limit", 50)
                tweets = await get_tweets(estado, limit=limit)
                await websocket.send_json({"type": "cache", "data": tweets})
    
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        connections.remove(websocket)

@app.get("/estados")
async def list_estados():
    """Listar estados disponibles"""
    return {"estados": list(ESTADOS_MX.keys())}

@app.get("/")
async def root():
    """Servir frontend"""
    return HTMLResponse(open("frontend/index.html").read())

app.mount("/static", StaticFiles(directory="frontend"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)