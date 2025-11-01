"""
Genre mapping utilities to normalize frontend-provided genres
to backend internal genre keys used by GENRE_KEYWORDS.

This module centralizes mapping from various labels (Japanese display
names, lowercase aliases, synonyms) to canonical English keys like
"Technology", "Finance", etc.
"""

from typing import Iterable, List


# Canonical genre keys used in backend article classification
CANONICAL_GENRES = {
    "Technology",
    "Finance",
    "Sports",
    "Politics",
    "Health",
    "Entertainment",
    "Science",
    "Environment",
    "Education",
    "Travel",
    "General",
}


# Simple mapping table from common FE labels to canonical keys
_GENRE_MAP = {
    # Japanese → Canonical
    "テクノロジー": "Technology",
    "技術": "Technology",
    "ビジネス": "Finance",
    "経済": "Finance",
    "スポーツ": "Sports",
    "政治": "Politics",
    "健康": "Health",
    "医療": "Health",
    "エンタメ": "Entertainment",
    "エンターテインメント": "Entertainment",
    "科学": "Science",
    "環境": "Environment",
    "教育": "Education",
    "旅行": "Travel",
    "一般": "General",
    # English lowercase aliases → Canonical
    "technology": "Technology",
    "tech": "Technology",
    "finance": "Finance",
    "business": "Finance",
    "sports": "Sports",
    "politics": "Politics",
    "health": "Health",
    "entertainment": "Entertainment",
    "science": "Science",
    "environment": "Environment",
    "education": "Education",
    "travel": "Travel",
    "general": "General",
}


def normalize_genre_label(label: str) -> str:
    """Normalize a single genre label to canonical form.

    Falls back to returning the original label if it already matches a
    canonical key (case-insensitive). Otherwise, returns the original
    label unchanged so upstream can decide how to handle unknowns.
    """
    if not label:
        return label

    # Exact canonical match (case-insensitive)
    for canon in CANONICAL_GENRES:
        if label.lower() == canon.lower():
            return canon

    mapped = _GENRE_MAP.get(label) or _GENRE_MAP.get(label.lower())
    if mapped:
        return mapped

    return label


def normalize_preferred_genres(genres: Iterable[str] | None) -> List[str]:
    """Normalize a list of preferred genre labels to canonical keys.

    - Deduplicates while preserving input order of first appearance
    - Filters out empty values
    """
    if not genres:
        return []

    seen = set()
    result: List[str] = []
    for g in genres:
        if not g:
            continue
        canon = normalize_genre_label(g)
        if canon and canon not in seen:
            seen.add(canon)
            result.append(canon)
    return result

