import asyncio
from google.cloud import vision

_client = vision.ImageAnnotatorClient()

async def describe_screenshot(screenshot_b64: str) -> str:
    image = vision.Image(content=screenshot_b64.encode() if isinstance(screenshot_b64, str) else screenshot_b64)

    # Run blocking SDK calls in a thread so we don't block the event loop
    loop = asyncio.get_event_loop()
    text_resp, label_resp, web_resp = await asyncio.gather(
        loop.run_in_executor(None, _client.text_detection, image),
        loop.run_in_executor(None, _client.label_detection, image),
        loop.run_in_executor(None, _client.web_detection, image),
    )

    parts: list[str] = []

    if text_resp.full_text_annotation.text:
        parts.append(f"Visible text: {text_resp.full_text_annotation.text.strip()[:400]}")

    labels = [a.description for a in label_resp.label_annotations]
    if labels:
        parts.append(f"Labels: {', '.join(labels)}")

    web_entities = [e.description for e in web_resp.web_detection.web_entities if e.description]
    if web_entities:
        parts.append(f"Web context: {', '.join(web_entities[:5])}")

    return "\n".join(parts) or "No visual context detected."
