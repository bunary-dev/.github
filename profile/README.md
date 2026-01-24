# Bunary 🐰

> **Bun-first backend platform inspired by Laravel**

Bunary is a modern backend framework designed specifically for [Bun](https://bun.sh), bringing Laravel-like developer experience to the JavaScript ecosystem.

## ✨ Features

- 🚀 **Bun-first** - Built from the ground up for Bun's performance
- 🛣️ **Expressive Routing** - Clean, Laravel-inspired route definitions
- 🔒 **Guard-based Auth** - Flexible authentication system
- ⚡ **Zero Config** - Sensible defaults, no boilerplate
- 📦 **Modular** - Use only what you need

## 🚀 Quick Start

```bash
# Install the CLI
bun add -g @bunary/cli

# Create a new project
bunary init my-app
cd my-app

# Install dependencies and run
bun install
bun run dev
```

## 📦 Packages

| Package | Description | Version |
|---------|-------------|--------|
| [@bunary/core](https://github.com/bunary-dev/core) | Configuration and environment utilities | [![npm](https://img.shields.io/npm/v/@bunary/core)](https://www.npmjs.com/package/@bunary/core) |
| [@bunary/http](https://github.com/bunary-dev/http) | HTTP routing and middleware | [![npm](https://img.shields.io/npm/v/@bunary/http)](https://www.npmjs.com/package/@bunary/http) |
| [@bunary/auth](https://github.com/bunary-dev/auth) | Authentication and guards | [![npm](https://img.shields.io/npm/v/@bunary/auth)](https://www.npmjs.com/package/@bunary/auth) |
| [@bunary/cli](https://github.com/bunary-dev/cli) | Command-line scaffolding | [![npm](https://img.shields.io/npm/v/@bunary/cli)](https://www.npmjs.com/package/@bunary/cli) |

## 💡 Example

```typescript
import { createApp } from "@bunary/http";
import { env, isDev } from "@bunary/core";

const app = createApp();

// Simple JSON response
app.get("/", () => ({ message: "Hello, Bunary!" }));

// Path parameters
app.get("/users/:id", (ctx) => {
  return { id: ctx.params.id };
});

// Query parameters
app.get("/search", (ctx) => {
  return { query: ctx.query.get("q") };
});

// Middleware
app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  return next();
});

const port = parseInt(env("PORT", "3000"), 10);
app.listen(port);
console.log(`Server running on http://localhost:${port}`);
```

## 📚 Resources

- [Examples](https://github.com/bunary-dev/examples) - Working code examples
- [Contributing](https://github.com/bunary-dev/.github/blob/main/CONTRIBUTING.md) - Development guide

## 🎯 Philosophy

1. **Bun-first**: Leverage Bun's full potential, no Node.js baggage
2. **Developer Joy**: Laravel-inspired DX with modern TypeScript
3. **Minimal Magic**: Clear, explicit APIs over hidden conventions
4. **Batteries Included**: Complete toolkit out of the box
5. **Modular Design**: Pick what you need, tree-shake the rest

## 📄 License

MIT © [Bunary Contributors](https://github.com/bunary-dev)
