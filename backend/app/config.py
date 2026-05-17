import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    JWT_SECRET: str = "supersecretjwtkeyforvirtualabplatform2026"
    DATABASE_URL: str = "sqlite:///./virtualab.db"
    JUDGE0_API_URL: str = "https://judge0-ce.p.rapidapi.com"
    JUDGE0_API_KEY: str = "mock-key"
    
    # Groq Cloud Keys
    GROQ_API_KEY_RAG1: str = "mock-key"
    GROQ_API_KEY_RAG2: str = "mock-key"
    
    # Supabase config
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Allow loading from backend/.env if present
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
