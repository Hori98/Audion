# Task Completion Checklist

## What Should Be Done When a Task is Completed

### Code Quality & Standards
1. **Frontend Quality Checks**:
   ```bash
   cd audion-app
   npm run lint          # ESLint checks (must pass with --max-warnings=0)
   npm run typecheck     # TypeScript type checking (must pass)
   npm run format        # Prettier formatting (auto-fix)
   ```

2. **Backend Quality Checks** (when applicable):
   ```bash
   cd backend
   python -m mypy .      # Type checking
   python -m black .     # Code formatting
   python -m flake8 .    # Linting
   ```

### Functional Testing
3. **Basic Functionality Tests**:
   - Verify the changed functionality works as expected
   - Test with both development and production-like data
   - Check error handling and edge cases

4. **API Integration Tests** (for backend changes):
   ```bash
   python backend_test.py                    # Comprehensive API tests
   curl http://192.168.11.30:8003/api/health # Health check
   ```

5. **Cross-Platform Testing** (for frontend changes):
   - Test on iOS simulator/device
   - Test on Android emulator/device  
   - Test web version if applicable

### Impact Analysis (CRITICAL)
6. **影響範囲確認プロトコル** (Following CLAUDE.md guidelines):
   - **データフロー追跡**: Search for all usages of modified variables/functions:
     ```bash
     grep -r "modified_function_name" . --include="*.tsx" --include="*.ts" --include="*.py"
     ```
   - **API連携確認**: Verify frontend-backend consistency
   - **呼び出し元特定**: Find all calling sites of modified functions
   - **共通機能統合**: Check for similar logic that should be consolidated
   - **サイドエフェクト検証**: Identify all side effects of the change

### Documentation Updates
7. **Update Documentation**:
   - Update inline comments for complex logic
   - Update README.md if architecture changes
   - Update CLAUDE.md if development guidelines change
   - Update PROJECT_MASTER_PLAN.md for significant feature changes

### Version Control
8. **Git Best Practices**:
   - Create meaningful commit messages
   - One feature/fix per commit
   - Use appropriate branch naming (feature/, fix/, refactor/)
   - Never commit secrets or API keys

### Performance & Monitoring
9. **Performance Verification**:
   - Check that changes don't degrade performance
   - Verify memory usage is reasonable
   - Test with realistic data volumes
   - Monitor for new performance bottlenecks

10. **Error Monitoring**:
    - Check application logs for new errors
    - Verify error handling works correctly
    - Test graceful degradation scenarios

## Pre-Deployment Checklist

### Environment Configuration
- [ ] All environment variables properly set
- [ ] Database connections tested
- [ ] External API integrations verified
- [ ] File permissions and paths correct

### Security Review
- [ ] No hardcoded credentials or API keys
- [ ] Proper input validation implemented
- [ ] Authentication/authorization working correctly
- [ ] CORS settings appropriate for environment

### Monitoring & Logging
- [ ] Appropriate logging levels set
- [ ] Error tracking configured
- [ ] Performance metrics available
- [ ] Health check endpoints functional

## Emergency Rollback Procedure
If issues are discovered after completion:
1. **Immediate Rollback**: `git revert <commit-hash>`
2. **Restore Services**: Restart affected services
3. **Verify Recovery**: Run basic functionality tests
4. **Investigate**: Debug the issue in a separate branch
5. **Re-implement**: Apply fixes and re-test before re-deployment