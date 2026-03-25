# Forge App Development Guide

This is an Atlassian Forge app built with TypeScript and Forge React (Forge UI Kit). It runs on the Forge platform.

## Project Structure

```
src/
├── index.ts              # Main entry point — exports resolver handler
├── resolvers/            # Backend resolver functions (Node.js runtime)
│   ├── index.ts          # Resolver implementation
│   └── __tests__/        # Resolver unit tests
├── frontend/             # React frontend (UI Kit 2)
│   ├── index.tsx         # App UI components
│   └── __tests__/        # Component tests
├── types/                # TypeScript type definitions
│   ├── index.ts          # Type exports
│   └── forge-ui-types.ts # Forge UI Kit component types (auto-generated)
├── __tests__/            # Integration and framework tests
└── setupTests.ts         # Jest test configuration

manifest.yml              # Forge app manifest — defines modules, permissions, resources
eslint.config.js          # ESLint with Forge-specific rules
jest.config.cjs           # Jest config with Forge shims
tsconfig.json             # TypeScript configuration
```

## Key Commands

```bash
npm run build             # TypeScript type-check (no emit — Forge compiles at deploy time)
npm run test              # Run all tests with Jest
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Tests with coverage report
npm run lint              # ESLint with Forge-specific rules
npm run lint:fix          # Auto-fix lint issues
npm run validate:manifest # Validate manifest.yml structure and rules
npm run ci                # Full validation: type-check + lint + manifest + tests
```

Important: You should run `npm run ci` regularly to validate your work as you go

## Forge Platform Concepts

- **Modules** define where the app appears (e.g., `jira:issuePanel`, `confluence:contentAction`). Configured in `manifest.yml`.
- **Resolvers** are backend functions invoked from the frontend via `@forge/bridge`. They run in Node.js and can call Atlassian APIs via `@forge/api`.
- **Resources** point to frontend entry files that render UI Kit 2 components.
- **UI Kit 2** uses React with Forge-specific components from `@forge/react` (e.g., `Text`, `Button`, `Table`).

## Testing

### Test Runner

Tests use **Jest** with `ts-jest` and `jsdom` environment. The testing framework provides drop-in shims for Forge platform modules so tests run locally without deploying.

### Module Shims (jest.config.cjs)

The Jest config maps `@forge/*` imports to local shims:

| Import | Shim | Purpose |
|--------|------|---------
| `@forge/api` | `.testing-framework/dist/shims/forge-api/` | Fake `fetch`, `route()`, `asApp()`, `asUser()` |
| `@forge/bridge` | `.testing-framework/dist/shims/forge-bridge/` | Fake `invoke()`, `view` |
| `@forge/kvs` | `.testing-framework/dist/shims/forge-kvs/` | In-memory key-value store with Custom Entity support |
| `@forge/react` | `.testing-framework/dist/shims/forge-react/` | Stub UI Kit components, `ForgeReconciler`, `xcss()` |

These shims are automatically active in tests — no manual setup needed.

### Testing Framework (`@forge/testing-framework`)

Import from `@forge/testing-framework` for test utilities:

```typescript
import {
  createFrontendContext,      // Frontend context (useProductContext)
  createBackendContext,       // Backend resolver context
  FixtureStore,               // API response fixture management
} from '@forge/testing-framework';
```

#### Mock Contexts

Generate realistic Forge contexts for any module type:

```typescript
// Frontend context — what useProductContext() returns
const ctx = createFrontendContext('jira:issuePanel', {
  extension: { issue: { key: 'BUG-42', type: 'Bug' } },
});
// ctx.extension.type === 'jira:issuePanel'
// ctx.extension.issue.key === 'BUG-42'

// Backend resolver context — what the resolver receives
const resolverCtx = createBackendContext('jira:issuePanel');
// resolverCtx.accountId, resolverCtx.installContext, etc.
```

#### Fixture Store

Manage API response fixtures with cascading priority:

