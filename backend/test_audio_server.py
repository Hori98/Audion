#!/usr/bin/env python3
"""
Simple test script to verify audio file serving works correctly
"""
import requests
import sys
import os
from pathlib import Path

def test_audio_server(port=8003):
    """Test if audio files are served correctly"""
    base_url = f"http://localhost:{port}"
    
    print(f"Testing audio server on port {port}...")
    
    # Test health endpoint
    try:
        health_response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {health_response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test sample audio file
    sample_audio_url = f"{base_url}/audio/SampleAudio_0.4mb.mp3"
    try:
        audio_response = requests.head(sample_audio_url, timeout=5)
        print(f"✅ Sample audio accessible: {audio_response.status_code}")
        if audio_response.status_code == 200:
            print(f"   Content-Type: {audio_response.headers.get('content-type', 'unknown')}")
            print(f"   Content-Length: {audio_response.headers.get('content-length', 'unknown')} bytes")
        return True
    except Exception as e:
        print(f"❌ Sample audio failed: {e}")
        return False

if __name__ == "__main__":
    # Check if server port is provided
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8003
    
    # Check if audio file exists locally
    audio_dir = Path(__file__).parent.parent / "audio_files" 
    sample_file = audio_dir / "SampleAudio_0.4mb.mp3"
    
    print(f"Audio directory: {audio_dir}")
    print(f"Sample file exists: {sample_file.exists()}")
    
    if sample_file.exists():
        print(f"Sample file size: {sample_file.stat().st_size} bytes")
    
    success = test_audio_server(port)
    sys.exit(0 if success else 1)