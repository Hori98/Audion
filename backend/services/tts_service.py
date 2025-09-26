"""
Text-to-Speech Service
OpenAI TTS APIを使用した音声生成とXMLテキスト抽出を統合したサービス

Features:
- XMLタグ除去による自然言語テキスト抽出
- OpenAI TTS APIによる高品質音声生成
- S3アップロードとローカルストレージのフォールバック
- 音声メタデータ（長さ）の自動取得
"""

import io
import logging
import uuid
from typing import Dict, Any, Optional
from pathlib import Path

import openai
from mutagen.mp3 import MP3

from config.settings import OPENAI_API_KEY, AUDIO_STORAGE_PATH, SERVER_PUBLIC_BASE_URL
from services.storage_service import upload_to_s3
from utils.text_utils import extract_clean_script_text
from utils.errors import handle_external_service_error


class TTSService:
    """Text-to-Speech統合サービス"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    async def convert_text_to_speech(
        self,
        text: str, 
        voice_name: str = "alloy", 
        voice_language: Optional[str] = None,
        model: str = "tts-1"
    ) -> Dict[str, Any]:
        """
        XMLタグを含むテキストを音声に変換
        
        Args:
            text: 変換対象のテキスト（XMLタグを含む可能性あり）
            voice_name: 音声の種類 (alloy, echo, fable, onyx, nova, shimmer)
            voice_language: 音声の言語設定（オプション）
            model: 使用するTTSモデル（tts-1, tts-1-hd）
            
        Returns:
            Dict: url, duration, filename を含む音声データ情報
            
        Raises:
            ValueError: APIキー未設定、有効なテキストが見つからない場合
            Exception: TTS変換エラー
        """
        try:
            # XMLタグを含む可能性のあるテキストから自然言語のみを抽出
            clean_text = extract_clean_script_text(text)
            
            self.logger.info(f"TTS conversion started - Original: {len(text)} chars, Clean: {len(clean_text)} chars")
            
            if not clean_text.strip():
                raise ValueError("No valid text content found after XML processing")
            
            if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
                raise ValueError("OpenAI API key not configured")
            
            # OpenAI TTS APIクライアント初期化
            client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
            
            # 音声生成リクエスト
            response = await client.audio.speech.create(
                model=model,
                voice=voice_name,
                input=clean_text
            )
            
            self.logger.info("OpenAI TTS request completed successfully")
            
            # 音声データの処理
            audio_content = await self._process_audio_response(response)
            
            # 音声メタデータの取得
            duration = self._get_audio_duration(audio_content)
            
            # ファイル名生成
            audio_filename = f"audio_{uuid.uuid4()}.mp3"
            
            # ストレージへのアップロード（S3優先、ローカルフォールバック）
            public_url = await self._store_audio(audio_content, audio_filename)
            
            return {
                "url": public_url,
                "duration": duration,
                "filename": audio_filename,
                "clean_text": clean_text  # デバッグ用にクリーンテキストも返却
            }
            
        except Exception as e:
            self.logger.error(f"TTS conversion error: {e}")
            raise handle_external_service_error("OpenAI TTS", e, "text-to-speech conversion")
    
    async def _process_audio_response(self, response) -> bytes:
        """音声レスポンスをバイトデータに変換"""
        audio_content = b''
        
        if hasattr(response.content, '__aiter__'):
            # ストリーミングレスポンスの場合
            async for chunk in response.content.aiter_bytes():
                audio_content += chunk
            self.logger.info("Audio content read from async stream")
        elif isinstance(response.content, bytes):
            # 直接バイトデータの場合
            audio_content = response.content
            self.logger.info("Audio content is already bytes")
        else:
            raise TypeError(f"Unexpected response content type: {type(response.content)}")
        
        self.logger.info(f"Audio content size: {len(audio_content)} bytes")
        return audio_content
    
    def _get_audio_duration(self, audio_content: bytes) -> int:
        """音声データから長さ（秒）を取得"""
        try:
            audio_stream = io.BytesIO(audio_content)
            audio_info = MP3(audio_stream)
            duration = int(audio_info.info.length)
            self.logger.info(f"Audio duration: {duration} seconds")
            return duration
        except Exception as e:
            self.logger.warning(f"Could not determine audio duration: {e}, defaulting to 0")
            return 0
    
    async def _store_audio(self, audio_content: bytes, filename: str) -> str:
        """音声データをストレージに保存（S3優先、ローカルフォールバック）"""
        try:
            # S3アップロード試行
            public_url = await upload_to_s3(audio_content, filename)
            self.logger.info(f"Audio uploaded to S3: {public_url}")
            return public_url
            
        except Exception as s3_error:
            # ローカルストレージにフォールバック
            self.logger.warning(f"S3 upload failed, using local storage: {s3_error}")
            return await self._save_audio_locally(audio_content, filename)
    
    async def _save_audio_locally(self, audio_content: bytes, filename: str) -> str:
        """音声データをローカルストレージに保存"""
        try:
            # オーディオディレクトリの作成
            AUDIO_STORAGE_PATH.mkdir(exist_ok=True)
            
            # ファイル書き込み
            audio_path = AUDIO_STORAGE_PATH / filename
            with open(audio_path, 'wb') as f:
                f.write(audio_content)
            
            # ローカルURLを返却（公開ベースURLに依存）
            public_url = f"{SERVER_PUBLIC_BASE_URL.rstrip('/')}/audio/{filename}"
            self.logger.info(f"Audio saved locally: {public_url}")
            
            return public_url
            
        except Exception as e:
            self.logger.error(f"Local audio storage failed: {e}")
            raise


# シングルトンインスタンス
tts_service = TTSService()


# 後方互換性のための関数エイリアス
async def convert_text_to_speech(text: str, voice_name: str = "alloy") -> Dict[str, Any]:
    """
    後方互換性のためのエイリアス関数
    既存コードからの呼び出しをサポート
    """
    return await tts_service.convert_text_to_speech(text, voice_name)


async def convert_text_to_speech_fast(
    text: str,
    voice_language: str = "en",
    voice_name: str = "alloy"
) -> Dict[str, Any]:
    """
    UnifiedAudioServiceからの呼び出し用エイリアス
    voice_language パラメータは互換性のため受け取るが内部では使用しない
    """
    return await tts_service.convert_text_to_speech(
        text=text,
        voice_name=voice_name,
        model="tts-1"  # fastバージョンなので高速モデル使用
    )
