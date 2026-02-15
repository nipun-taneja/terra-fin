"""
MongoDB Atlas connection singleton.
Reads MONGODB_URI from .env and provides get_db() for the application.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv  # type: ignore[import]
from pymongo import MongoClient  # type: ignore[import]
from pymongo.database import Database  # type: ignore[import]

_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client
    if _client is not None:
        return _client

    # Re-read .env every time we create a new client (supports hot-reload)
    load_dotenv(override=True)
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        raise RuntimeError(
            "MONGODB_URI is not set. Add it to your .env file.\n"
            "Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
        )
    _client = MongoClient(uri)
    return _client


def get_db() -> Database:
    """Return the default Terra30 database handle."""
    load_dotenv(override=True)
    db_name = os.getenv("MONGODB_DB_NAME", "terra30")
    return _get_client()[db_name]


def ping() -> bool:
    """Quick connectivity check. Returns True if Atlas responds."""
    try:
        _get_client().admin.command("ping")
        return True
    except Exception:
        return False
