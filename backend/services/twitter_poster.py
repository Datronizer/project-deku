import logging
import tweepy
from config import settings
from services import auth0_client, elevenlabs_agent

logger = logging.getLogger(__name__)


async def post_mischief_tweet(active_window: str, category: str) -> bool:
    """Generate a confessional tweet from the user's POV and post it via their X account."""
    tokens = auth0_client.get_twitter_tokens()
    if not tokens:
        logger.info("[twitter] no token — skipping tweet")
        return False

    access_token, access_token_secret = tokens

    tweet_text = await _generate_tweet(active_window, category)
    if not tweet_text:
        return False

    try:
        client = tweepy.Client(
            consumer_key=settings.twitter_consumer_key,
            consumer_secret=settings.twitter_consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
        )
        client.create_tweet(text=tweet_text)
        logger.info("[twitter] posted: %s", tweet_text)
        return True
    except Exception as e:
        logger.error("[twitter] post failed: %s", e)
        return False


async def _generate_tweet(active_window: str, category: str) -> str:
    prompt = (
        f"The user just switched to {active_window} (category: {category}) instead of working. "
        "Write a short, funny, self-aware tweet FROM THE USER'S PERSPECTIVE confessing what they're doing. "
        "First person, casual tone, no hashtags, max 240 chars. "
        "Example: 'instead of doing work, i'm out here browsing reddit. no notes.' "
        "Just return the tweet text, nothing else."
    )
    try:
        text = await elevenlabs_agent._query_agent(prompt)
        return text[:240].strip()
    except Exception as e:
        logger.error("[twitter] tweet generation failed: %s", e)
        # Fallback template
        labels = {"social": "scrolling social media", "streaming": "watching stuff", "gaming": "gaming"}
        activity = labels.get(category, active_window)
        return f"instead of doing work, i'm out here {activity}. no notes."
