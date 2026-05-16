import redis.asyncio as redis_async
try:
    from config import settings
except ImportError:
    from ..config import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """
    Service for interacting with Redis cache.
    """
    def __init__(self):
        self.redis_client = None
        if settings.REDIS_URL:
            try:
                self.redis_client = redis_async.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")

    async def get_cached(self, key: str) -> str | None:
        """Get value from cache."""
        if not self.redis_client:
            return None
        try:
            return await self.redis_client.get(key)
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
            return None

    async def set_cached(self, key: str, value: str, ttl_seconds: int = 3600):
        """Set value in cache with TTL."""
        if not self.redis_client:
            return
        try:
            await self.redis_client.set(key, value, ex=ttl_seconds)
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")

    async def delete_cached(self, key: str):
        """Delete value from cache."""
        if not self.redis_client:
            return
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")

    async def check_rate_limit(self, identifier: str, limit: int = 30, window: int = 60) -> bool:
        """
        Check if an identifier (e.g., IP) has exceeded the rate limit.
        Returns True if within limit, False if exceeded.
        """
        if not self.redis_client:
            return True # Fail open if Redis is down
            
        key = f"rate_limit:{identifier}"
        try:
            # Increment the counter for this key
            current_count = await self.redis_client.incr(key)
            
            # If it's the first hit, set the expiration window
            if current_count == 1:
                await self.redis_client.expire(key, window)
                
            return current_count <= limit
        except Exception as e:
            logger.error(f"Rate limit error for {identifier}: {e}")
            return True # Fail open

cache_service = CacheService()
