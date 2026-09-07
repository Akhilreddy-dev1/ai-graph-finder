"""Render-compatible backend entrypoint.

The deployed Render service starts ``main:app``. Keep the application
implementation in api.py while exposing the same FastAPI instance here.
"""

from api import app

__all__ = ["app"]
