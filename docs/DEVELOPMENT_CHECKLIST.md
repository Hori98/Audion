# Development Completion Checklist

This checklist ensures code quality, testing, and documentation standards are met for all changes.

## Backend Changes Checklist

### 1. Code Quality
- [ ] Run `flake8` for linting (if available)
- [ ] Run `black` for code formatting (if available)
- [ ] Run `mypy` for type checking (if available)
- [ ] Verify async/await patterns are used correctly
- [ ] No hardcoded credentials or sensitive information

### 2. Testing
- [ ] Run `python backend_test.py` - all tests pass
- [ ] Verify authentication flows work correctly
- [ ] Test RSS feed processing and AI integration
- [ ] Check database operations (CRUD)
- [ ] Test error scenarios (invalid input, network errors, etc.)

### 3. Server Verification
- [ ] Backend starts without errors: `uvicorn server:app --reload --port 8001`
- [ ] Check logs for any warnings or errors
- [ ] Verify all environment variables are properly set
- [ ] API endpoints respond with expected status codes and data formats

### 4. Documentation
- [ ] Update CLAUDE.md if new endpoints or patterns are introduced
- [ ] Document API changes and parameters
- [ ] Add docstrings to new functions

## Frontend (React Native - audion-app-fresh) Changes Checklist

### 1. Code Quality
- [ ] Run TypeScript check: `npx tsc --noEmit` - no errors
- [ ] Run ESLint: `npm run lint` - no errors or warnings (if available)
- [ ] Component imports are correct and modules exist
- [ ] No console.error or console.warn in production code
- [ ] Proper TypeScript typing throughout

### 2. Component Implementation
- [ ] All components accept proper props with TypeScript interfaces
- [ ] Components handle loading states correctly
- [ ] Components handle error states
- [ ] Components handle empty states (no data)
- [ ] Navigation props are typed correctly with useRouter()

### 3. State Management
- [ ] useState hooks are used correctly
- [ ] useEffect dependencies are complete
- [ ] No infinite loops in effect chains
- [ ] Context providers are properly wrapped around components

### 4. Testing
- [ ] Expo development server starts: `npx expo start --clear --tunnel`
- [ ] No runtime errors in console
- [ ] Navigation flows work correctly
- [ ] API integration tests pass
- [ ] Test on multiple platforms (iOS/Android/Web if applicable)

### 5. Build Verification
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] No module resolution errors
- [ ] All imports are valid

## Specific to SectionPlaceholder Integration

### Component Verification
- [ ] SectionPlaceholder is imported at Line 62 in index.tsx
- [ ] Component uses COLORS and SPACING from commonStyles
- [ ] SectionPlaceholder props are correct (message, lines, insetHorizontal)
- [ ] SectionPlaceholder styling matches the design system

### Section Integration
- [ ] Each section uses 3-state pattern (loading, data, empty)
- [ ] Loading state shows SectionPlaceholder with appropriate message
- [ ] Empty state shows meaningful message (lines=0)
- [ ] Data state shows actual carousel/grid component
- [ ] Section dividers work correctly with UI_FLAGS

### Implemented Sections Status (✅ All Complete)
- [ ] Hero section: SectionPlaceholder integrated (lines=2)
- [ ] Breaking section: SectionPlaceholder integrated (lines=1)
- [ ] Trending section: SectionPlaceholder integrated (lines=1)
- [ ] Personalized section: SectionPlaceholder integrated (lines=1)
- [ ] Audio section: Loading state handled (built-in)

## Frontend (Web - src) Changes Checklist

### 1. Code Quality
- [ ] Tailwind CSS classes are used correctly
- [ ] React hooks are used appropriately
- [ ] Props are properly typed with TypeScript or PropTypes
- [ ] No unused imports or variables

### 2. Responsive Design
- [ ] Responsive breakpoints are implemented
- [ ] Mobile view is tested and looks correct
- [ ] Desktop view is tested and looks correct
- [ ] Touch interactions work on mobile

### 3. Testing
- [ ] Development server starts: `npm run dev`
- [ ] No console errors in browser DevTools
- [ ] Test in multiple browsers (Chrome, Firefox, Safari)
- [ ] API integration works correctly

### 4. Build Verification
- [ ] Build succeeds: `npm run build`
- [ ] No build warnings or errors
- [ ] Build artifacts are reasonable size
- [ ] Production build can be served

## Database Changes Checklist