```typescript
import { FixtureStore } from '@forge/testing-framework';

const store = new FixtureStore({
  fixtureDir: './fixtures',  // Optional: load fixtures from files
});

// Built-in defaults cover common Jira and Confluence APIs (GET, POST, PUT, DELETE)
const result = store.lookup('GET', '/rest/api/3/issue/TEST-1');
// result.found === true, result.response.body contains realistic issue data

// Override for specific tests via the test harness
harness.addFixture('GET', '/rest/api/3/issue/TEST-1', {
  status: 200,
  body: { key: 'TEST-1', fields: { summary: 'Custom fixture' } },
});
```

### Writing Tests

**Resolver tests** — use the test harness to invoke resolvers with realistic context and API fixtures:

```typescript
import { createTestHarness } from '@forge/testing-framework';
import { handler } from '../resolvers/index';

const harness = createTestHarness({ manifest: './manifest.yml', handler });

beforeEach(() => {
  harness.reset(); // Clears storage, API call history, and fixture overrides
});

describe('my resolver', () => {
  it('returns data using default API fixtures', async () => {
    // Default fixtures for common Jira/Confluence APIs are provided automatically.
    // The harness auto-detects the module type from the manifest and populates
    // the context extension with realistic defaults.
    const result = await harness.invoke('getIssueData');
    expect(result.data).toBeDefined();
  });

  it('works with custom fixtures and payload', async () => {
    harness.addFixture('GET', '/rest/api/3/issue/BUG-1', {
      status: 200,
      body: { key: 'BUG-1', fields: { summary: 'Fix login' } },
    });

    const result = await harness.invoke('getIssueData', {
      payload: { issueKey: 'BUG-1' },
    });
    expect(result.data).toEqual({ summary: 'Fix login' });
  });

  it('can inspect API calls made by the resolver', async () => {
    await harness.invoke('getIssueData');
    expect(harness.apiCalls.some(c => c.path.includes('/issue/'))).toBe(true);
  });
});
```

**Frontend tests** — the `@forge/react` shim provides stub components automatically:

```typescript
import React from 'react';

// No manual mocking needed — @forge/react is shimmed in jest.config.cjs
describe('App', () => {
  it('should import without errors', async () => {
    const appModule = await import('../frontend/index');
    expect(appModule).toBeDefined();
  });
});
```

> **NEVER use `jest.mock()` for `@forge/*` modules** (e.g., `@forge/bridge`, `@forge/react`, `@forge/api`). These are already shimmed via `moduleNameMapper` in `jest.config.cjs`. Manually mocking them will override the shims and break tests. If a shim is genuinely missing from the test framework, then creating a mock is ok.

## Forge UI Kit Types

TypeScript definitions for Forge UI Kit components are in `src/types/forge-ui-types.ts`. These provide type safety for component props:

```typescript
import { ButtonProps, BoxProps } from '../types';
import { xcss } from '../types';

// Type-safe xcss styling
const styles = xcss({
  padding: 'space.200',
  backgroundColor: 'color.background.neutral',
});
```

These types are auto-generated. Do not edit `forge-ui-types.ts` manually.

## Forge-Specific ESLint Rules

The ESLint config includes Forge-specific rules that enforce valid UI Kit patterns:

- **No HTML elements** — use Forge UI Kit components (`Text`, `Box`, etc.) instead of `<div>`, `<span>`
- **No empty components** — components must render content
- **Modal structure** — modals must follow Forge's required structure
- **Tabs structure** — tabs must have valid children
- **No heading level prop** — Forge headings don't support `level` prop
- **No form label prop** — use `Label` component instead
- **Checkbox group structure** — enforce valid checkbox group patterns
- **Confluence macro config** — only allowed components in macro config

## Manifest Rules

Run `npm run validate:manifest` to check `manifest.yml` for:

- Valid module structure and required fields
- Correct resource references
- Valid permission scopes
- Proper function key references

## Important Notes

- **Do not import Node.js built-ins in frontend code** — frontend runs in a sandboxed browser environment
- **Use `@forge/api` for HTTP requests in resolvers** — direct `fetch` won't have the right auth context
- **`@forge/react` components only** in frontend — standard HTML elements are not supported in UI Kit 2
- **Manifest changes require redeployment** — `forge deploy` after modifying `manifest.yml`
- **The `app.id` field** in `manifest.yml` must be set via `forge register` before first deploy
