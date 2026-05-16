import httpx
import asyncio
import json

async def test_api():
    async with httpx.AsyncClient() as client:
        # 1. Health check
        print("Testing /health...")
        try:
            r = await client.get("http://127.0.0.1:8000/health")
            print(f"Health Response: {r.status_code} - {r.json()}")
        except Exception as e:
            print(f"Health Check Failed: {e}")

        # 2. Search check
        print("\nTesting /api/funds/search?q=parag...")
        try:
            r = await client.get("http://127.0.0.1:8000/api/funds/search?q=parag&limit=5")
            data = r.json()
            print(f"Search Status: {r.status_code}")
            print(f"Found {data.get('total', 0)} results")
            if data.get('results'):
                first = data['results'][0]
                print(f"Top Result: {first['scheme_name']} ({first['scheme_code']})")
        except Exception as e:
            print(f"Search Failed: {e}")

        # 3. Cache check (second search should be fast)
        print("\nTesting Cache (second search for 'parag')...")
        import time
        start = time.time()
        r = await client.get("http://127.0.0.1:8000/api/funds/search?q=parag&limit=5")
        end = time.time()
        print(f"Cache Response Time: {(end - start) * 1000:.2f}ms")

if __name__ == "__main__":
    asyncio.run(test_api())
