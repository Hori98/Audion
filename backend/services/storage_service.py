"""
Storage service for handling file uploads to S3 and local storage.
"""

import logging
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
from typing import Optional
import base64
import uuid

from config.settings import (
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, 
    S3_BUCKET_NAME, PROFILE_IMAGES_PATH
)
from utils.errors import handle_external_service_error

async def upload_to_s3(content: bytes, filename: str, content_type: str = 'audio/mpeg') -> str:
    """
    Upload content to S3 and return public URL.
    
    Args:
        content: File content as bytes
        filename: Target filename
        content_type: MIME type of the content
        
    Returns:
        str: Public URL of uploaded file
        
    Raises:
        Exception: If upload fails
    """
    try:
        # Validate AWS credentials
        if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
            raise ValueError("AWS credentials or bucket name not configured")
        
        if AWS_ACCESS_KEY_ID == "your-aws-access-key":
            raise ValueError("AWS credentials not properly configured")
        
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        # Determine S3 key based on content type
        if content_type.startswith('audio/'):
            s3_key = f"audio/{filename}"
        elif content_type.startswith('image/'):
            s3_key = f"images/{filename}"
        else:
            s3_key = f"files/{filename}"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=content,
            ContentType=content_type
        )
        
        # Generate public URL
        public_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        logging.info(f"File uploaded to S3: {public_url}")
        
        return public_url
        
    except ClientError as e:
        logging.error(f"S3 upload failed: {e}")
        raise handle_external_service_error("AWS S3", e, "file upload")
    except Exception as e:
        logging.error(f"Storage upload error: {e}")
        raise

async def delete_from_s3(file_url: str) -> bool:
    """
    Delete a file from S3 using its public URL.
    
    Args:
        file_url: Public S3 URL of the file
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        # Validate AWS credentials
        if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
            logging.warning("AWS credentials not configured for deletion")
            return False
        
        # Extract S3 key from URL
        if not file_url.startswith(f"https://{S3_BUCKET_NAME}.s3."):
            logging.warning(f"URL is not from configured S3 bucket: {file_url}")
            return False
        
        # Parse S3 key from URL
        url_parts = file_url.split(f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/")
        if len(url_parts) != 2:
            logging.error(f"Could not parse S3 key from URL: {file_url}")
            return False
        
        s3_key = url_parts[1]
        
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        # Delete from S3
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        logging.info(f"File deleted from S3: {s3_key}")
        
        return True
        
    except ClientError as e:
        logging.error(f"S3 deletion failed: {e}")
        return False
    except Exception as e:
        logging.error(f"Storage deletion error: {e}")
        return False

async def save_profile_image(image_data: str, user_id: str) -> str:
    """
    Save a base64 encoded profile image locally.
    
    Args:
        image_data: Base64 encoded image data
        user_id: User ID for filename generation
        
    Returns:
        str: Local URL of saved image
    """
    try:
        # Decode base64 image
        if ',' in image_data:
            # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Generate filename
        image_filename = f"profile_{user_id}_{uuid.uuid4().hex[:8]}.jpg"
        
        # Ensure profile images directory exists
        PROFILE_IMAGES_PATH.mkdir(exist_ok=True)
        
        # Save image locally
        image_path = PROFILE_IMAGES_PATH / image_filename
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
        # Return local URL
        local_url = f"http://localhost:8001/profile-images/{image_filename}"
        logging.info(f"Profile image saved locally: {local_url}")
        
        return local_url
        
    except Exception as e:
        logging.error(f"Error saving profile image: {e}")
        raise

async def delete_profile_image(image_url: str) -> bool:
    """
    Delete a profile image from local storage.
    
    Args:
        image_url: Local URL of the image
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        # Extract filename from URL
        if "/profile-images/" not in image_url:
            logging.warning(f"URL is not a profile image URL: {image_url}")
            return False
        
        filename = image_url.split("/profile-images/")[-1]
        image_path = PROFILE_IMAGES_PATH / filename
        
        # Delete file if it exists
        if image_path.exists():
            image_path.unlink()
            logging.info(f"Profile image deleted: {filename}")
            return True
        else:
            logging.warning(f"Profile image file not found: {filename}")
            return False
        
    except Exception as e:
        logging.error(f"Error deleting profile image: {e}")
        return False

def get_storage_stats() -> dict:
    """
    Get storage statistics for local files.
    
    Returns:
        dict: Storage statistics
    """
    try:
        stats = {
            "profile_images": {
                "count": 0,
                "total_size": 0
            },
            "audio_files": {
                "count": 0,
                "total_size": 0
            }
        }
        
        # Count profile images
        if PROFILE_IMAGES_PATH.exists():
            for file_path in PROFILE_IMAGES_PATH.glob("*"):
                if file_path.is_file():
                    stats["profile_images"]["count"] += 1
                    stats["profile_images"]["total_size"] += file_path.stat().st_size
        
        # Count audio files
        from config.settings import AUDIO_STORAGE_PATH
        if AUDIO_STORAGE_PATH.exists():
            for file_path in AUDIO_STORAGE_PATH.glob("*"):
                if file_path.is_file():
                    stats["audio_files"]["count"] += 1
                    stats["audio_files"]["total_size"] += file_path.stat().st_size
        
        return stats
        
    except Exception as e:
        logging.error(f"Error getting storage stats: {e}")
        return {
            "profile_images": {"count": 0, "total_size": 0},
            "audio_files": {"count": 0, "total_size": 0}
        }

def is_s3_configured() -> bool:
    """
    Check if S3 is properly configured.
    
    Returns:
        bool: True if S3 is configured
    """
    return all([
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
        S3_BUCKET_NAME,
        AWS_ACCESS_KEY_ID != "your-aws-access-key"
    ])