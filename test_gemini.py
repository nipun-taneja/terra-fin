"""
Integration test for Google Gemini API connectivity.
"""
import os
from dotenv import load_dotenv  # type: ignore[import]
from google import genai  # type: ignore[import]

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("Missing GEMINI_API_KEY in .env")

client = genai.Client(api_key=api_key)

resp = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents="Say hello in one sentence."
)

print(resp.text)