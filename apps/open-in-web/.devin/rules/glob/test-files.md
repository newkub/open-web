trigger: glob
globs:
  - "/*.test.ts"
  - "/*.test.tsx"
  - "/*.spec.ts"
  - "/test//*.ts"
  - "/__tests__/**/*.ts"
---
# Test Files

1. Use `.test.ts` suffix for test files
2. Place test files alongside source files or in `test/` directory
3. Use `describe` and `it` for test organization
4. Write descriptive test names
5. Use `beforeEach` and `afterEach` for setup/teardown
6. Use `vi.mock` for mocking modules
7. Use `vi.fn()` for creating mock functions
8. Test both happy path and error cases
9. Keep tests focused and independent
10. Use `test.skip` for temporarily disabled tests
11. Use `test.only` for debugging specific tests
12. Use `expect` for assertions
13. Test public APIs thoroughly
14. Keep test execution fast
15. Use coverage reports to identify gaps

