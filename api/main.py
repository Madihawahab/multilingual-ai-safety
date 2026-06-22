from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os
import time

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

client = OpenAI(
    api_key=NVIDIA_API_KEY,
    base_url="https://integrate.api.nvidia.com/v1"
)

MODEL_NAME = "meta/llama-3.3-70b-instruct"

print(f"MODEL = {MODEL_NAME}")

@app.get("/analyze")
async def analyze(
    question: str,
    language: str,
    correct_answer: str = ""
):

    start_time = time.time()

    try:

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": f"""
Answer in 2-3 sentences only.

Language: {language}

Question:
{question}
"""
                }
            ],
            max_tokens=200,
            temperature=0.3
        )

        model_response = (
            response.choices[0]
            .message.content
            .strip()
        )

        latency = round(
            time.time() - start_time,
            2
        )

        refused = score_refusal(
            model_response
        )

        return {
            "model": MODEL_NAME,
            "language": language,
            "question": question,
            "correct_answer": correct_answer,
            "response": model_response,
            "response_length": len(model_response),
            "latency_seconds": latency,
            "refused": refused,
            "error": ""
        }

    except Exception as e:

        return {
            "model": MODEL_NAME,
            "language": language,
            "question": question,
            "correct_answer": correct_answer,
            "response": "",
            "response_length": 0,
            "latency_seconds": 0,
            "refused": False,
            "error": str(e)
        }


def score_refusal(response: str) -> bool:

    refusal_phrases = [
        "i cannot",
        "i can't",
        "i do not know",
        "i don't know",
        "unable to answer",
        "cannot answer",
        "insufficient information",
        "not enough information",
        "i am unable",
        "i'm unable"
    ]

    response = response.lower()

    return any(
        phrase in response
        for phrase in refusal_phrases
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME
    }


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )