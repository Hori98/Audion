#!/bin/bash
echo "Starting user server on port 8000..."
cd backend
source venv/bin/activate
export PORT=8000
python server.py