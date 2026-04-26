from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    google_cloud_project: str
    google_cloud_location: str = "us-central1"
    elevenlabs_api_key: str
    elevenlabs_agent_id: str
    desktop_url: str = "http://127.0.0.1:7777"
    character_name: str = "bakugou"
    elevenlabs_voice_id: str = "WJSEjVRZrzK981mDoQMm"  # Kacchan try (prayge so it works)

    # Auth0
    auth0_domain: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_callback_url: str = "http://localhost:8000/auth/callback"
    auth0_mgmt_client_id: str = ""
    auth0_mgmt_client_secret: str = ""

    # Twitter app credentials (same keys configured in Auth0 Twitter social connection)
    twitter_consumer_key: str = ""
    twitter_consumer_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
