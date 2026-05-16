import httpx
import asyncio
import json

async def test_analysis():
    url = "http://127.0.0.1:8000/api/portfolio/analyze"
    
    # Test with Parag Parikh and HDFC Flexi Cap
    payload = {
        "funds": [
            {"scheme_code": "122639", "units": 100}, # Parag Parikh
            {"scheme_code": "118955", "units": 100}  # HDFC Flexi Cap
        ]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"Sending request to {url}...")
        response = await client.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print("\nAnalysis Success!")
            print(f"Session ID: {result['session_id']}")
            print(f"Health Score: {result['health_score']}/100")
            print(f"Total Value: {result['total_value']}")
            print("\nRed Flags:")
            for flag in result['red_flags']:
                print(f"- {flag}")
            
            print("\nTop Stock Concentration:")
            for stock in result['top_stock_concentrations'][:3]:
                print(f"- {stock['stock_name']}: {stock['exposure']}%")
                
            print("\nAI Explanation:")
            print(result['health_explanation'])
        else:
            print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_analysis())
