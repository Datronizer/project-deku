from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    google_cloud_project: str
    google_cloud_location: str = "us-central1"
    gemini_api_key: str
    elevenlabs_api_key: str
    elevenlabs_agent_id: str
    desktop_url: str = "http://127.0.0.1:7777"
    character_name: str = "bakugou"  # or deku 
    elevenlabs_voice_id: str = "LmaDy3lud1QUGySUPYq2"  # voice elevenlabs
    # kacchan voice: LmaDy3lud1QUGySUPYq2
    # deku voice: WJSEjVRZrzK981mDoQMm

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
