#!/usr/bin/env python3
"""
SchedulePick API Test Script
スケジュール機能のAPIをテストするスクリプト
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

# Test configuration
API_BASE_URL = "http://192.168.11.34:8003/api/v2/audio"
TEST_USER_TOKEN = "8135236f-38cd-4cd8-b67f-2972db82ef94"  # テスト用ユーザートークン

class ScheduleAPITester:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_scheduler_status(self):
        """スケジューラーサービス状態確認テスト"""
        print("🔍 Testing scheduler status...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/scheduler/status",
                headers=self.headers
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Response: {json.dumps(result, indent=2)}")
                return response.status == 200
        except Exception as e:
            print(f"❌ Error testing scheduler status: {e}")
            return False
    
    async def test_create_schedule(self):
        """スケジュール作成テスト"""
        print("\n📅 Testing schedule creation...")
        
        # Create a test schedule for tomorrow morning
        tomorrow = datetime.now() + timedelta(days=1)
        schedule_data = {
            "schedule_name": "テスト朝のニュース",
            "generation_time": "07:00",
            "generation_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "timezone": "Asia/Tokyo",
            "preferences": {
                "max_articles": 3,
                "voice_language": "ja-JP",
                "voice_name": "alloy",
                "prompt_style": "standard",
                "preferred_genres": ["technology", "business"]
            }
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/schedules",
                headers=self.headers,
                json=schedule_data
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Response: {json.dumps(result, indent=2)}")
                
                if response.status == 200:
                    schedule_id = result.get('id')
                    print(f"✅ Created schedule: {schedule_id}")
                    return schedule_id
                else:
                    print(f"❌ Failed to create schedule: {result}")
                    return None
        except Exception as e:
            print(f"❌ Error creating schedule: {e}")
            return None
    
    async def test_get_schedules(self):
        """スケジュール一覧取得テスト"""
        print("\n📋 Testing get schedules...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/schedules",
                headers=self.headers
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Found {len(result) if isinstance(result, list) else 0} schedules")
                if isinstance(result, list) and result:
                    print(f"First schedule: {json.dumps(result[0], indent=2)}")
                return response.status == 200
        except Exception as e:
            print(f"❌ Error getting schedules: {e}")
            return False
    
    async def test_manual_trigger(self, schedule_id: str):
        """手動スケジュール実行テスト"""
        print(f"\n🚀 Testing manual trigger for schedule {schedule_id}...")
        
        try:
            async with self.session.post(
                f"{self.base_url}/schedules/{schedule_id}/generate",
                headers=self.headers
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Response: {json.dumps(result, indent=2)}")
                
                if response.status == 200:
                    print(f"✅ Generated audio: {result.get('audio_url', 'No URL')}")
                    print(f"✅ Articles: {result.get('articles_count', 0)} articles")
                    print(f"✅ Duration: {result.get('duration', 0)} seconds")
                    return True
                else:
                    print(f"❌ Failed to trigger schedule: {result}")
                    return False
        except Exception as e:
            print(f"❌ Error triggering schedule: {e}")
            return False
    
    async def test_get_schedule_playlists(self, schedule_id: str):
        """スケジュール生成プレイリスト取得テスト"""
        print(f"\n🎵 Testing get schedule playlists for {schedule_id}...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/schedules/{schedule_id}/playlists",
                headers=self.headers
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Found {len(result) if isinstance(result, list) else 0} playlists")
                if isinstance(result, list) and result:
                    print(f"Latest playlist: {json.dumps(result[0], indent=2)}")
                return response.status == 200
        except Exception as e:
            print(f"❌ Error getting schedule playlists: {e}")
            return False
    
    async def test_delete_schedule(self, schedule_id: str):
        """スケジュール削除テスト"""
        print(f"\n🗑️ Testing delete schedule {schedule_id}...")
        
        try:
            async with self.session.delete(
                f"{self.base_url}/schedules/{schedule_id}",
                headers=self.headers
            ) as response:
                result = await response.json()
                print(f"Status: {response.status}")
                print(f"Response: {json.dumps(result, indent=2)}")
                return response.status == 200
        except Exception as e:
            print(f"❌ Error deleting schedule: {e}")
            return False
    
    async def run_all_tests(self):
        """全テスト実行"""
        print("🧪 Starting SchedulePick API Tests\n")
        
        results = []
        
        # Test 1: Scheduler status
        results.append(await self.test_scheduler_status())
        
        # Test 2: Create schedule
        schedule_id = await self.test_create_schedule()
        if schedule_id:
            results.append(True)
            
            # Test 3: Get schedules
            results.append(await self.test_get_schedules())
            
            # Test 4: Manual trigger (this will actually generate audio)
            results.append(await self.test_manual_trigger(schedule_id))
            
            # Test 5: Get schedule playlists
            results.append(await self.test_get_schedule_playlists(schedule_id))
            
            # Test 6: Delete schedule
            results.append(await self.test_delete_schedule(schedule_id))
        else:
            results.append(False)
        
        # Summary
        passed = sum(results)
        total = len(results)
        print(f"\n📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("✅ All tests passed! SchedulePick API is working correctly.")
        else:
            print("❌ Some tests failed. Check the output above for details.")
        
        return passed == total

async def main():
    """メイン実行関数"""
    async with ScheduleAPITester(API_BASE_URL, TEST_USER_TOKEN) as tester:
        success = await tester.run_all_tests()
        return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)