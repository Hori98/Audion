# Suggested Development Commands

## Backend Development
```bash
# Setup
python -m venv venv                    # Create virtual environment
source venv/bin/activate               # Activate virtual environment (macOS/Linux)
pip install -r backend/requirements.txt # Install dependencies

# Development Server
cd backend
uvicorn server:app --reload --port 8001 # Start development server with auto-reload

# Testing
python backend_test.py                 # Run comprehensive API integration tests
```

## Frontend - React Native (Primary)
```bash
# Setup
cd audion-app
npm install                           # Install dependencies

# Development
npx expo start                        # Start development server
npx expo start --android             # Start with Android emulator
npx expo start --ios                 # Start with iOS simulator
npx expo start --web                 # Start web version

# Quality Assurance
npm run lint                          # Run ESLint
```

## Frontend - Web (Secondary)
```bash
# Setup
npm install                           # Install dependencies in root

# Development
npm run dev                           # Start Vite development server

# Build
npm run build                         # Build for production
```

## Environment Setup
```bash
# Backend environment
cp .env.example .env                  # Copy environment template
# Edit .env with:
# - MONGO_URL (MongoDB connection)
# - OPENAI_API_KEY (for AI features)
# - GOOGLE_TTS_KEY (for audio generation)

# Frontend environment (if using web)
cp .env.example .env                  # Set VITE_API_URL
```

## Database Commands
```bash
# MongoDB should be running locally or use cloud connection
# No specific setup commands needed - app creates collections automatically
```

## Testing Workflow
```bash
# 1. Start backend server
cd backend && uvicorn server:app --reload --port 8001

# 2. Run comprehensive tests
python backend_test.py

# 3. For frontend testing, start the app and test manually
cd audion-app && npx expo start
```

## Useful System Commands (Darwin/macOS)
```bash
# File operations
ls -la                               # List files with details
find . -name "*.py" -type f          # Find Python files
grep -r "pattern" .                  # Search for patterns
cd /path/to/directory                # Change directory

# Process management
ps aux | grep python                 # Find Python processes
kill -9 <pid>                        # Kill process by ID
lsof -i :8001                        # Check what's using port 8001

# Git operations
git status                           # Check working tree status
git add .                            # Stage all changes
git commit -m "message"              # Commit changes
git log --oneline                    # View commit history
```