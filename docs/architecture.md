# TrueSuite Architecture

## Monorepo layout
- `apps/*` — deployable Next.js apps, one per product
- `packages/*` — shared code consumed via `workspace:*` protocol
- `docs/*` — brand, strategy, GTM notes

## Why monorepo
- Shared auth, billing, design system across three SMB products
- Atomic changes across apps (e.g. bump shared UI version)
- Single CI, single Renovate, single linter config
- Vercel handles per-app deploys from a monorepo natively (root dir = `apps/<name>`)

## Per-app autonomy
Each app is fully deployable in isolation. Cross-app imports go through `packages/*` only — never `apps/foo` importing from `apps/bar`.

## Vercel deploy model
- One Vercel project per app
- Root Directory: `apps/<name>`
- Build Command: `cd ../.. && pnpm install && pnpm --filter <name> build`
- Install Command: handled by build (or leave default and let Vercel detect pnpm)
- Output Directory: `.next` (default)
- Each project has its own custom domain, env vars, analytics IDs

## Supabase
Initially one Supabase project per app — simplest, isolated blast radius. When `packages/auth` matures (cross-app SSO), consolidate to one Supabase project with app-scoped tables.

## Shared packages (planned)
- `packages/ui` — design system primitives (Button, Input, Card, layout components)
- `packages/auth` — Supabase auth client + middleware helpers
- `packages/db` — Supabase types + query helpers
- `packages/billing` — Stripe checkout/portal helpers

## Conventions
- TypeScript strict mode on, no `any`
- Server components by default
- Tailwind 4 via PostCSS plugin
- File naming: kebab-case for routes, PascalCase for components
