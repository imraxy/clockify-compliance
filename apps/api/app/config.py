from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict


def _repo_config_dir() -> Path:
    # In Docker container: /app/config is set via CONFIG_DIR env
    # Locally: traverse up from apps/api/app to repo root
    env_config = Path("/app/config")
    if env_config.is_dir():
        return env_config
    return Path(__file__).resolve().parents[3] / "config"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://clockify:clockify@localhost:5432/clockify"
    secret_key: str = "dev-secret-change-in-production"
    clockify_api_key: str = ""
    clockify_api_base: str = "https://api.clockify.me/api/v1"
    clockify_workspace_id: str = ""
    config_dir: Path = _repo_config_dir()
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def load_yaml(name: str) -> dict[str, Any]:
    path = get_settings().config_dir / name
    if not path.is_file():
        path = _repo_config_dir() / name
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}
