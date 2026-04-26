import asyncio
import logging
from google.cloud import vision

logger = logging.getLogger(__name__)

_client = vision.ImageAnnotatorClient()

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

    raw_text = text_resp.full_text_annotation.text.strip()
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
