import asyncio
import logging
import re
from google.cloud import vision

logger = logging.getLogger(__name__)

_client = vision.ImageAnnotatorClient()

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
    img_kb = len(screenshot_b64) * 3 // 4 // 1024
    logger.info("[vision] sending screenshot to Cloud Vision (%d KB)", img_kb)

    image = vision.Image(content=screenshot_b64.encode() if isinstance(screenshot_b64, str) else screenshot_b64)

    loop = asyncio.get_event_loop()
    try:
        text_resp, label_resp, web_resp = await asyncio.gather(
            loop.run_in_executor(None, _client.text_detection, image),
            loop.run_in_executor(None, _client.label_detection, image),
            loop.run_in_executor(None, _client.web_detection, image),
        )
    except Exception:
        logger.exception("[vision] Cloud Vision API call failed")
        raise

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
