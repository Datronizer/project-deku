from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    elevenlabs_api_key: str
    elevenlabs_agent_id: str
    desktop_url: str = "http://127.0.0.1:7777"
    character_name: str = "klee"
    elevenlabs_voice_id: str = "WJSEjVRZrzK981mDoQMm"  # Kacchan try (prayge so it works)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
