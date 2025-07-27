# agentoc

A modern TypeScript monorepo built with:

- 🧱 PNPM workspaces
- 🔧 TypeScript + Tsup (per package builds)
- 🧪 Vitest (testing per lib/app)
- 🧼 ESLint + Prettier
- 📦 Changesets (versioning + release)
- 🤖 GitHub Actions (CI/CD)

---

## 📦 Structure

packages/ → reusable libraries  
apps/     → deployable applications  

---

## 🛠 Setup

Install dependencies:

  pnpm install

Build everything:

  pnpm build

Run an app (e.g. demo):

  pnpm --filter @myorg/demo-app dev

---

## 🔃 Development Commands

### Root Level Commands
| Command                       | What it does                        |
|------------------------------|-------------------------------------|
| `pnpm build`                | Build all apps/libs                 |
| `pnpm dev`                  | Run dev mode for all packages       |
| `pnpm test`                 | Run tests across the monorepo       |
| `pnpm test:ui`              | Run tests with UI                   |
| `pnpm lint`                 | Lint all packages                   |
| `pnpm format`               | Format all packages                 |
| `pnpm clean`                | Clean all dist folders              |
| `pnpm type-check`           | Type check all packages             |

### Package-Specific Commands
For a package named `@myorg/assistant-core`:

| Command                                    | What it does                        |
|-------------------------------------------|-------------------------------------|
| `pnpm @myorg/assistant-core:build`      | Build specific package              |
| `pnpm @myorg/assistant-core:dev`        | Run dev mode for specific package   |
| `pnpm @myorg/assistant-core:test`       | Test specific package               |
| `pnpm @myorg/assistant-core:lint`       | Lint specific package               |
| `pnpm @myorg/assistant-core:format`     | Format specific package             |
| `pnpm @myorg/assistant-core:clean`      | Clean specific package              |
| `pnpm @myorg/assistant-core:type-check` | Type check specific package         |

### Monokit Commands
| Command                       | What it does                        |
|------------------------------|-------------------------------------|
| `monokit init <name>`       | Initialize new monorepo             |
| `monokit add lib <name>`    | Add a new library                   |
| `monokit add app <name>`    | Add a new application               |
| `monokit switch <pkg> <type> <mode>` | Toggle local/remote deps    |

---

## 🚀 Releases

This repo uses [Changesets](https://github.com/changesets/changesets) for publishing packages.

To publish:

1. Create a changeset:

   pnpm changeset

2. Version packages:

   pnpm version-packages

3. Push a tag:

   git tag v1.0.0  
   git push origin v1.0.0

4. GitHub Actions will publish changed packages to npm.

Make sure `NPM_TOKEN` is set in GitHub secrets.

---

## 🤝 Contributing

Create an issue or pull request. Templates are provided in `.github/`.

