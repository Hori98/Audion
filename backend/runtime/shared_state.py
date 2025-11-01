"""
Shared runtime state for modules that cannot import `server` directly.

Holds references to the active DB connection and RSS cache.
Server should assign these during startup.
"""

from typing import Any, Dict

db: Any = None
db_connected: bool = False

# RSS cache is a mapping: url -> { 'feed': feedparser.FeedParserDict, 'timestamp': float }
RSS_CACHE: Dict[str, Dict[str, Any]] = {}

