"""
General utility functions and helpers.
Contains commonly used functions across the application.
"""

import uuid
import re
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import hashlib

def generate_unique_id() -> str:
    """
    Generate a unique ID string.
    
    Returns:
        str: Unique identifier
    """
    return str(uuid.uuid4())

def generate_filename(original_filename: str, prefix: str = "") -> str:
    """
    Generate a unique filename with optional prefix.
    
    Args:
        original_filename: Original filename
        prefix: Optional prefix for the filename
        
    Returns:
        str: Unique filename
    """
    # Extract file extension
    extension = ""
    if "." in original_filename:
        extension = "." + original_filename.split(".")[-1]
    
    # Generate unique filename
    unique_id = generate_unique_id()
    filename = f"{prefix}{unique_id}{extension}" if prefix else f"{unique_id}{extension}"
    
    return filename

def sanitize_string(text: str, max_length: int = 255) -> str:
    """
    Sanitize a string for safe database storage and display.
    
    Args:
        text: Text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Remove potentially harmful characters
    sanitized = re.sub(r'[<>"\']', '', text)
    
    # Trim whitespace and limit length
    sanitized = sanitized.strip()[:max_length]
    
    return sanitized

def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if valid email format
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256.
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password
    """
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password
        hashed_password: Hashed password to compare against
        
    Returns:
        bool: True if password matches
    """
    return hash_password(password) == hashed_password

def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable format.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        str: Formatted duration (e.g., "2:30", "1:23:45")
    """
    if seconds < 0:
        return "0:00"
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes}:{seconds:02d}"

def parse_duration(duration_str: str) -> float:
    """
    Parse duration string to seconds.
    
    Args:
        duration_str: Duration string (e.g., "2:30", "1:23:45")
        
    Returns:
        float: Duration in seconds
    """
    try:
        parts = duration_str.split(":")
        if len(parts) == 2:  # MM:SS
            minutes, seconds = map(int, parts)
            return minutes * 60 + seconds
        elif len(parts) == 3:  # HH:MM:SS
            hours, minutes, seconds = map(int, parts)
            return hours * 3600 + minutes * 60 + seconds
        else:
            return 0.0
    except (ValueError, AttributeError):
        return 0.0

def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split a list into chunks of specified size.
    
    Args:
        lst: List to chunk
        chunk_size: Size of each chunk
        
    Returns:
        List[List]: List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def remove_duplicates(lst: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    """
    Remove duplicates from a list of dictionaries based on a key.
    
    Args:
        lst: List of dictionaries
        key: Key to use for duplicate detection
        
    Returns:
        List[Dict]: List with duplicates removed
    """
    seen = set()
    result = []
    
    for item in lst:
        if item.get(key) not in seen:
            seen.add(item.get(key))
            result.append(item)
    
    return result

def calculate_expiry_date(days: int) -> datetime:
    """
    Calculate expiry date from current time.
    
    Args:
        days: Number of days from now
        
    Returns:
        datetime: Expiry date
    """
    return datetime.utcnow() + timedelta(days=days)

def is_expired(expiry_date: datetime) -> bool:
    """
    Check if a date has expired.
    
    Args:
        expiry_date: Date to check
        
    Returns:
        bool: True if expired
    """
    return datetime.utcnow() > expiry_date

def merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge two dictionaries, with dict2 values taking precedence.
    
    Args:
        dict1: First dictionary
        dict2: Second dictionary (overrides dict1)
        
    Returns:
        Dict: Merged dictionary
    """
    result = dict1.copy()
    result.update(dict2)
    return result

def log_performance(func_name: str, start_time: float, end_time: float):
    """
    Log performance metrics for a function.
    
    Args:
        func_name: Name of the function
        start_time: Start timestamp
        end_time: End timestamp
    """
    duration = end_time - start_time
    logging.info(f"Performance: {func_name} completed in {duration:.3f}s")

def extract_text_preview(text: str, max_length: int = 100) -> str:
    """
    Extract a preview of text content.
    
    Args:
        text: Full text content
        max_length: Maximum length of preview
        
    Returns:
        str: Text preview with ellipsis if truncated
    """
    if not text:
        return ""
    
    # Clean text
    cleaned = re.sub(r'\s+', ' ', text.strip())
    
    if len(cleaned) <= max_length:
        return cleaned
    
    # Find last complete word within limit
    truncated = cleaned[:max_length]
    last_space = truncated.rfind(' ')
    
    if last_space > 0:
        truncated = truncated[:last_space]
    
    return truncated + "..."