# Bunary — Bun-First Backend Platform  
**Bunary is a modern backend platform for Bun, inspired by Laravel’s developer experience.**

Bunary gives you an opinionated foundation for building APIs and backend services with **clarity, speed, and minimal boilerplate** — designed specifically for **Bun’s runtime performance** and **TypeScript workflows**.

---

## 🚀 Why Bunary Exists

JavaScript backend tooling today is either:
- too low-level (manual setup),
- based on Node conventions that slow you down,
- or heavyweight frameworks with steep learning curves.

**Bunary** solves this by combining:
- **Bun performance**
- **Expressive routing**
- **Modular utilities**
- **Clear, explicit APIs**

It’s for developers who want *productive backend code* without boilerplate.

---

## 🧪 Quick Start

### Install Bun (if you don’t have it)
```bash
curl https://bun.sh/install | bash
```
### Create a new project
```bash
bun add -g @bunary/cli
bunary init my-app
cd my-app
bun install
bun run dev
```
### Minimal Example
```ts
import { createApp } from "@bunary/http";

const app = createApp();

app.get("/", () => ({ message: "Hello, Bunary!" }));

const server = app.listen({ port: 3000 });
console.log(`Server running on http://localhost:${server.port}`);
```
### 📦 Packages

| Package        | Purpose                             |
| -------------- | ----------------------------------- |
| `@bunary/core` | Configuration & environment helpers |
| `@bunary/http` | HTTP routing & middleware           |
| `@bunary/auth` | Auth primitives & guard scaffolding |
| `@bunary/cli`  | CLI tooling & project scaffolding   |
| `@bunary/orm`  | ORM with database abstraction layer |


### 💡 Key Concepts
  * Bun-First — Built to leverage Bun’s performance without Node overhead.
  * Laravel-Inspired — Sensible defaults and developer productivity.
  * Modular — Use only what you need.
  * Minimal Magic — Explicit APIs, no hidden behaviour.
  * Fail Loud — Public APIs throw or warn; they never silently no-op or swallow errors.

### 📚 Learn More
  * Website: [bunary.dev](https://bunary.dev)
  * Examples: [Examples repo](https://github.com/bunary-dev/examples)
  * Contributing: [Contribution guidelines](../CONTRIBUTING.md)
  * Roadmap: [View the roadmap](../ROADMAP.md) — feedback welcome

### ⚖️ License

MIT © Bunary Contributors
