# Task Completion Checklist

## When a Development Task is Completed

### Backend Changes
1. **Code Quality**:
   - Run `flake8` for linting (if available)
   - Run `black` for code formatting (if available)
   - Run `mypy` for type checking (if available)
   - Ensure async/await patterns are used correctly

2. **Testing**:
   - Run `python backend_test.py` to ensure all API endpoints work
   - Verify authentication flows work correctly
   - Test RSS feed processing and AI integration
   - Check database operations (CRUD)

3. **Server Verification**:
   - Ensure backend server starts without errors: `uvicorn server:app --reload --port 8001`
   - Check logs for any warnings or errors
   - Verify all environment variables are properly set

### Frontend Changes (React Native)
1. **Code Quality**:
   - Run `npm run lint` in the `audion-app/` directory
   - Fix any ESLint errors or warnings
   - Ensure TypeScript types are correct

2. **Testing**:
   - Start the Expo development server: `npx expo start`
   - Test on multiple platforms (iOS/Android/Web if applicable)
   - Verify navigation flows work correctly
   - Test authentication and API integrations

3. **Build Verification**:
   - Ensure no TypeScript compilation errors
   - Verify all imports are correct and modules exist

### Frontend Changes (Web)
1. **Code Quality**:
   - Ensure Tailwind CSS classes are used correctly
   - Verify responsive design works

2. **Testing**:
   - Start development server: `npm run dev`
   - Test in multiple browsers
   - Verify API integration works

3. **Build Verification**:
   - Run `npm run build` to ensure production build works
   - Check for any build warnings or errors

### Database Changes
1. **Schema Validation**:
   - Ensure MongoDB collections are created correctly
   - Verify indexes are properly set up
   - Test database queries and operations

2. **Data Integrity**:
   - Check that relationships between documents are maintained
   - Verify user data isolation (users only see their own data)

### Integration Testing
1. **Full User Flow**:
   - Register new user → Login → Add RSS source → Fetch articles → Create audio → Manage library
   - Test error scenarios (invalid credentials, network errors, etc.)
   - Verify proper error messages are displayed

2. **AI Integration**:
   - Test with demo API keys (should fall back to mock responses)
   - Test with real API keys (if available)
   - Verify script generation has proper conversational format ("HOST 1" and "HOST 2")

### Final Checks
1. **Environment Variables**:
   - Ensure all required environment variables are documented
   - Verify demo/example values work for testing

2. **Documentation**:
   - Update CLAUDE.md if new commands or patterns are introduced
   - Ensure API changes are reflected in documentation

3. **Git Status**:
   - Review `git status` and `git diff` to understand all changes
   - Ensure no sensitive information (API keys, passwords) are committed
   - Write clear commit messages describing the changes

## Critical Commands to Run After Any Significant Change

### Backend
```bash
python backend_test.py              # Must pass all tests
uvicorn server:app --reload --port 8001  # Must start without errors
```

### Frontend (React Native)
```bash
cd audion-app
npm run lint                        # Must pass without errors
npx expo start                      # Must start without errors
```

### Integration
```bash
# Start backend, then run frontend, verify they communicate correctly
# Test the complete user journey end-to-end
```