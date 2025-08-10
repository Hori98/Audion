# Code Style and Conventions

## Backend (Python/FastAPI)
- **Code Style**: Follow PEP 8 standards
- **Linting**: Available via flake8, black for formatting, isort for imports, mypy for type checking
- **Async Patterns**: Heavy use of async/await throughout the FastAPI application
- **Type Hints**: Extensive use of Pydantic models for request/response validation
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Logging**: Structured logging using Python's logging module with timestamps
- **API Design**: RESTful endpoints with proper HTTP methods and status codes

## Frontend - React Native (TypeScript)
- **Language**: TypeScript with strict type checking
- **Linting**: ESLint with Expo configuration
- **File Organization**: 
  - `app/(tabs)/` for main tab screens
  - `components/` for reusable UI components
  - `context/` for React Context providers
  - `hooks/` for custom React hooks
  - `services/` for API and utility services
  - `constants/` for app constants and themes
- **Component Structure**: Functional components with hooks
- **State Management**: React Context for global state, local state with useState/useEffect
- **Styling**: StyleSheet.create() with theme-based styling
- **Navigation**: File-based routing with Expo Router
- **Naming**: PascalCase for components, camelCase for functions and variables

## Frontend - Web (React/TypeScript)
- **Styling**: Tailwind CSS utility classes
- **Component Structure**: Similar to React Native but with web-specific patterns
- **File Organization**: `src/components/`, `src/contexts/`

## Database Conventions
- **MongoDB**: Document-based storage with proper indexing
- **Field Naming**: snake_case for database fields (created_at, user_id, etc.)
- **ID Fields**: Mix of MongoDB ObjectId and UUID strings depending on context
- **Timestamps**: ISO format timestamps for created_at/updated_at fields

## API Conventions
- **Endpoints**: RESTful design with `/api` prefix
- **Authentication**: Bearer token in Authorization header
- **Response Format**: Consistent JSON responses with proper error messages
- **Status Codes**: Standard HTTP status codes (200, 201, 400, 401, 404, 500, etc.)

## Testing Conventions
- **Backend**: Comprehensive integration tests in `backend_test.py`
- **Test Data**: Dynamic test user generation with random IDs
- **Test Flow**: Full user journey testing (register → login → use features → cleanup)
- **Assertions**: Clear success/failure indicators with emoji status messages