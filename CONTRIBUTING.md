# Contributing to Bunary

Thank you for your interest in contributing to Bunary! This document provides guidelines for development setup and the contribution workflow.

## 📋 Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Git
- A GitHub account

## 🛠️ Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
cd REPO_NAME
```

2. **Install dependencies**

```bash
bun install
```

3. **Run tests**

```bash
bun test
```

## 🔄 TDD Workflow

We follow Test-Driven Development (TDD). All contributions must include tests.

### Red-Green-Refactor Cycle

1. **🔴 Red**: Write a failing test first
2. **🟢 Green**: Write minimal code to make the test pass
3. **🔧 Refactor**: Improve the code while keeping tests green

### Example

```typescript
// 1. Write the failing test first
import { describe, expect, test } from "bun:test";

describe("myFunction", () => {
  test("does the thing", () => {
    expect(myFunction("input")).toBe("expected");
  });
});

// 2. Verify it fails
bun test

// 3. Implement the function
export function myFunction(input: string): string {
  return "expected";
}

// 4. Verify it passes
bun test
```

## 📝 Contribution Process

### 1. Create an Issue First

Before starting work, create or find an existing issue describing the change.

### 2. Create a Feature Branch

```bash
git checkout -b feature/ISSUE_NUMBER-description
```

### 3. Make Your Changes

- Write tests first (TDD)
- Follow the existing code style
- Add JSDoc comments with `@example` blocks
- Update documentation as needed

### 4. Run Quality Checks

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Lint and format
bun run lint
```

### 5. Commit Your Changes

Use conventional commit messages:

```bash
git commit -m "feat: add feature description"
git commit -m "fix: fix bug description"
git commit -m "docs: update documentation"
git commit -m "test: add tests for feature"
git commit -m "refactor: improve code structure"
```

### 6. Open a Pull Request

- Reference the issue: `Closes #123`
- Describe what changed and why
- Ensure all CI checks pass

## 📐 Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Biome (run `bun run lint`)
- **Documentation**: JSDoc with `@example` blocks on all exports
- **Testing**: 100% coverage goal for core functionality

### JSDoc Example

```typescript
/**
 * Create a new router instance.
 *
 * @param options - Router configuration options
 * @returns A configured Router instance
 *
 * @example
 * ```ts
 * const router = createRouter({ prefix: "/api" });
 * router.get("/users", () => ({ users: [] }));
 * ```
 */
export function createRouter(options?: RouterOptions): Router {
  // ...
}
```

## 🏗️ Repository Structure

| Package | Description |
|---------|-------------|
| `@bunary/core` | Configuration and environment |
| `@bunary/http` | HTTP routing and middleware |
| `@bunary/auth` | Authentication and guards |
| `@bunary/cli` | CLI scaffolding tools |

## ❓ Questions?

Feel free to open an issue or discussion if you have questions about contributing.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
