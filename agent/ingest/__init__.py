"""Ingest package: RSS and HTML diff sources."""

from ingest.htmldiff import fetch_html_changes
from ingest.registry import load_registry
from ingest.rss import fetch_rss_items

__all__ = ["fetch_html_changes", "fetch_rss_items", "load_registry"]
