"""
Article processing service for genre classification and article management.
"""

import logging
import re
from typing import Dict, List, Optional
from collections import Counter

from models.article import Article, GENRE_KEYWORDS
from utils.errors import handle_generic_error

def calculate_genre_scores(title: str, summary: str) -> Dict[str, float]:
    """
    Calculate weighted scores for each genre based on keyword matching.
    
    Args:
        title: Article title
        summary: Article summary
        
    Returns:
        Dict[str, float]: Genre scores mapping
    """
    try:
        # Input validation
        if not title and not summary:
            logging.warning("Empty title and summary provided to calculate_genre_scores")
            return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}
        
        text = (str(title or '') + " " + str(summary or '')).lower().strip()
        
        if not text:
            logging.warning("Text is empty after processing")
            return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}
        
        # Remove punctuation and normalize text
        words = re.findall(r'\b\w+\b', text)
        text_phrases = text  # Keep original for phrase matching
        
        genre_scores = {}
        
        for genre, weight_categories in GENRE_KEYWORDS.items():
            score = 0.0
            
            try:
                # High weight keywords/phrases (3.0 points)
                if "high" in weight_categories:
                    for keyword in weight_categories["high"]:
                        if keyword and keyword in text_phrases:
                            score += 3.0
                            if len(keyword.split()) == 1 and keyword in words:  # Exact word match bonus
                                score += 0.5
                
                # Medium weight keywords/phrases (1.5 points)
                if "medium" in weight_categories:
                    for keyword in weight_categories["medium"]:
                        if keyword and keyword in text_phrases:
                            score += 1.5
                            if len(keyword.split()) == 1 and keyword in words:
                                score += 0.25
                
                # Low weight keywords/phrases (0.8 points)
                if "low" in weight_categories:
                    for keyword in weight_categories["low"]:
                        if keyword and keyword in text_phrases:
                            score += 0.8
                            if len(keyword.split()) == 1 and keyword in words:
                                score += 0.1
            except Exception as e:
                logging.error(f"Error processing genre {genre}: {e}")
                score = 0.0
            
            genre_scores[genre] = score
        
        return genre_scores
    except Exception as e:
        logging.error(f"Error in calculate_genre_scores: {e}")
        return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}

def classify_article_genre(title: str, summary: str, threshold: float = 2.0) -> str:
    """
    Enhanced classify article genre with conflict resolution.
    
    Args:
        title: Article title
        summary: Article summary
        threshold: Minimum score threshold for classification
        
    Returns:
        str: Classified genre or "General" if no clear classification
    """
    try:
        scores = calculate_genre_scores(title, summary)
        
        # Find the genre with the highest score
        if not scores:
            return "General"
        
        # Sort scores to get top candidates
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_genre, top_score = sorted_scores[0]
        
        # Check if the score meets the threshold
        if top_score < threshold:
            return "General"
        
        # Handle conflicts between closely scored genres
        if len(sorted_scores) > 1:
            second_genre, second_score = sorted_scores[1]
            
            # If scores are very close (within 20%), apply conflict resolution
            if second_score > 0 and (top_score - second_score) / top_score < 0.2:
                resolved_genre = _resolve_genre_conflict(title, summary, top_genre, second_genre, top_score, second_score)
                if resolved_genre:
                    return resolved_genre
        
        return top_genre
            
    except Exception as e:
        logging.error(f"Error classifying article genre: {e}")
        return "General"

