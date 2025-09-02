# Design Patterns and Guidelines

## Architecture Patterns

### Backend (FastAPI)
- **Single File Application**: All endpoints in `server.py` for simplicity
- **Async/Await Pattern**: Extensive use of async operations for database and external API calls
- **Dependency Injection**: FastAPI's dependency system for authentication and database connections
- **Pydantic Models**: Strong typing for request/response validation
- **Error Handling**: Consistent HTTPException usage with proper status codes
- **Middleware**: CORS middleware for cross-origin requests

### Frontend - React Native
- **Context Pattern**: React Context for global state management (AuthContext)
- **Custom Hooks**: Encapsulate complex logic in reusable hooks
- **Component Composition**: Small, focused components with clear responsibilities
- **File-based Routing**: Expo Router for navigation structure
- **Async Storage**: Persistent storage for authentication tokens
- **Theme System**: Centralized theming with consistent color schemes

### Frontend - Web React
- **Context Pattern**: Similar to React Native for state management
- **Utility-first CSS**: Tailwind CSS for rapid styling
- **Component Libraries**: Headless UI for accessible components

## Database Design Patterns

### MongoDB Schema Design
- **Document-based**: Each user's data is self-contained
- **Embedded Documents**: Related data stored within documents when appropriate
- **Reference Pattern**: Use IDs to reference related documents across collections
- **Soft Deletion**: `deleted_at` field for recoverable deletions
- **Timestamps**: Consistent `created_at` and `updated_at` fields
- **User Isolation**: All data operations scoped to authenticated user

### Collections Structure
```
users: {
  _id, email, password_hash, display_name, created_at, updated_at,
  genre_preferences, profile_image, interaction_history
}

rss_sources: {
  _id, user_id, name, url, created_at, updated_at, deleted_at
}

articles: {
  _id, source_id, title, content, url, published, genre, cached_at
}

audio_creations: {
  _id, user_id, title, script, audio_url, duration, created_at,
  article_ids, metadata, deleted_at, permanent_delete_at
}
```

## API Design Patterns

### RESTful Endpoints
- **Resource-based URLs**: `/api/sources`, `/api/articles`, `/api/audio`
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (delete)
- **Status Codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found)
- **Authentication**: Bearer token in Authorization header
- **Pagination**: Limit/offset patterns where applicable

### Response Patterns
```json
// Success Response
{
  "data": {...},
  "message": "Success message"
}

// Error Response
{
  "detail": "Error description"
}
```

## AI Integration Patterns

### OpenAI Integration
- **Prompt Engineering**: Structured prompts for consistent script generation
- **Fallback System**: Demo key detection with mock responses
- **Conversational Format**: Enforced "HOST 1" and "HOST 2" dialogue structure
- **Error Handling**: Graceful degradation when AI services are unavailable

### Google TTS Integration
- **Audio Generation**: Text-to-speech with consistent voice settings
- **File Management**: Generated audio stored in cloud storage (Vercel Blob)
- **Metadata Handling**: Duration and format information tracked

## Security Patterns

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with expiration
- **Password Hashing**: bcrypt for secure password storage
- **User Isolation**: All operations scoped to authenticated user
- **Input Validation**: Pydantic models for request validation
- **CORS Configuration**: Proper cross-origin request handling

### Data Protection
- **Environment Variables**: Sensitive keys stored in environment
- **API Key Management**: Demo keys with fallback to mock responses
- **SQL Injection Prevention**: MongoDB parameterized queries
- **Rate Limiting**: (Could be implemented for production)

## Error Handling Patterns

### Backend Error Handling
```python
try:
    # Operation
    return result
except SpecificException as e:
    logger.error(f"Specific error: {e}")
    raise HTTPException(status_code=400, detail="User-friendly message")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Generic error message")
```

### Frontend Error Handling
- **API Error Interception**: Axios interceptors for common error handling
- **User-Friendly Messages**: Convert technical errors to user-understandable text
- **Loading States**: Clear loading indicators during async operations
- **Retry Mechanisms**: Allow users to retry failed operations

## Testing Patterns

### Integration Testing
- **End-to-End Flows**: Test complete user journeys
- **Dynamic Test Data**: Generate unique test data to avoid conflicts
- **Cleanup Operations**: Proper teardown of test data
- **Assertion Patterns**: Clear success/failure indicators
- **Mock Services**: Fallback to mock responses for external APIs

### Test Organization
```python
def test_function():
    # Setup
    # Execute
    # Assert
    # Cleanup (if needed)
```

## Performance Patterns

### Backend Optimization
- **Async Operations**: Non-blocking I/O for database and API calls
- **Connection Pooling**: MongoDB connection management
- **Caching**: RSS feed caching to reduce external API calls (5-minute cache)
- **Lazy Loading**: Load data only when needed

### Frontend Optimization
- **Memoization**: React.memo and useMemo for expensive calculations
- **Lazy Loading**: Code splitting and dynamic imports
- **Image Optimization**: Expo Image for optimized image loading
- **State Management**: Minimal re-renders through efficient state updates

## Code Organization Principles

1. **Single Responsibility**: Each function/component has one clear purpose
2. **DRY (Don't Repeat Yourself)**: Shared logic extracted to utilities/hooks
3. **Consistent Naming**: Clear, descriptive names following language conventions
4. **Error Boundaries**: Proper error handling at appropriate levels
5. **Type Safety**: Strong typing throughout (Python type hints, TypeScript)
6. **Documentation**: Clear docstrings and comments for complex logic