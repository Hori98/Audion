"""
Audio Generation Service - AI-powered article to audio conversion
Clean implementation with OpenAI GPT + TTS integration
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.audio import AudioContent, AudioStatus, AudioLanguage
from app.core.config import settings


class AudioGenerationService:
    """Service for generating audio content from articles"""
    
    def __init__(self):
        self.openai_api_key = getattr(settings, 'openai_api_key', None)
        self.storage_path = Path("storage/audio")
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    async def generate_script_from_article(
        self, 
        article: Article, 
        language: AudioLanguage = AudioLanguage.japanese
    ) -> str:
        """Generate conversational script from article using OpenAI GPT"""
        
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        # Create conversational prompt based on language
        if language == AudioLanguage.japanese:
            system_prompt = """
あなたは記事を2人のホストによる会話形式のポッドキャスト台本に変換する専門家です。
自然で親しみやすい会話調で、記事の内容を分かりやすく伝えてください。

要件:
- HOST1とHOST2の対話形式
- 5-8分程度の長さ
- 記事の重要なポイントを漏らさない
- 聞き手が理解しやすい説明
- 自然な日本語の会話
"""
            user_prompt = f"""
記事タイトル: {article.title}
記事内容: {article.summary}

{article.content if article.content else ""}

この記事を2人のホストが話し合うポッドキャスト台本に変換してください。
"""
        else:
            system_prompt = """
You are an expert at converting articles into conversational podcast scripts with two hosts.
Create natural, engaging dialogue that explains the article content clearly.

Requirements:
- HOST1 and HOST2 dialogue format
- 5-8 minute duration
- Cover all key points from the article
- Make it accessible to listeners
- Natural conversational flow
"""
            user_prompt = f"""
Article Title: {article.title}
Article Summary: {article.summary}

{article.content if article.content else ""}

Convert this article into a podcast script with two hosts discussing it.
"""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "max_tokens": 2000,
                        "temperature": 0.7
                    }
                )
                response.raise_for_status()
                
                result = response.json()
                script = result["choices"][0]["message"]["content"]
                return script.strip()
                
        except Exception as e:
            raise Exception(f"Script generation failed: {str(e)}")
    
    async def generate_audio_file(
        self, 
        script: str, 
        voice_type: str = "alloy",
        language: AudioLanguage = AudioLanguage.japanese
    ) -> tuple[str, int]:
        """Generate audio file from script using OpenAI TTS"""
        
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        try:
            # Generate unique filename
            audio_id = str(uuid.uuid4())
            audio_filename = f"{audio_id}.mp3"
            audio_path = self.storage_path / audio_filename
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "tts-1",
                        "input": script,
                        "voice": voice_type,
                        "response_format": "mp3",
                        "speed": 1.0
                    }
                )
                response.raise_for_status()
                
                # Save audio file
                with open(audio_path, "wb") as f:
                    f.write(response.content)
                
                # Calculate file size
                file_size = audio_path.stat().st_size
                
                # For now, return local path. In production, upload to S3
                return str(audio_path), file_size
                
        except Exception as e:
            raise Exception(f"Audio generation failed: {str(e)}")
    
    async def create_audio_content(
        self,
        article_id: str,
        user_id: str,
        db: AsyncSession,
        title: Optional[str] = None,
        language: AudioLanguage = AudioLanguage.japanese,
        voice_type: str = "alloy"
    ) -> AudioContent:
        """Create audio content from article - full workflow"""
        
        # Get article
        result = await db.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        
        if not article:
            raise ValueError(f"Article not found: {article_id}")
        
        # Create initial audio record
        audio_content = AudioContent(
            user_id=user_id,
            article_id=article_id,
            title=title or f"Audio: {article.title}",
            script="",  # Will be populated after generation
            language=language,
            voice_type=voice_type,
            status=AudioStatus.processing
        )
        
        db.add(audio_content)
        await db.commit()
        await db.refresh(audio_content)
        
        try:
            # Generate script
            script = await self.generate_script_from_article(article, language)
            
            # Generate audio file
            audio_path, file_size = await self.generate_audio_file(
                script, voice_type, language
            )
            
            # Update audio content with results
            audio_content.script = script
            audio_content.audio_url = audio_path  # In production, this would be S3 URL
            audio_content.status = AudioStatus.completed
            
            # Estimate duration (rough calculation: ~150 words per minute)
            word_count = len(script.split())
            estimated_duration = max(60, int(word_count / 150 * 60))  # At least 1 minute
            audio_content.duration = estimated_duration
            
            await db.commit()
            await db.refresh(audio_content)
            
            return audio_content
            
        except Exception as e:
            # Mark as failed
            audio_content.status = AudioStatus.failed
            await db.commit()
            raise e
    
    async def get_user_audio_library(
        self,
        user_id: str,
        db: AsyncSession,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get user's audio library with pagination"""
        
        # Count total
        count_result = await db.execute(
            select(func.count()).select_from(
                select(AudioContent).where(AudioContent.user_id == user_id).subquery()
            )
        )
        total = count_result.scalar()
        
        # Get paginated results
        result = await db.execute(
            select(AudioContent)
            .where(AudioContent.user_id == user_id)
            .order_by(AudioContent.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        
        audio_contents = result.scalars().all()
        has_next = (page * per_page) < total
        
        return {
            "audio_contents": audio_contents,
            "total": total,
            "page": page,
            "per_page": per_page,
            "has_next": has_next
        }


# Import required for database function
from sqlalchemy import func