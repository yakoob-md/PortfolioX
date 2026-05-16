import asyncio
import logging
import sys
import os
from sqlalchemy import text
from redis.asyncio import from_url

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import settings
from db.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_connections")

async def test_db():
    logger.info("Testing Database connection...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful!")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

async def test_redis():
    logger.info("Testing Redis connection...")
    if not settings.REDIS_URL:
        logger.error("❌ REDIS_URL not set")
        return False
    try:
        redis_client = from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await redis_client.ping()
        logger.info("✅ Redis connection successful!")
        await redis_client.close()
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False

async def main():
    db_ok = await test_db()
    redis_ok = await test_redis()
    
    if db_ok and redis_ok:
        logger.info("\n🎉 All systems operational!")
    else:
        logger.info("\n⚠️ Some systems failed. Please check your .env file.")

if __name__ == "__main__":
    asyncio.run(main())
