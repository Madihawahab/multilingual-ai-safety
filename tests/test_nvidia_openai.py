from openai import OpenAI

API_KEY = "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"

client = OpenAI(
    api_key=API_KEY,
    base_url="https://integrate.api.nvidia.com/v1"
)

response = client.chat.completions.create(
    model="meta/llama-3.3-70b-instruct",
    messages=[
        {
            "role": "user",
            "content": "What is 2+2?"
        }
    ],
    max_tokens=50
)

print(response.choices[0].message.content)