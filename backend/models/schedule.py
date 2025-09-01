"""
SchedulePick Data Models
スケジュール管理とユーザー設定に関するPydanticモデル定義
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, time
from enum import Enum
import uuid

class DayOfWeek(str, Enum):
    """曜日列挙型"""
    MONDAY = "monday"
    TUESDAY = "tuesday" 
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class ScheduleStatus(str, Enum):
    """スケジュール状態"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PAUSED = "paused"

class SchedulePreferences(BaseModel):
    """スケジュール設定の詳細設定"""
    max_articles: int = Field(default=5, ge=1, le=20, description="生成記事数上限")
    preferred_genres: Optional[List[str]] = Field(default=None, description="優先ジャンル")
    excluded_genres: Optional[List[str]] = Field(default=None, description="除外ジャンル")
    preferred_sources: Optional[List[str]] = Field(default=None, description="優先RSSソース")
    excluded_sources: Optional[List[str]] = Field(default=None, description="除外RSSソース")
    keywords: Optional[List[str]] = Field(default=None, description="キーワードフィルタ")
    voice_language: str = Field(default="ja-JP", description="音声言語")
    voice_name: str = Field(default="alloy", description="音声名")
    prompt_style: str = Field(default="standard", description="プロンプトスタイル")
    custom_prompt: Optional[str] = Field(default=None, description="カスタムプロンプト")

class Schedule(BaseModel):
    """メインスケジュール情報"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="スケジュールID")
    user_id: str = Field(description="ユーザーID")
    schedule_name: str = Field(min_length=1, max_length=100, description="スケジュール名")
    generation_time: str = Field(description="生成時刻（HH:MM形式）")
    generation_days: List[DayOfWeek] = Field(description="実行曜日")
    timezone: str = Field(default="Asia/Tokyo", description="タイムゾーン")
    status: ScheduleStatus = Field(default=ScheduleStatus.ACTIVE, description="スケジュール状態")
    preferences: SchedulePreferences = Field(default_factory=SchedulePreferences, description="生成設定")
    last_generated_at: Optional[datetime] = Field(default=None, description="最終生成日時")
    last_generated_playlist_id: Optional[str] = Field(default=None, description="最新生成プレイリストID")
    next_generation_at: Optional[datetime] = Field(default=None, description="次回生成予定日時")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="作成日時")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新日時")

class ScheduleCreateRequest(BaseModel):
    """スケジュール作成リクエスト"""
    schedule_name: str = Field(min_length=1, max_length=100, description="スケジュール名")
    generation_time: str = Field(description="生成時刻（HH:MM形式）")
    generation_days: List[DayOfWeek] = Field(description="実行曜日")
    timezone: str = Field(default="Asia/Tokyo", description="タイムゾーン")
    preferences: Optional[SchedulePreferences] = Field(default=None, description="生成設定")

class ScheduleUpdateRequest(BaseModel):
    """スケジュール更新リクエスト"""
    schedule_name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="スケジュール名")
    generation_time: Optional[str] = Field(default=None, description="生成時刻（HH:MM形式）")
    generation_days: Optional[List[DayOfWeek]] = Field(default=None, description="実行曜日")
    timezone: Optional[str] = Field(default=None, description="タイムゾーン")
    status: Optional[ScheduleStatus] = Field(default=None, description="スケジュール状態")
    preferences: Optional[SchedulePreferences] = Field(default=None, description="生成設定")

class ScheduledPlaylist(BaseModel):
    """スケジュール生成プレイリスト"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="プレイリストID")
    schedule_id: str = Field(description="スケジュールID")
    user_id: str = Field(description="ユーザーID")
    playlist_title: str = Field(description="プレイリストタイトル")
    audio_url: Optional[str] = Field(default=None, description="音声ファイルURL")
    duration: Optional[int] = Field(default=None, description="再生時間（秒）")
    script: Optional[str] = Field(default=None, description="生成スクリプト")
    articles: List[str] = Field(description="記事IDリスト")
    articles_count: int = Field(description="記事数")
    chapters: Optional[List[Dict[str, Any]]] = Field(default=[], description="チャプター情報")
    generation_status: str = Field(default="completed", description="生成状況")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="生成日時")
    expires_at: Optional[datetime] = Field(default=None, description="有効期限")

class ScheduleResponse(BaseModel):
    """スケジュールレスポンス"""
    id: str
    schedule_name: str
    generation_time: str
    generation_days: List[DayOfWeek]
    timezone: str
    status: ScheduleStatus
    preferences: SchedulePreferences
    last_generated_at: Optional[datetime]
    last_generated_playlist_id: Optional[str]
    next_generation_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class ScheduledPlaylistResponse(BaseModel):
    """スケジュール生成プレイリストレスポンス"""
    id: str
    schedule_id: str
    playlist_title: str
    audio_url: Optional[str]
    duration: Optional[int]
    script: Optional[str]
    articles_count: int
    chapters: Optional[List[Dict[str, Any]]]
    generation_status: str
    generated_at: datetime
    expires_at: Optional[datetime]

# ユーザー行動追跡モデル（Phase 2での学習機能用）
class UserInteractionType(str, Enum):
    """ユーザー行動タイプ"""
    ARTICLE_STARTED = "article_started"
    ARTICLE_FINISHED = "article_finished"
    ARTICLE_SKIPPED = "article_skipped"
    ARTICLE_SAVED = "article_saved"
    PLAYLIST_STARTED = "playlist_started"
    PLAYLIST_FINISHED = "playlist_finished"
    PLAYLIST_SKIPPED = "playlist_skipped"

class UserInteraction(BaseModel):
    """ユーザー行動追跡"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="行動ID")
    user_id: str = Field(description="ユーザーID")
    interaction_type: UserInteractionType = Field(description="行動タイプ")
    article_id: Optional[str] = Field(default=None, description="記事ID")
    playlist_id: Optional[str] = Field(default=None, description="プレイリストID")
    source_name: Optional[str] = Field(default=None, description="ソース名")
    genre: Optional[str] = Field(default=None, description="ジャンル")
    duration: Optional[int] = Field(default=None, description="再生時間（秒）")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="行動日時")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="追加メタデータ")