### 1. Schema Validation
- [ ] MongoDB collections are created correctly
- [ ] Indexes are properly set up
- [ ] Database queries and operations work
- [ ] No migration errors

### 2. Data Integrity
- [ ] Relationships between documents are maintained
- [ ] User data isolation is enforced (users only see their own data)
- [ ] No orphaned documents after deletions
- [ ] Backup strategy tested if applicable

## Integration Testing Checklist

### 1. Full User Flow
- [ ] Register new user → Login works
- [ ] Add RSS source → Fetches correctly
- [ ] Fetch articles → Articles display correctly
- [ ] Create audio → Audio generation works
- [ ] Play audio → Audio plays correctly
- [ ] Manage library → Save/delete works
- [ ] Auto-pick functionality works end-to-end

### 2. Error Scenarios
- [ ] Invalid credentials show proper error messages
- [ ] Network errors are handled gracefully
- [ ] Empty states display correctly
- [ ] Loading states display appropriately

### 3. AI Integration
- [ ] Test with demo API keys (falls back to mock responses)
- [ ] Test with real API keys (if available)
- [ ] Script generation has proper conversational format
- [ ] Text-to-speech generation works

## Git and Documentation Checklist

### 1. Code Review
- [ ] `git status` shows only intended changes
- [ ] `git diff` clearly shows what was changed and why
- [ ] No sensitive information in commits (API keys, passwords)
- [ ] Commit messages are clear and descriptive

### 2. Documentation
- [ ] CLAUDE.md updated if new patterns introduced
- [ ] README.md updated if user-facing changes
- [ ] API documentation updated for new endpoints
- [ ] Code comments explain complex logic
- [ ] Inline documentation is current

### 3. Branch Management
- [ ] Working on `main` branch (unified strategy)
- [ ] All commits are pushed to GitHub
- [ ] No stale branches left behind

## Environment Variables Checklist

### Backend
- [ ] All required environment variables documented
- [ ] Demo/example values work for testing
- [ ] API endpoints are configurable
- [ ] Database connection string is set

### Frontend
- [ ] API base URL is configurable via environment
- [ ] Feature flags are set appropriately (UI_FLAGS)
- [ ] API timeout is set (EXPO_PUBLIC_API_TIMEOUT)
- [ ] Debug mode can be toggled if needed

## Critical Commands Reference

### Must Run After Any Backend Change
```bash
python backend_test.py              # Must pass all tests
uvicorn server:app --reload --port 8001  # Must start without errors
```

### Must Run After Any Frontend (React Native) Change
```bash
cd audion-app-fresh
npx tsc --noEmit                    # Must pass with no errors
npx expo start --clear --tunnel     # Must start without errors
```

### Must Run After Any Frontend (Web) Change
```bash
npm run build                       # Must build successfully
npm run dev                         # Must start dev server
```

## Render Production Deployment Checklist

### Pre-Deployment (Render Configuration)

#### Environment Setup
- [ ] **MongoDB Atlas**
  - [ ] Database created: audion_atlas_DB
  - [ ] Network access configured for Render IPs
  - [ ] Connection string obtained and verified
  - [ ] Test connection from local machine works

- [ ] **AWS S3 Bucket**
  - [ ] Bucket created: audion-audio-files
  - [ ] Region: ap-southeast-2
  - [ ] IAM user created with S3 permissions
  - [ ] Access keys generated and stored securely
  - [ ] Bucket policy allows public read access

- [ ] **OpenAI API**
  - [ ] API key obtained from platform.openai.com
  - [ ] Billing configured and credits available

#### Render Dashboard Configuration
- [ ] Service created: audion-backend
- [ ] GitHub repository connected
- [ ] Build Command: `pip install -r backend/requirements.txt`
- [ ] Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] Branch set to: `main`
- [ ] Region selected (Oregon recommended for US)
- [ ] Plan tier selected (Starter minimum for production)