def normalize_genre(title: str, summary: str, genre: str) -> str:
    """
    Map coarse genres to a refined, UI-aligned set.
    - 分割: 「国際・社会」→（政治 or 国際 or 国内）
    - 分割: 「エンタメ・スポーツ」→（スポーツ or エンタメ・文化）
    - 抽出: 「ライフスタイル」内の医療系→健康・医療
    - 既存: テクノロジー/経済・ビジネス/科学・環境/ライフスタイルは維持
    - 未判定/汎用→その他
    """
    try:
        text = f"{title} {summary}".lower()

        political_kw = [
            '政治', '選挙', '投票', '政府', '政策', '議会', '国会', '首相', '大統領', '与党', '野党',
            'politics', 'election', 'vote', 'congress', 'parliament', 'government', 'policy'
        ]
        international_kw = [
            '国際', '世界', '外交', '条約', '制裁', '紛争', '戦争', '国連', 'un', 'nato', 'eu', '大使', '大使館',
            'international', 'foreign', 'global', 'diplomatic', 'sanctions', 'conflict', 'war', 'united nations'
        ]
        sports_kw = [
            'スポーツ', '試合', 'リーグ', '選手', '監督', 'コーチ', '得点', '勝利', '敗北', 'ゴール', 'オリンピック',
            'sports', 'game', 'match', 'league', 'player', 'coach', 'goal', 'score', 'tournament', 'world cup'
        ]
        entertainment_kw = [
            '映画', '音楽', '芸能', '俳優', '女優', '歌手', 'ドラマ', 'テレビ', '配信', 'ストリーミング', '文化', 'アート',
            'movie', 'film', 'music', 'celebrity', 'actor', 'actress', 'singer', 'series', 'streaming', 'art', 'culture'
        ]
        medical_kw = [
            '医療', '病院', '医師', '治療', '薬', 'ワクチン', '感染', '健康', '患者', '疾患',
            'medical', 'hospital', 'doctor', 'treatment', 'medicine', 'vaccine', 'infection', 'health', 'patient', 'disease'
        ]

        g = genre or ''
        if g in ('General', '', None):
            return 'その他'

        if g == '国際・社会':
            if any(k in text for k in political_kw):
                return '政治'
            if any(k in text for k in international_kw):
                return '国際'
            return '国内'

        if g == 'エンタメ・スポーツ':
            if any(k in text for k in sports_kw):
                return 'スポーツ'
            if any(k in text for k in entertainment_kw):
                return 'エンタメ・文化'
            return 'エンタメ・文化'

        if g == 'ライフスタイル':
            if any(k in text for k in medical_kw):
                return '健康・医療'
            return 'ライフスタイル'

        if g in ('テクノロジー', '経済・ビジネス', '科学・環境'):
            return g

        return 'その他'
    except Exception as e:
        logging.error(f"Error normalizing genre: {e}")
        return 'その他'

def _resolve_genre_conflict(title: str, summary: str, genre1: str, genre2: str, score1: float, score2: float) -> Optional[str]:
    """
    Resolve conflicts between closely scored genres using additional logic.
    """
    try:
        text = (title + " " + summary).lower()
        
        # Politics vs Technology conflict - prioritize politics if political context is strong
        if {genre1, genre2} == {"Politics", "Technology"}:
            political_indicators = ["election", "vote", "campaign", "government", "policy", "congress", "president", "political"]
            tech_indicators = ["software", "app", "startup", "innovation", "platform"]
            
            political_count = sum(1 for indicator in political_indicators if indicator in text)
            tech_count = sum(1 for indicator in tech_indicators if indicator in text)
            
            if political_count > tech_count:
                return "Politics"
            elif tech_count > political_count:
                return "Technology"
        
        # Business vs Technology conflict - check for financial context
        if {genre1, genre2} == {"Business", "Technology"}:
            business_indicators = ["market", "stock", "financial", "revenue", "profit", "investment", "company earnings"]
            
            if any(indicator in text for indicator in business_indicators):
                return "Business"
            else:
                return "Technology"
        
        # Politics vs World conflict - check for international context
        if {genre1, genre2} == {"Politics", "World"}:
            international_indicators = ["international", "foreign", "global", "country", "nation", "overseas", "diplomatic"]
            
            if any(indicator in text for indicator in international_indicators):
                return "World"
            else:
                return "Politics"
        
        # Default: return the genre with higher score
        return genre1 if score1 > score2 else genre2
        
    except Exception as e:
        logging.error(f"Error resolving genre conflict: {e}")
        return genre1 if score1 > score2 else genre2

def filter_articles_by_genre(articles: List[Article], genre: str) -> List[Article]:
    """
    Filter articles by genre.
    
    Args:
        articles: List of articles to filter
        genre: Genre to filter by
        
    Returns:
        List[Article]: Filtered articles
    """
    try:
        if not genre or genre.lower() == "all":
            return articles
        
        filtered = []
        for article in articles:
            # Classify if not already classified
            if not article.genre:
                article.genre = classify_article_genre(article.title, article.summary)
            
            if article.genre.lower() == genre.lower():
                filtered.append(article)
        
        return filtered
        
    except Exception as e:
        logging.error(f"Error filtering articles by genre: {e}")
        return articles

