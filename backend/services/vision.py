import asyncio
import logging
import re
import base64
from google.cloud import vision
from config import settings

logger = logging.getLogger(__name__)

try:
    # Use explicit project from settings if available, else fallback to default ADC
    if settings.google_cloud_project:
        _client = vision.ImageAnnotatorClient(client_options={"quota_project_id": settings.google_cloud_project})
        logger.info("[vision] client initialized with project: %s", settings.google_cloud_project)
    else:
        _client = vision.ImageAnnotatorClient()
        logger.info("[vision] client initialized with default credentials")
except Exception as e:
    logger.error("[vision] failed to initialize Cloud Vision client: %s", e)
    _client = None

_REDACT_PATTERNS = [
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),  # email
    re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'),                    # phone
    re.compile(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'),              # card number
]

def _redact_sensitive(text: str) -> str:
    for pattern in _REDACT_PATTERNS:
        text = pattern.sub('[REDACTED]', text)
    return text

async def describe_screenshot(screenshot_b64: str) -> str:
    if not _client:
        return "Vision API client not initialized."
    
    if not screenshot_b64:
        return "No screenshot provided."

    # Handle data URI prefix if present
    if "," in screenshot_b64:
        screenshot_b64 = screenshot_b64.split(",")[1]

    try:
        content = base64.b64decode(screenshot_b64)
    except Exception as e:
        logger.error("[vision] failed to decode base64: %s", e)
        return f"Error decoding screenshot: {e}"

    img_kb = len(content) // 1024
    logger.info("[vision] sending screenshot to Cloud Vision (%d KB)", img_kb)

    image = vision.Image(content=content)

    loop = asyncio.get_event_loop()
    try:
        # We use a timeout to prevent hanging forever
        text_resp, label_resp, web_resp = await asyncio.wait_for(
            asyncio.gather(
                loop.run_in_executor(None, _client.text_detection, image),
                loop.run_in_executor(None, _client.label_detection, image),
                loop.run_in_executor(None, _client.web_detection, image),
            ),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        logger.error("[vision] Cloud Vision API call timed out")
        return "Vision API timed out."
    except Exception as e:
        logger.error("[vision] Cloud Vision API call failed: %s", e)
        return f"Vision API error: {e}"

    parts: list[str] = []

    raw_text = _redact_sensitive(text_resp.full_text_annotation.text.strip())
    if raw_text:
        parts.append(f"Visible text: {raw_text[:400]}")
        logger.debug("[vision] text detection: %d chars", len(raw_text))

    labels = [a.description for a in label_resp.label_annotations]
    if labels:
        parts.append(f"Labels: {', '.join(labels)}")
        logger.debug("[vision] labels: %s", ", ".join(labels))

    web_entities = [e.description for e in web_resp.web_detection.web_entities if e.description]
    if web_entities:
        parts.append(f"Web context: {', '.join(web_entities[:5])}")
        logger.debug("[vision] web entities: %s", ", ".join(web_entities[:5]))

    result = "\n".join(parts) or "No visual context detected."
    logger.info("[vision] description ready (%d chars): %.120s", len(result), result)
    return result
