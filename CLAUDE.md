# TrueSuite — Claude Desktop Project Notes

You are working in the **TrueSuite monorepo** by Neptune Angels LLC. Three SMB-focused web apps share this codebase.

## The three apps

| App | Path | What it does | Status |
|---|---|---|---|
| TrueQR | `apps/trueqr/` | Dynamic QR codes + scan analytics for SMBs | **Live in production** — do not break |
| TruePage | `apps/truepage/` | Landing page builder for SMBs | Scaffold — build from here |
| TrueBook | `apps/truebook/` | Appointment booking for SMBs | Scaffold — build from here |

## Stack (all three apps share this)

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript (strict)
- **Styling:** Tailwind 4
- **DB + Auth:** Supabase (`@supabase/ssr` for cookie-based sessions)
- **Payments:** Stripe
- **Hosting:** Vercel (one project per app, root dir = `apps/<name>`)
- **Package manager:** pnpm + Turborepo workspace
- **Analytics:** Vercel Analytics + PostHog

## When building TruePage or TrueBook

1. **Copy patterns from `apps/trueqr/`** — auth flow, Supabase client setup, middleware, dashboard layout, Stripe checkout, pricing page. These are battle-tested in production.
2. **Do NOT modify `apps/trueqr/` files** unless the user explicitly asks. It's live and earning.
3. **Shared code goes in `packages/*`** — when you find yourself copying the same code into two apps, extract it. Use workspace protocol: `"@truesuite/ui": "workspace:*"`.
4. **Each app gets its own Supabase project** for now. Multi-tenant auth across apps is a future `packages/auth` task.

## Conventions (apply across the monorepo)

- **Server components by default**, `"use client"` only when needed (forms, interactivity)
- **Route handlers in `app/api/`** for server endpoints
- **Middleware in `middleware.ts`** for auth-protected routes
- **Components in `components/`** at the app level; shared primitives in `packages/ui/`
- **Database types** generated from Supabase, kept in `lib/database.types.ts`
- **Environment variables**: `.env.local` per app, never committed. `NEXT_PUBLIC_*` for client-exposed.

## Brand

TrueSuite = SMB tools that are dead-simple, fast, and don't condescend. Clean design, no dark patterns, transparent pricing. Underlying parent is Neptune Angels LLC (not surfaced publicly).

## When in doubt

- Look at `apps/trueqr/` for the canonical pattern.
- Read `docs/architecture.md` for stack decisions.
- Ask the user before introducing a new dependency or pattern that differs from TrueQR's.
