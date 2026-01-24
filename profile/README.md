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
### Create an new project
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
import { env } from "@bunary/core";

const app = createApp();

app.get("/", () => ({ message: "Hello, Bunary!" }));

const port = parseInt(env("PORT", "3000"));
app.listen(port);
```
### 📦 Packages

| Package        | Purpose                             |
| -------------- | ----------------------------------- |
| `@bunary/core` | Configuration & environment helpers |
| `@bunary/http` | HTTP routing & middleware           |
| `@bunary/auth` | Auth primitives & guard scaffolding |
| `@bunary/cli`  | CLI tooling & project scaffolding   |


### 💡 Key Concepts
  * Bun-First — Built to leverage Bun’s performance without Node overhead.
  * Laravel-Inspired — Sensible defaults and developer productivity.
  * Modular — Use only what you need.
  * Minimal Magic — Explicit APIs, no hidden behaviour.

### 📚 Learn More
  * Examples: [Examples repo](https://github.com/bunary-dev/examples)
  * Contributing: [Contribution guidelines](../CONTRIBUTING.md)
  * Public roadmap: Coming soon — we welcome feedback.

### ⚖️ License

MIT © Bunary Contributors
