import requests
import json

# Replace with YOUR actual Nvidia API key
API_KEY = "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"
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

print("Testing Nvidia NIM API...")
print(f"API Key: {API_KEY[:20]}...")
print("=" * 60)

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
}

payload = {
    "model": "nvidia/llama-3.3-nomotron-super-49b-v1.5",
    "messages": [
        {"role": "user", "content": "What is 2+2?"}
    ],
    "max_tokens": 100,
    "temperature": 0.7
}

print(f"Sending request to: {API_URL}")
print(f"Model: {payload['model']}")
print("=" * 60)


try:
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        answer = data["choices"][0]["message"]["content"]
        print(f"✅ SUCCESS!")
        print(f"Response: {answer}")
    else:
        print(f"❌ Error {response.status_code}")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"❌ Exception: {e}")