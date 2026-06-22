# TrueSuite

SMB tools by Neptune Angels.

| App | Status | Domain |
|---|---|---|
| **TrueQR** | Live | trueqr.co |
| **TruePage** | Scaffold | truepage.co (TBD) |
| **TrueBook** | Scaffold | truebook.co (TBD) |

## Layout

```
apps/
  trueqr/        Dynamic QR codes + analytics for SMBs
  truepage/      Landing page builder for SMBs
  truebook/      Appointment booking for SMBs
packages/        Shared code (auth, ui, db, billing) — to be filled
docs/            Brand, strategy, GTM
```

## Quickstart

```bash
pnpm install
pnpm dev:trueqr      # or dev:truepage, dev:truebook
```

## Stack

Next.js 16 (App Router) · React 19 · Supabase (auth + db) · Stripe · Tailwind 4 · TypeScript · Vercel · pnpm + Turborepo

## Conventions

- Each app deploys as its own Vercel project, root directory = `apps/<name>`
- Shared code lives in `packages/*` and is consumed via workspace protocol (`"@truesuite/ui": "workspace:*"`)
- Supabase project per app initially; consolidate once auth is unified in `packages/auth`

## Adding a new app

1. `cp -r apps/truepage apps/<newapp>` then rename package
2. Create Vercel project, root dir `apps/<newapp>`
3. Add domain in Cloudflare → point to Vercel

## Docs

- `docs/brand.md` — Brand identity for the suite
- `docs/architecture.md` — Shared stack decisions, monorepo conventions
- `docs/gtm.md` — Go-to-market notes per product
