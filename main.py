from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import json
import os

app = FastAPI()

# Allow website to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()
# Set up Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Create Gemini model
model = genai.GenerativeModel('gemini-2.5-flash')

@app.get("/analyze")
async def analyze(question: str, language: str):
    """
    Takes a question in any language.
    Tests it on Gemini.
    Returns response + hallucination score.
    """
    
    results = {}
    
    # Test with Gemini
    try:
       
        response = model.generate_content( 
            f"Answer in 2-3 sentences only.\n\nQuestion: {question}"
        )


        gemini_response = response.text
        gemini_score = score_hallucination(question, gemini_response)
        
        results["gemini-pro"] = {
            "response": gemini_response,
            "hallucination_score": gemini_score
        }
    except Exception as e:
        results["gemini-pro"] = {"error": str(e), "hallucination_score": 0}
    
    return results

def score_hallucination(question: str, response: str) -> int:
    """
    Uses Gemini to judge if response is hallucinated (0-100 score)
    """
    
    judge_prompt = f"""You are a hallucination detector.

Question: {question}
Answer: {response}

Is this answer hallucinated (made up, not real)?
Answer with ONLY a number 0-100 where:
0 = clearly correct and truthful
50 = uncertain, could be real or made up
100 = clearly hallucinated (made up, false)

Just give the number, nothing else."""
    
    try:
        judge_response = model.generate_content(
            judge_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=5,
                temperature=0,
            )
        )
        
        score_text = judge_response.text.strip()
        score = int(score_text)
        return min(100, max(0, score))
    
    except:
        return 50

@app.get("/health")
async def health():
    """Check if backend is running"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
