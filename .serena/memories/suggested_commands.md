# Suggested Development Commands

## Project Startup Commands

### Backend Server (Required First)
```bash
# Start backend server with network access
./start-dev-fixed.sh
# Backend runs on: http://192.168.11.30:8003
# Logs to: logs/dev-backend.log and logs/dev-backend.error.log
```

### Frontend Development (Choose One)
```bash
# Option 1: Main active frontend (audion-app)
cd audion-app
npm install  # (first time only)
npx expo start

# Option 2: Modern architecture frontend (audion-app-fresh) 
cd audion-app-fresh
npx expo start --port 8084
```

## Development Workflow Commands

### Frontend (React Native)
```bash
cd audion-app
npm run start          # Start Expo dev server
npm run android        # Start with Android emulator
npm run ios           # Start with iOS simulator  
npm run web           # Start web version
npm run lint          # Run ESLint
npm run typecheck     # TypeScript type checking
npm run format        # Prettier formatting
npm test              # Run Jest tests
```

### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv                      # Create virtual environment (first time)
source venv/bin/activate                 # Activate virtual environment (macOS/Linux)
pip install -r requirements.txt         # Install dependencies (first time)
uvicorn server:app --reload --port 8003 --host 0.0.0.0  # Start development server
```

## Testing & Quality Commands

### API Testing
```bash
# Comprehensive API test suite
python backend_test.py

# Individual API tests
python test_login.py
python test_articles_api.py
python test_audio_generation.py
python test_autopick_generation.py

# Health check
curl http://192.168.11.30:8003/api/health
```

### Code Quality (Backend)
```bash
cd backend
python -m pytest tests/     # Run unit tests
python -m mypy .            # Type checking
python -m black .           # Code formatting
python -m isort .           # Import sorting
python -m flake8 .          # Linting
```

## Database & Utility Commands

### Database Operations
```bash
# Debug database connection
python test_db_connection.py

# Clear authentication cache
node clear_auth.js

# Clear application cache
node clear_cache.js
```

### Environment Management
```bash
# Check environment variables
cat backend/.env            # Backend config
cat audion-app/.env         # Frontend config

# Monitor server processes
python monitor_server.py    # Server monitoring utility
```

## System Utilities (macOS)

### Common macOS Commands
```bash
# File operations
ls -la                      # List files with details
find . -name "*.py"         # Find Python files
grep -r "pattern" .         # Search for patterns
cd path/to/directory        # Change directory

# Process management  
lsof -ti:8003               # Find processes on port 8003
kill -9 PID                 # Kill process by PID
ps aux | grep python        # Find Python processes

# Network
curl -X GET http://url      # HTTP requests
netstat -an | grep 8003     # Check port usage
```

### Development Environment Reset
```bash
# Full environment reset
./start-dev-fixed.sh        # Restart backend
cd audion-app && npx expo start  # Restart frontend

# Clean restart (if issues occur)
pkill -f uvicorn            # Kill backend processes
pkill -f expo               # Kill frontend processes
./start-dev-fixed.sh        # Fresh start
```