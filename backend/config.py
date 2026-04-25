from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    gemini_api_key: str
    elevenlabs_api_key: str
    desktop_url: str = "http://127.0.0.1:7777"
    character_name: str = "klee"
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"  # default: Bella

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
