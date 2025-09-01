"""
SchedulePick Scheduler Service
自動音声生成のスケジュール管理とバックグラウンドタスク実行
"""

import logging
from datetime import datetime, time, timedelta
from typing import List, Optional, Dict, Any
import asyncio
from pymongo.database import Database

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.jobstores.mongodb import MongoDBJobStore
    from apscheduler.jobstores.memory import MemoryJobStore
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.executors.asyncio import AsyncIOExecutor
    APScheduler_available = True
except ImportError:
    APScheduler_available = False
    logging.warning("APScheduler not available. Install with: pip install apscheduler")

from models.schedule import (
    Schedule, ScheduledPlaylist, ScheduleStatus, DayOfWeek
)
from services.unified_audio_service import (
    UnifiedAudioService,
    AudioGenerationMode,
    AudioGenerationRequest
)

logger = logging.getLogger(__name__)

class SchedulerService:
    """SchedulePick自動実行管理サービス"""
    
    def __init__(self, db: Database, audio_service: UnifiedAudioService):
        self.db = db
        self.audio_service = audio_service
        self.scheduler: Optional[AsyncIOScheduler] = None
        
        if not APScheduler_available:
            logger.warning("📅 SCHEDULER: APScheduler not available - schedule features disabled")
            return
        
        # Configure scheduler with MongoDB jobstore
        jobstores = {
            'default': MemoryJobStore(),  # Use memory for simplicity in development
            # 'mongodb': MongoDBJobStore(host='localhost', port=27017)  # For production
        }
        
        executors = {
            'default': AsyncIOExecutor(),
        }
        
        job_defaults = {
            'coalesce': False,
            'max_instances': 3,
            'misfire_grace_time': 30
        }
        
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Tokyo'
        )
        
        logger.info("📅 SCHEDULER: Initialized with AsyncIOScheduler")
    
    async def start_scheduler(self):
        """スケジューラーサービス開始"""
        if not self.scheduler:
            logger.warning("📅 SCHEDULER: Cannot start - APScheduler not available")
            return
        
        try:
            self.scheduler.start()
            
            # Add periodic job to check for due schedules
            self.scheduler.add_job(
                self._check_due_schedules,
                'interval',
                minutes=5,  # Check every 5 minutes
                id='check_due_schedules',
                replace_existing=True,
                name='Check Due Schedules'
            )
            
            logger.info("📅 SCHEDULER: Started successfully - checking schedules every 5 minutes")
            
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Failed to start: {str(e)}")
    
    async def stop_scheduler(self):
        """スケジューラーサービス停止"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("📅 SCHEDULER: Stopped successfully")
    
    async def add_schedule_job(self, schedule: Schedule):
        """新規スケジュールのジョブ登録"""
        if not self.scheduler:
            logger.warning("📅 SCHEDULER: Cannot add job - APScheduler not available")
            return
        
        try:
            # Parse time string (HH:MM format)
            hour, minute = map(int, schedule.generation_time.split(':'))
            
            # Convert DayOfWeek enum to cron weekdays (0=Monday)
            weekdays = []
            day_mapping = {
                DayOfWeek.MONDAY: 0,
                DayOfWeek.TUESDAY: 1,
                DayOfWeek.WEDNESDAY: 2,
                DayOfWeek.THURSDAY: 3,
                DayOfWeek.FRIDAY: 4,
                DayOfWeek.SATURDAY: 5,
                DayOfWeek.SUNDAY: 6
            }
            
            for day in schedule.generation_days:
                if day in day_mapping:
                    weekdays.append(day_mapping[day])
            
            # Create cron trigger
            trigger = CronTrigger(
                day_of_week=','.join(map(str, weekdays)),
                hour=hour,
                minute=minute,
                timezone='Asia/Tokyo'
            )
            
            # Add job to scheduler
            self.scheduler.add_job(
                self._execute_schedule,
                trigger,
                args=[schedule.id],
                id=f'schedule_{schedule.id}',
                replace_existing=True,
                name=f'Schedule: {schedule.schedule_name}',
                coalesce=True,
                max_instances=1
            )
            
            logger.info(f"📅 SCHEDULER: Added job for schedule {schedule.id} - {schedule.schedule_name}")
            
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Failed to add job for schedule {schedule.id}: {str(e)}")
    
    async def remove_schedule_job(self, schedule_id: str):
        """スケジュールジョブの削除"""
        if not self.scheduler:
            logger.warning("📅 SCHEDULER: Cannot remove job - APScheduler not available")
            return
        
        try:
            job_id = f'schedule_{schedule_id}'
            self.scheduler.remove_job(job_id)
            logger.info(f"📅 SCHEDULER: Removed job for schedule {schedule_id}")
            
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Failed to remove job for schedule {schedule_id}: {str(e)}")
    
    async def update_schedule_job(self, schedule: Schedule):
        """スケジュールジョブの更新"""
        await self.remove_schedule_job(schedule.id)
        if schedule.status == ScheduleStatus.ACTIVE:
            await self.add_schedule_job(schedule)
    
    async def _check_due_schedules(self):
        """期限到来スケジュールのチェック（5分間隔実行）"""
        try:
            now = datetime.now()
            logger.info(f"📅 SCHEDULER: Checking due schedules at {now}")
            
            # Get all active schedules
            schedules_cursor = self.db.schedules.find({"status": ScheduleStatus.ACTIVE})
            schedules = await schedules_cursor.to_list(length=None)
            
            logger.info(f"📅 SCHEDULER: Found {len(schedules)} active schedules")
            
            for schedule_dict in schedules:
                try:
                    schedule = Schedule(**schedule_dict)
                    
                    # Check if it's time to generate
                    if await self._is_schedule_due(schedule, now):
                        await self._execute_schedule(schedule.id)
                        
                except Exception as e:
                    logger.error(f"🚫 SCHEDULER: Error processing schedule {schedule_dict.get('id', 'unknown')}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Error in _check_due_schedules: {str(e)}")
    
    async def _is_schedule_due(self, schedule: Schedule, current_time: datetime) -> bool:
        """スケジュールが実行タイミングかどうか判定"""
        try:
            # Parse schedule time
            hour, minute = map(int, schedule.generation_time.split(':'))
            schedule_time = time(hour, minute)
            
            # Check if current day is in generation_days
            current_weekday = current_time.weekday()  # 0=Monday
            day_mapping = {
                0: DayOfWeek.MONDAY,
                1: DayOfWeek.TUESDAY,
                2: DayOfWeek.WEDNESDAY,
                3: DayOfWeek.THURSDAY,
                4: DayOfWeek.FRIDAY,
                5: DayOfWeek.SATURDAY,
                6: DayOfWeek.SUNDAY
            }
            
            current_day = day_mapping.get(current_weekday)
            if current_day not in schedule.generation_days:
                return False
            
            # Check if current time matches schedule time (within 5 minute window)
            current_time_only = current_time.time()
            
            # Create datetime objects for comparison
            today = current_time.date()
            schedule_datetime = datetime.combine(today, schedule_time)
            
            # Check if we're within 5 minutes of schedule time
            time_diff = abs((current_time - schedule_datetime).total_seconds())
            
            if time_diff <= 300:  # 5 minutes = 300 seconds
                # Check if we already generated today
                if schedule.last_generated_at:
                    last_gen_date = schedule.last_generated_at.date()
                    if last_gen_date == today:
                        return False  # Already generated today
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Error checking if schedule due: {str(e)}")
            return False
    
    async def _execute_schedule(self, schedule_id: str):
        """スケジュール実行（音声生成）"""
        try:
            logger.info(f"📅 SCHEDULER: Executing schedule {schedule_id}")
            
            # Get schedule from database
            schedule_dict = await self.db.schedules.find_one({"id": schedule_id})
            if not schedule_dict:
                logger.error(f"🚫 SCHEDULER: Schedule {schedule_id} not found")
                return
            
            schedule = Schedule(**schedule_dict)
            
            # Check if schedule is still active
            if schedule.status != ScheduleStatus.ACTIVE:
                logger.info(f"📅 SCHEDULER: Schedule {schedule_id} is not active, skipping")
                return
            
            # Get user plan
            user = await self.db.users.find_one({"id": schedule.user_id})
            if not user:
                logger.error(f"🚫 SCHEDULER: User {schedule.user_id} not found for schedule {schedule_id}")
                return
            
            user_plan = "free"  # Default plan - could be enhanced to check subscription
            
            # Create unified request based on schedule preferences
            preferences = schedule.preferences
            unified_request = AudioGenerationRequest(
                article_ids=None,  # SchedulePick uses automatic selection
                max_articles=preferences.max_articles,
                voice_language=preferences.voice_language,
                voice_name=preferences.voice_name,
                prompt_style=preferences.prompt_style,
                custom_prompt=preferences.custom_prompt,
                user_plan=user_plan
            )
            
            # Generate audio using unified service
            result = await self.audio_service.generate_audio(
                request=unified_request,
                user_id=schedule.user_id,
                mode=AudioGenerationMode.AUTO_PICK  # SchedulePick uses AutoPick logic
            )
            
            # Create scheduled playlist record
            scheduled_playlist = ScheduledPlaylist(
                schedule_id=schedule.id,
                user_id=schedule.user_id,
                playlist_title=f"{schedule.schedule_name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                audio_url=result.audio_url,
                duration=result.duration,
                script=result.script,
                articles=result.article_ids or [],
                articles_count=result.articles_count,
                chapters=result.chapters or []
            )
            
            # Save to database
            await self.db.scheduled_playlists.insert_one(scheduled_playlist.dict())
            
            # Update schedule's last generation info
            await self.db.schedules.update_one(
                {"id": schedule_id},
                {
                    "$set": {
                        "last_generated_at": datetime.utcnow(),
                        "last_generated_playlist_id": scheduled_playlist.id
                    }
                }
            )
            
            logger.info(f"📅 SCHEDULER: Successfully executed schedule {schedule_id} - generated {result.articles_count} articles")
            
            # TODO: Send notification to user
            await self._send_schedule_notification(schedule, scheduled_playlist)
            
        except Exception as e:
            logger.error(f"🚫 SCHEDULER: Failed to execute schedule {schedule_id}: {str(e)}")
    
    async def _send_schedule_notification(self, schedule: Schedule, playlist: ScheduledPlaylist):
        """スケジュール生成通知送信（プレースホルダー）"""
        try:
            # TODO: Implement push notification system
            logger.info(f"📅 NOTIFICATION: Would send notification for schedule '{schedule.schedule_name}' to user {schedule.user_id}")
            logger.info(f"📅 NOTIFICATION: Generated playlist: {playlist.playlist_title} ({playlist.articles_count} articles)")
            
        except Exception as e:
            logger.error(f"🚫 NOTIFICATION: Failed to send notification: {str(e)}")
    
    async def get_scheduler_status(self) -> Dict[str, Any]:
        """スケジューラーの状態取得"""
        if not self.scheduler:
            return {
                "running": False,
                "available": False,
                "reason": "APScheduler not available"
            }
        
        jobs = []
        if self.scheduler.running:
            for job in self.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
        
        return {
            "running": self.scheduler.running,
            "available": True,
            "jobs_count": len(jobs),
            "jobs": jobs
        }

# Singleton scheduler service instance
_scheduler_service: Optional[SchedulerService] = None

def create_scheduler_service(db: Database, audio_service: UnifiedAudioService) -> SchedulerService:
    """スケジューラーサービス生成"""
    global _scheduler_service
    
    if _scheduler_service is None:
        _scheduler_service = SchedulerService(db, audio_service)
    
    return _scheduler_service

def get_scheduler_service() -> Optional[SchedulerService]:
    """スケジューラーサービス取得"""
    return _scheduler_service