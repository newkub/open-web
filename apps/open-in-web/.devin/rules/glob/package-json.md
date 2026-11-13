trigger: glob
globs:
  - "**/package.json"
---
# Package.json Files

1. Use `"type": "module"` for ESM packages
2. Define clear `name`, `version`, and `description`
3. Use `workspace:*` for internal monorepo dependencies
4. Define `main` and `types` fields for library packages
5. Use `bin` field for CLI packages
6. Use `exports` field for conditional exports
7. Use `files` field to control published files
8. Define scripts for common tasks (dev, build, test, lint)
9. Use `engines` field to specify runtime requirements
10. Use `packageManager` field to specify package manager
11. Use `keywords` for better npm discoverability
12. Use `author` and `license` fields
13. Keep dependencies minimal and focused
14. Use `devDependencies` for development tools
15. Use `peerDependencies` for optional integrations

