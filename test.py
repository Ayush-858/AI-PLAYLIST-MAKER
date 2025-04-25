import requests

API_URL = "https://api-inference.huggingface.co/models/facebook/musicgen-small"
headers = {
    "Authorization": "Bearer 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"
}

def generate_music(prompt):
    payload = {
        "inputs": prompt,
        "parameters": {
            "duration": 20  # seconds
        }
    }
    response = requests.post(API_URL, headers=headers, json=payload)
    
    # Show error content if it fails
    if response.status_code == 200:
        with open("generated_music.wav", "wb") as f:
            f.write(response.content)
        print("✅ Music saved as generated_music.wav")
    else:
        print("❌ Error:", response.status_code)
        print(response.text)  # shows the actual HTML or error JSON

# Run it
generate_music("chill lo-fi beat with piano and soft drums")
