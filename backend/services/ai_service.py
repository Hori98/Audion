"""
AI service for OpenAI integration including text generation and text-to-speech.
"""

import logging
import uuid
import io
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path
import openai
from mutagen.mp3 import MP3

from config.settings import OPENAI_API_KEY, AUDIO_STORAGE_PATH
from services.storage_service import upload_to_s3
from utils.errors import handle_external_service_error

async def generate_audio_title_with_openai(articles_content: List[str]) -> str:
    """
    Generate an engaging title for the audio based on article content.
    
    Args:
        articles_content: List of article content strings
        
    Returns:
        str: Generated title or fallback title
    """
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        system_message = (
            "You are an expert news editor. Create a concise, engaging title for a news audio summary. "
            "The title should be 3-8 words, capture the main theme, and be suitable for a podcast episode. "
            "Avoid generic phrases like 'News Summary' or 'Daily Update'."
        )
        
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"Create an engaging title for a news audio that covers these articles:\n\n{combined_content}"
        
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            model="gpt-4o",
        )
        
        generated_title = chat_completion.choices[0].message.content.strip()
        # Remove quotes if present
        generated_title = generated_title.strip('"').strip("'")
        
        logging.info(f"Generated title: {generated_title}")
        return generated_title
        
    except Exception as e:
        logging.error(f"OpenAI title generation error: {e}")
        return f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"

async def summarize_articles_with_openai(articles_content: List[str]) -> str:
    """
    Summarize articles into a cohesive script using OpenAI.
    
    Args:
        articles_content: List of article content strings
        
    Returns:
        str: Generated script or fallback content
    """
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return (
                "Breaking news today as technology companies continue to shape our digital landscape. "
                "Recent developments include major updates to artificial intelligence systems and significant "
                "changes in social media platforms. Industry analysts report growing investments in sustainable "
                "technology solutions, while cybersecurity experts emphasize the importance of data protection "
                "in an increasingly connected world. These developments signal continued innovation across the tech sector."
            )
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        system_message = (
            "You are an expert news summarizer. Create a clean, professional news script for a single narrator "
            "to read aloud. The script should be written in a clear, natural speaking style without any host names, "
            "speaker labels, or dialogue markers. Focus on delivering the key information in an engaging, "
            "journalistic tone suitable for audio narration. Keep it around 200-300 words."
        )
        
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = (
            f"Please create a single-narrator news script summarizing these articles:\n\n{combined_content}\n\n"
            "Write only the script content without any speaker labels, host names, or dialogue markers."
        )
        
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            model="gpt-4o",
        )
        
        script = chat_completion.choices[0].message.content
        logging.info(f"Generated script length: {len(script)} characters")
        return script
        
    except Exception as e:
        logging.error(f"OpenAI summarization error: {e}")
        return (
            "An error occurred during summarization. We apologize for the technical difficulty and are "
            "working to resolve the issue. Please try again shortly for the latest news updates."
        )

