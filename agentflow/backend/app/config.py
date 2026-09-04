import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def _first_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AgentFlow API"
    database_url: str = "sqlite:///./agentflow.db"
    cors_origins: str = "*"

    user_llm_api_key: str = ""
    user_llm_base_url: str = "https://api.deepseek.com/v1"
    user_llm_model: str = "deepseek-chat"

    user_gemini_api_key: str = ""
    user_gemini_model: str = "gemini-2.0-flash"

    llm_provider: str = "auto"
    llm_temperature: float = 0.7
    force_offline: bool = False
    token_delay_ms: int = 18
    max_revisions: int = 2

    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql://" + url[len("postgres://") :]
        return url

    def gemini_key(self) -> str:
        return self.user_gemini_api_key.strip() or _first_env(
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY",
        )

    def openai_key(self) -> str:
        return self.user_llm_api_key.strip() or _first_env(
            "OPENAI_API_KEY",
            "DEEPSEEK_API_KEY",
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
