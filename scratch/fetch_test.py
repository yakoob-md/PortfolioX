import httpx
import json

def test_fetch():
    # HDFC Balanced Advantage Fund Direct Growth is 120828
    url = "https://api.mfapi.in/mf/120828"
    response = httpx.get(url)
    if response.status_code == 200:
        data = response.json()
        print("KEYS in response:", data.keys())
        print("\nMETA info:")
        print(json.dumps(data.get("meta", {}), indent=2))
        print("\nFirst 3 data points (NAV):")
        print(json.dumps(data.get("data", [])[:3], indent=2))
    else:
        print(f"Failed to fetch: {response.status_code}")

if __name__ == "__main__":
    test_fetch()
