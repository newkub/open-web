trigger: glob
globs:
  - "/src//*.ts"
  - "/src//*.tsx"
  - "/src//*.js"
  - "/src//*.jsx"
---
# Source Files

1. Use TypeScript for all source files (`.ts`)
2. Organize source files by domain and layer
3. Use `src/` directory for all source code
4. Use `index.ts` for package entry points
5. Use `cli.ts` for CLI entry points
6. Use descriptive file names that reflect purpose
7. Keep files under 250 lines
8. Use barrel files for clean exports
9. Organize by feature or module
10. Use `shared/` for common utilities
11. Use `types/` for type definitions
12. Use `utils/` for utility functions
13. Use `constants/` for constants
14. Use `errors/` for error definitions
15. Use proper import aliases

