import pytest
from pydantic import ValidationError

from app.config import DEFAULT_SECRET_KEY, Settings


def test_settings_reject_default_secret_in_production() -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY must be set in production"):
        Settings(env="production", secret_key=DEFAULT_SECRET_KEY)


def test_settings_allows_default_secret_outside_production() -> None:
    assert Settings(env="development", secret_key=DEFAULT_SECRET_KEY).secret_key == DEFAULT_SECRET_KEY
