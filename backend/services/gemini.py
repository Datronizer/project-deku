import logging
import base64
from google import genai
from google.genai import types
from pydantic import BaseModel
from config import settings

logger = logging.getLogger(__name__)

# Initialize client in Vertex AI mode to use project credits and higher quotas
_client = genai.Client(
    vertexai=True,
    project=settings.google_cloud_project,
    location=settings.google_cloud_location
)

class ScreenAnalysis(BaseModel):
    critique: str
    expression: str

async def analyze_screen(summary: str, screenshot_b64: str) -> ScreenAnalysis:
    """
    Use Gemini to analyze the screenshot and summary.
    Returns a critique and an expression.
    """
    prompt = f"""
    CONTEXT: We are currently at a hackathon demoing this app to judges.
    You are an expert observer analyzing a user's computer screen activity.
    The user is currently doing: {summary}
    
    Analyze the provided screenshot and the summary. 
    Your goal is to provide a "critique" that describes what they are doing in a way that can be used by an AI agent (Bakugou) to scold them, 
    tease them, or call them out sarcastically. 
    Focus on anything embarrassing, time-wasting, or overly serious.
    
    CRITICAL GROUNDING: Only mention things that are VISIBLY present in the screenshot or summary. 
    Do NOT hallucinate or mention Devpost, YouTube links, or specific hackathon tasks unless you actually see them on the screen.
    Keep the hackathon demo context in mind — we want to show off how smart and funny the agent is.
    
    Also, pick one of these four expressions that best fits your critique:
    - neutral
    - mad
    - smug
    - surprised

    Return the result in JSON format.
    """
    
    contents = [prompt]
    if screenshot_b64:
        # Handle data URI prefix if present
        if "," in screenshot_b64:
            screenshot_b64 = screenshot_b64.split(",")[1]
            
        contents.append(
            types.Part.from_bytes(
                data=base64.b64decode(screenshot_b64),
                mime_type="image/jpeg"
            )
        )

    try:
        response = await _client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ScreenAnalysis,
            ),
        )
        
        analysis = response.parsed
        if not analysis:
            raise ValueError("Failed to parse Gemini response")
            
        logger.info("[gemini] Analysis: expression=%s critique=%.80s", analysis.expression, analysis.critique)
        return analysis
        
    except Exception as e:
        logger.error("[gemini] Error during analysis: %s", e)
        raise
