import os
from dotenv import load_dotenv
from google import genai
from typing import AsyncGenerator

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set.")

client = genai.Client(api_key=api_key)

async def stream_ai_response(prompt: str) -> AsyncGenerator[str, None]:
    """
    Gemini model used real-time tokens streaming async generator function.
    """
    try:
        response = await client.aio.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"Error occurred while streaming AI response: {str(e)}"