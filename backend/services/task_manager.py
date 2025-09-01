"""
Task Manager for AutoPick Progress Tracking
Supports real-time status monitoring with Server-Sent Events (SSE)
"""
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, AsyncGenerator
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import uuid
import logging

class TaskStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskManager:
    def __init__(self):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._task_locks: Dict[str, asyncio.Lock] = {}
    
    def create_task(self, task_type: str = "autopick", user_id: str = None) -> str:
        """Create a new task and return task ID"""
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = {
            "id": task_id,
            "type": task_type,
            "user_id": user_id,
            "status": TaskStatus.PENDING,
            "progress": 0,
            "message": "タスクを開始しています...",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": None,
            "error": None,
            "debug_info": {}
        }
        self._task_locks[task_id] = asyncio.Lock()
        logging.info(f"📊 [TASK_MANAGER] Created task {task_id} for user {user_id}")
        return task_id
    
    async def update_task(self, task_id: str, **updates):
        """Update task status, progress, message etc."""
        if task_id not in self._tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        async with self._task_locks[task_id]:
            self._tasks[task_id].update(updates)
            self._tasks[task_id]["updated_at"] = datetime.utcnow().isoformat()
            logging.debug(f"📊 [TASK_MANAGER] Updated task {task_id}: {updates}")
    
    def get_task(self, task_id: str) -> Dict[str, Any]:
        """Get task status"""
        if task_id not in self._tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        return self._tasks[task_id].copy()
    
    async def complete_task(self, task_id: str, result: Any = None, debug_info: Dict = None):
        """Mark task as completed with result"""
        await self.update_task(
            task_id,
            status=TaskStatus.COMPLETED,
            progress=100,
            message="完了しました",
            result=result,
            debug_info=debug_info or {}
        )
    
    async def fail_task(self, task_id: str, error: str, debug_info: Dict = None):
        """Mark task as failed with error"""
        await self.update_task(
            task_id,
            status=TaskStatus.FAILED,
            message=f"エラーが発生しました: {error}",
            error=error,
            debug_info=debug_info or {}
        )
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old completed/failed tasks"""
        current_time = datetime.utcnow()
        tasks_to_remove = []
        
        for task_id, task in self._tasks.items():
            task_time = datetime.fromisoformat(task["updated_at"])
            age_hours = (current_time - task_time).total_seconds() / 3600
            
            if age_hours > max_age_hours and task["status"] in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self._tasks[task_id]
            del self._task_locks[task_id]
            logging.info(f"📊 [TASK_MANAGER] Cleaned up old task {task_id}")
    
    async def stream_task_progress(self, task_id: str) -> AsyncGenerator[str, None]:
        """Generator for SSE streaming of task progress"""
        if task_id not in self._tasks:
            yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
            return
        
        last_update_time = None
        
        while True:
            task = self.get_task(task_id)
            current_update_time = task["updated_at"]
            
            # Only send update if task has been modified
            if last_update_time != current_update_time:
                # Format SSE data
                sse_data = {
                    "task_id": task_id,
                    "status": task["status"],
                    "progress": task["progress"],
                    "message": task["message"],
                    "updated_at": current_update_time
                }
                
                # Include result and debug info when completed
                if task["status"] == TaskStatus.COMPLETED:
                    sse_data["result"] = task["result"]
                    sse_data["debug_info"] = task["debug_info"]
                elif task["status"] == TaskStatus.FAILED:
                    sse_data["error"] = task["error"]
                    sse_data["debug_info"] = task["debug_info"]
                
                yield f"data: {json.dumps(sse_data)}\n\n"
                last_update_time = current_update_time
                
                # Break the stream when task is completed or failed
                if task["status"] in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    break
            
            # Polling interval
            await asyncio.sleep(0.5)  # 500ms intervals for responsive updates

# Global instance
task_manager = TaskManager()

def get_task_manager() -> TaskManager:
    """Dependency injection for FastAPI"""
    return task_manager