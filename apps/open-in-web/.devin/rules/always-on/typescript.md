trigger: always_on
---
# TypeScript

1. Use `bun check -p . --no-script` for type checking instead of `tsc --noEmit` or `tsgo`; Vite projects use `tsrs --noEmit`
2. All workspaces with `tsconfig.json` must extend from `@wrikka/default-config`
3. Enable strict mode in TypeScript configuration
4. Use proper type annotations for function parameters and return types
5. Avoid `any` type - use `unknown` or specific types instead
6. Use type guards for runtime type checking
7. Use utility types (`Pick`, `Omit`, `Partial`, etc.) for type transformations
8. Use `as const` for literal type inference
9. Use `satisfies` operator for type checking without changing type
10. Use branded types for domain-specific values
11. Use template literal types for string patterns
12. Use conditional types for type logic
13. Use `infer` keyword for type inference in conditional types
14. Use `keyof` and `typeof` operators for type queries
15. Use `ReturnType`, `Parameters`, `InstanceType` utility types

