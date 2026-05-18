from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os
from contextlib import asynccontextmanager

# Add current directory to path for local imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import settings
from db.database import engine
from routers import funds, portfolio, tax, ai
from models.schemas import HealthResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown logic.
    """
    # Startup: Check DB connection
    logger.info("Checking database connection...")
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    # Initialize Scheduler for background jobs
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from services.amfi_sync import AMFISyncService
    from db.database import AsyncSessionLocal
    
    scheduler = AsyncIOScheduler()
    
    async def scheduled_sync():
        logger.info("Running scheduled AMFI sync...")
        async with AsyncSessionLocal() as session:
            service = AMFISyncService(session)
            await service.sync_scheme_master()
            await session.commit()
            
    # Schedule sync every day at 3 AM
    scheduler.add_job(scheduled_sync, 'cron', hour=3)
    scheduler.start()
    logger.info("Background scheduler started")
    
    yield
    
    # Shutdown: Dispose engine
    scheduler.shutdown()
    await engine.dispose()
    logger.info("Database connection closed")

app = FastAPI(
    title="PortfolioX API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.CORS_ORIGINS:
    for o in settings.CORS_ORIGINS.split(","):
        o_clean = o.strip()
        if o_clean and o_clean not in origins:
            origins.append(o_clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal_server_error", "detail": str(exc) if settings.ENVIRONMENT == "development" else "An unexpected error occurred"}
    )

# Routers
app.include_router(funds.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(tax.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    db_status = "connected"
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
        
    return {
        "status": "ok",
        "version": "0.1.0",
        "db": db_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
