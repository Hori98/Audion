# Design Patterns & Development Guidelines

## Core Design Patterns

### Frontend Design Patterns

#### 1. Context + Hook Pattern
```typescript
// Context for global state management
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook for consuming context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 2. Service Layer Pattern
```typescript
// API abstraction layer
class APIService {
  private baseURL: string;
  
  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    // Centralized error handling, authentication, etc.
  }
}

// Specialized services
class ArticleService extends APIService {
  async getArticles(): Promise<Article[]> { /* */ }
}
```

#### 3. Component Composition Pattern
```typescript
// Composable components with consistent theming
interface ThemedComponentProps {
  theme?: 'light' | 'dark';
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps & ThemedComponentProps> = ({ ... }) => {
  // Consistent theming and behavior
};
```

### Backend Design Patterns

#### 1. Dependency Injection Pattern
```python
# Database connection via context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    yield
    # Shutdown
    client.close()

# Injected dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Authentication logic with injected database
```

#### 2. Service Layer Pattern
```python
# Business logic abstraction
class RSSService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_articles_for_user(self, user_id: str) -> List[Article]:
        # Encapsulated business logic
```

#### 3. Repository Pattern (Emerging)
```python
# Data access abstraction
class ArticleRepository:
    async def find_by_user_id(self, user_id: str) -> List[Article]:
        # Database-specific operations
    
    async def create(self, article: Article) -> str:
        # CRUD operations
```

## Development Guidelines

### Code Organization Principles

#### 1. 拡張性考慮型開発指針 (Extensibility-Focused Development)
- **Architecture Future-proofing**: Design components/data structures for future expansion
- **Technology Stack Optimization**: Choose methods most compatible with existing tech stack
- **UX Priority**: Prioritize look/feel verification, implement detailed logic incrementally
- **Maintainability**: Maintain structure that allows refactoring during full implementation

#### 2. 共通化ファースト・保守性重視 (Commonality-First, Maintainability Focus)
- **Mandatory Checks**: Search for existing similar functionality before implementing new features
- **Implementation Priority**: Commonality > Partial Commonality > New Implementation
- **Automatic Application**: Address duplicate implementations immediately as technical debt

#### 3. AI開発品質ガードレール (AI Development Quality Guardrails)
- **Plan → Apply → Test → Summary**: Mandatory workflow for all tasks
- **Boundary Settings**: Clearly defined modifiable vs. forbidden modification ranges
- **Contract-First Development**: API-first approach to prevent integration accidents

### Architectural Guidelines

#### Frontend Architecture Rules
- **Single Responsibility**: Each component has one clear purpose
- **Prop Drilling Avoidance**: Use Context for deeply nested state
- **Performance First**: React.memo, useMemo, useCallback for expensive operations
- **Error Boundaries**: Graceful error handling with fallback UI

#### Backend Architecture Rules
- **Async Everywhere**: Consistent async/await patterns
- **Type Safety**: Pydantic models for all data structures
- **Error Propagation**: Proper HTTP status codes and error messages
- **Resource Management**: Context managers for database connections

### Quality Assurance Patterns

#### 1. 修正時の影響範囲確認プロトコル (Impact Range Verification Protocol)
```bash
# Required checks after any modification:
1. データフロー追跡 (Data flow tracking)
   grep -r "modified_variable" . --include="*.tsx" --include="*.py"

2. API連携確認 (API integration verification)
   # Verify frontend-backend consistency

3. 呼び出し元特定 (Identify all callers)
   # Find all usage sites of modified functions

4. 共通機能統合 (Common functionality integration)
   # Check for similar logic consolidation opportunities

5. サイドエフェクト検証 (Side effect verification)
   # Identify all side effects from changes
```

#### 2. 品質保証システム (Quality Assurance System)
```bash
# Mandatory pre-commit checks
python quality_validator.py  # Comprehensive validation

# Three-tier development principles
# 1. Human Planning → 2. AI Execution → 3. Verification
```

### Security & Performance Guidelines

#### Security Patterns
- **JWT Token Management**: Secure token storage and refresh patterns
- **Input Validation**: Pydantic models for all API inputs
- **Environment Variables**: No hardcoded secrets, use .env files
- **CORS Configuration**: Proper cross-origin request handling

#### Performance Patterns
- **Lazy Loading**: Load components and data on-demand
- **Caching Strategy**: Redis-like caching for RSS feeds and API responses
- **Database Optimization**: Proper indexing and query optimization
- **Asset Optimization**: Image compression and bundling