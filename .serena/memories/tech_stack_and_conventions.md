# Technology Stack & Code Conventions

## Code Style & Conventions

### Frontend (React Native/TypeScript)
- **Language**: TypeScript with strict mode enabled
- **Styling**: React Native StyleSheet with themed components
- **Component Structure**: Functional components with hooks
- **File Organization**: 
  - Screens in `app/(tabs)/` using Expo Router
  - Reusable components in `components/`
  - Services in `services/` for API integration
  - Context providers in `context/`
- **Naming Conventions**:
  - Components: PascalCase (e.g., `FeedUI.tsx`)
  - Files: camelCase for utilities, PascalCase for components
  - Constants: UPPER_SNAKE_CASE

### Backend (Python/FastAPI)
- **Language**: Python 3.13+ with type hints
- **Framework**: FastAPI with async/await patterns
- **Code Organization**:
  - Main server in `server.py` (6,633 lines - monolithic)
  - Services in `services/` directory
  - Models in `models/` using Pydantic
  - Routers in `routers/` (partially modularized)
- **Naming Conventions**:
  - Functions/variables: snake_case
  - Classes: PascalCase
  - Constants: UPPER_SNAKE_CASE
- **Database**: MongoDB collections with Motor async driver

## Architectural Patterns

### Frontend Patterns
- **State Management**: React Context API
- **API Integration**: Axios with service layer abstraction
- **Authentication**: JWT tokens stored in AsyncStorage
- **Error Handling**: Try-catch with user-friendly error messages
- **Performance**: React.memo for expensive components, useMemo/useCallback

### Backend Patterns
- **Async/Await**: Consistent async patterns throughout
- **Dependency Injection**: Database connections via context managers
- **Error Handling**: FastAPI HTTPException with proper status codes
- **Authentication**: JWT Bearer tokens with middleware
- **API Design**: RESTful endpoints with Pydantic models

## Development Practices

### Quality Assurance
- **Frontend Linting**: ESLint with TypeScript rules
- **Frontend Type Checking**: `tsc --noEmit`
- **Backend Quality**: Black, isort, flake8, mypy (configured but not actively used)
- **Testing**: Jest for frontend, pytest for backend (minimal test coverage currently)

### Code Organization Philosophy
- **Modular Design**: Clear separation of concerns
- **Reusability**: Common patterns extracted to services/utilities  
- **Maintainability**: Prefer explicit over implicit
- **Documentation**: Inline comments for complex logic only

### Performance Considerations
- **Frontend**: Lazy loading, image optimization, efficient re-renders
- **Backend**: Database indexing, response caching, async processing
- **Network**: Request batching, connection pooling