#### Environment Variables Set in Render Dashboard
- [ ] PYTHON_VERSION=3.13
- [ ] ENVIRONMENT=production
- [ ] MONGO_URL=`mongodb+srv://...`
- [ ] DB_NAME=audion_atlas_DB
- [ ] JWT_SECRET_KEY=`<strong-random-key>` (generated via: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`)
- [ ] OPENAI_API_KEY=`sk-...`
- [ ] AWS_ACCESS_KEY_ID=`AKIA...`
- [ ] AWS_SECRET_ACCESS_KEY=`...`
- [ ] AWS_REGION=ap-southeast-2
- [ ] S3_BUCKET_NAME=audion-audio-files
- [ ] LOG_LEVEL=INFO

#### Generate Production JWT Secret
```bash
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
# Copy output and paste into Render Dashboard
```

### Deployment Verification

#### Build Success
- [ ] Render build logs show "successfully installed" for all packages
- [ ] No Python version conflicts
- [ ] Build completes in < 5 minutes
- [ ] No error messages in build output

#### Startup Logs
- [ ] "🚀 AUDION BACKEND STARTUP" appears
- [ ] "🔐 JWT_SECRET_KEY configured: True" appears
- [ ] "Connected to MongoDB successfully" appears
- [ ] "Uvicorn running on 0.0.0.0:xxxxx" appears
- [ ] No exceptions or errors in startup output

#### Health Check Endpoints
- [ ] GET `https://audion.onrender.com/health` returns 200 OK
- [ ] Response body: `{"status": "healthy", "database": "connected"}`
- [ ] Render health check shows as "Passing"

#### API Authentication
- [ ] POST `/api/auth/register` works with valid credentials
- [ ] POST `/api/auth/login` returns access token
- [ ] Invalid credentials return 401 error
- [ ] Protected endpoints require valid JWT token
- [ ] Expired tokens return 401 error

#### File Storage (S3)
- [ ] Audio files can be uploaded to S3
- [ ] Files are accessible via public URLs
- [ ] S3 bucket size increases after upload
- [ ] No AWS credential errors in logs

### Frontend Configuration

#### React Native (audion-app-fresh)
- [ ] `.env.development` has: `EXPO_PUBLIC_API_BASE_URL=https://audion.onrender.com`
- [ ] API timeout set to 60000ms
- [ ] Expo app can register new user
- [ ] Expo app can login successfully
- [ ] Expo app can fetch articles
- [ ] Expo app can generate audio
- [ ] No "Network Error - No response from server" messages

#### Web UI (src/)
- [ ] `.env` or config has: `VITE_API_URL=https://audion.onrender.com/api`
- [ ] Web app can login successfully
- [ ] Web app can fetch data from Render backend
- [ ] Web app can generate audio files
- [ ] No CORS errors in browser console

### Production Monitoring

#### Render Metrics
- [ ] CPU usage is stable (< 80%)
- [ ] Memory usage is stable (< 512MB)
- [ ] Restart count is 0
- [ ] HTTP response time is normal (< 2s)
- [ ] Error rate is 0 or very low

#### Database Monitoring
- [ ] MongoDB Atlas shows active connections
- [ ] Query response times are acceptable
- [ ] No slow queries (> 100ms) in logs
- [ ] Connection pool is healthy

#### Storage Monitoring
- [ ] S3 bucket size is as expected
- [ ] Upload success rate is 100%
- [ ] No failed requests in S3 logs

### Post-Deployment Documentation

- [ ] Update README.md with Render production URL
- [ ] Update CLAUDE.md with production deployment info
- [ ] Document any custom configurations
- [ ] Store JWT_SECRET_KEY in secure location (not in code)
- [ ] Document AWS S3 bucket policy
- [ ] Document MongoDB Atlas network access rules

### Troubleshooting Checklist

**If 502 Bad Gateway:**
- [ ] Check Render build logs for errors
- [ ] Verify all environment variables are set
- [ ] Check if database connection string is correct
- [ ] Verify Python dependencies install without errors

**If 401 Errors:**
- [ ] Verify JWT_SECRET_KEY is set in Render Dashboard
- [ ] Check logs for "JWT_SECRET_KEY configured: True"
- [ ] Ensure ENVIRONMENT=production is set

**If S3 Uploads Fail:**
- [ ] Verify AWS credentials are correct
- [ ] Check S3 bucket permissions
- [ ] Verify S3_BUCKET_NAME matches actual bucket
- [ ] Check AWS IAM policy allows S3:PutObject

**If Database Connection Fails:**
- [ ] Verify MONGO_URL format is correct
- [ ] Check MongoDB Atlas network access includes Render IPs
- [ ] Test connection locally with mongosh

---

## Sign-Off

- [ ] All applicable checklist items completed
- [ ] No blockers or known issues remaining
- [ ] Code is ready for production deployment
- [ ] Changes are merged and pushed to main branch
- [ ] Render production backend is verified and working