def score_article_for_user_preferences(article: Article, user_preferences: Dict[str, float]) -> float:
    """
    Score an article based on user preferences.
    
    Args:
        article: Article to score
        user_preferences: User genre preferences mapping
        
    Returns:
        float: Preference score for the article
    """
    try:
        # Classify article if not already classified
        if not article.genre:
            article.genre = classify_article_genre(article.title, article.summary)
        
        # Get user preference for this genre
        genre_preference = user_preferences.get(article.genre, 1.0)
        
        # Calculate base genre score
        genre_scores = calculate_genre_scores(article.title, article.summary)
        base_score = genre_scores.get(article.genre, 0.0)
        
        # Apply user preference multiplier
        final_score = base_score * genre_preference
        
        return final_score
        
    except Exception as e:
        logging.error(f"Error scoring article for user preferences: {e}")
        return 0.0

def get_article_diversity_score(articles: List[Article]) -> float:
    """
    Calculate diversity score for a list of articles based on genre distribution.
    
    Args:
        articles: List of articles
        
    Returns:
        float: Diversity score (0.0 to 1.0, higher is more diverse)
    """
    try:
        if not articles:
            return 0.0
        
        # Classify articles if needed and count genres
        genre_counts = Counter()
        
        for article in articles:
            if not article.genre:
                article.genre = classify_article_genre(article.title, article.summary)
            genre_counts[article.genre] += 1
        
        # Calculate diversity using Shannon entropy
        total_articles = len(articles)
        entropy = 0.0
        
        for count in genre_counts.values():
            if count > 0:
                probability = count / total_articles
                entropy -= probability * (probability.log() if hasattr(probability, 'log') else 0)
        
        # Normalize entropy to 0-1 scale
        max_entropy = (len(genre_counts)).bit_length() - 1 if len(genre_counts) > 1 else 1
        diversity_score = entropy / max_entropy if max_entropy > 0 else 0.0
        
        return min(diversity_score, 1.0)
        
    except Exception as e:
        logging.error(f"Error calculating article diversity score: {e}")
        return 0.0

def extract_article_keywords(title: str, summary: str, max_keywords: int = 10) -> List[str]:
    """
    Extract key terms/keywords from article content.
    
    Args:
        title: Article title
        summary: Article summary
        max_keywords: Maximum number of keywords to return
        
    Returns:
        List[str]: Extracted keywords
    """
    try:
        text = (str(title or '') + " " + str(summary or '')).lower().strip()
        
        if not text:
            return []
        
        # Remove punctuation and split into words
        words = re.findall(r'\b\w+\b', text)
        
        # Filter out common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'within', 'without', 'against', 'over',
            'under', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
            'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        # Filter words and count frequency
        filtered_words = [word for word in words if len(word) > 2 and word not in stop_words]
        word_counts = Counter(filtered_words)
        
        # Return most common keywords
        return [word for word, count in word_counts.most_common(max_keywords)]
        
    except Exception as e:
        logging.error(f"Error extracting article keywords: {e}")
        return []

def calculate_article_similarity(article1: Article, article2: Article) -> float:
    """
    Calculate similarity between two articles based on keywords and genre.
    
    Args:
        article1: First article
        article2: Second article
        
    Returns:
        float: Similarity score (0.0 to 1.0)
    """
    try:
        # Genre similarity
        genre1 = article1.genre or classify_article_genre(article1.title, article1.summary)
        genre2 = article2.genre or classify_article_genre(article2.title, article2.summary)
        genre_similarity = 1.0 if genre1 == genre2 else 0.0
        
        # Keyword similarity
        keywords1 = set(extract_article_keywords(article1.title, article1.summary))
        keywords2 = set(extract_article_keywords(article2.title, article2.summary))
        
        if not keywords1 and not keywords2:
            keyword_similarity = 0.0
        elif not keywords1 or not keywords2:
            keyword_similarity = 0.0
        else:
            intersection = len(keywords1.intersection(keywords2))
            union = len(keywords1.union(keywords2))
            keyword_similarity = intersection / union if union > 0 else 0.0
        
        # Combine similarities with weights
        final_similarity = (genre_similarity * 0.4) + (keyword_similarity * 0.6)
        
        return final_similarity
        
    except Exception as e:
        logging.error(f"Error calculating article similarity: {e}")
        return 0.0
