import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Client = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client using service role key."""
    global _client

    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )

        _client = create_client(url, key)
        logger.info("Supabase client initialized")

    return _client