async def convert_text_to_speech(text: str) -> Dict[str, Any]:
    """
    Convert text to speech using OpenAI TTS and store the audio file.
    
    Args:
        text: Text to convert to speech
        
    Returns:
        Dict: Contains 'url' and 'duration' keys, or raises exception
    """
    try:
        logging.info(f"Starting TTS conversion for text length: {len(text)}")
        
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            raise ValueError("OpenAI API key not configured")
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # Generate speech
        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text,
        )
        
        logging.info("OpenAI TTS request completed successfully")
        
        # Process audio content
        audio_content = b''
        if hasattr(response.content, '__aiter__'):
            async for chunk in response.content.aiter_bytes():
                audio_content += chunk
            logging.info("Read audio_content from async stream")
        elif isinstance(response.content, bytes):
            audio_content = response.content
            logging.info("Audio content is already bytes")
        else:
            raise TypeError(f"Unexpected type for response.content: {type(response.content)}")
        
        logging.info(f"Audio content length: {len(audio_content)} bytes")
        
        # Get audio duration
        audio_stream = io.BytesIO(audio_content)
        audio_info = MP3(audio_stream)
        duration = int(audio_info.info.length)
        
        # Generate filename
        audio_filename = f"audio_{uuid.uuid4()}.mp3"
        
        # Try S3 upload first, fallback to local storage
        try:
            public_url = await upload_to_s3(audio_content, audio_filename)
            logging.info(f"Successfully uploaded to S3: {public_url}")
        except Exception as s3_error:
            logging.warning(f"S3 upload failed, falling back to local storage: {s3_error}")
            public_url = await save_audio_locally(audio_content, audio_filename)
        
        return {
            "url": public_url,
            "duration": duration,
            "filename": audio_filename
        }
        
    except Exception as e:
        logging.error(f"TTS conversion error: {e}")
        raise handle_external_service_error("OpenAI TTS", e, "text-to-speech conversion")

async def save_audio_locally(audio_content: bytes, filename: str) -> str:
    """
    Save audio content to local storage as fallback.
    
    Args:
        audio_content: Audio file bytes
        filename: Target filename
        
    Returns:
        str: Local URL for the audio file
    """
    try:
        # Ensure audio directory exists
        AUDIO_STORAGE_PATH.mkdir(exist_ok=True)
        
        # Write audio file
        audio_path = AUDIO_STORAGE_PATH / filename
        with open(audio_path, 'wb') as f:
            f.write(audio_content)
        
        # Return local URL
        public_url = f"http://localhost:8001/audio/{filename}"
        logging.info(f"Audio saved locally: {public_url}")
        
        return public_url
        
    except Exception as e:
        logging.error(f"Error saving audio locally: {e}")
        raise

def create_mock_audio_file() -> tuple[str, int]:
    """
    Create mock audio file data for testing/fallback.
    
    Returns:
        tuple: (url, duration) for mock audio
    """
    dummy_audio_url = "http://localhost:8001/audio_files/SampleAudio_0.4mb.mp3"
    dummy_duration = 30
    return dummy_audio_url, dummy_duration

async def test_openai_connection() -> bool:
    """
    Test OpenAI API connection.
    
    Returns:
        bool: True if connection is successful
    """
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return False
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # Simple test request
        response = await client.chat.completions.create(
            messages=[{"role": "user", "content": "Test"}],
            model="gpt-3.5-turbo",
            max_tokens=5
        )
        
        return bool(response.choices[0].message.content)
        
    except Exception as e:
        logging.error(f"OpenAI connection test failed: {e}")
        return False

async def classify_text_genre_with_ai(text: str) -> Dict[str, Any]:
    """
    Use OpenAI to classify text genre with confidence scores.
    
    Args:
        text: Text to classify
        
    Returns:
        Dict: Classification results with genre and confidence
    """
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return {"genre": "General", "confidence": 0.5, "method": "fallback"}
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        system_message = (
            "Classify the following text into one of these genres: Technology, Finance, Sports, "
            "Politics, Health, Entertainment, Science, Environment, Education, Travel, General. "
            "Respond with just the genre name."
        )
        
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": text[:1000]}  # Limit text length
            ],
            model="gpt-3.5-turbo",
            max_tokens=20
        )
        
        genre = response.choices[0].message.content.strip()
        
        # Validate genre
        valid_genres = {
            "Technology", "Finance", "Sports", "Politics", "Health", 
            "Entertainment", "Science", "Environment", "Education", "Travel", "General"
        }
        
        if genre not in valid_genres:
            genre = "General"
        
        return {
            "genre": genre,
            "confidence": 0.8,  # AI classification confidence
            "method": "openai"
        }
        
    except Exception as e:
        logging.error(f"AI genre classification error: {e}")
        return {"genre": "General", "confidence": 0.1, "method": "error_fallback"}