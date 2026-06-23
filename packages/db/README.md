# @truesuite/db

Shared Supabase schema, migrations, and (soon) generated TypeScript types.

## Migrations

Applied in numeric order against the shared TrueSuite Supabase project.

| File | Status | Purpose |
|---|---|---|
| `migrations/001_foundation.sql` | ✅ Applied 2026-06-22 | Identity + Entitlements + QR module + TruePage v0 tables, RLS, helper fns |

## Project

| Key | Value |
|---|---|
| Project name | `truesuite` |
| Project ref | `bnpbncugotbitppabnzh` |
| URL | `https://bnpbncugotbitppabnzh.supabase.co` |
| Region | `us-west-1` |
| Org | Neptune Angels (`plgxffsmjibjsckxvmpq`) |

Secrets in 1Password: vault `Neptune Automation` → item `Supabase TrueSuite`
- `op read "op://Neptune Automation/Supabase TrueSuite/url"`
- `op read "op://Neptune Automation/Supabase TrueSuite/anon_key"`
- `op read "op://Neptune Automation/Supabase TrueSuite/service_role_key"`
- `op read "op://Neptune Automation/Supabase TrueSuite/db_password"`

## Vercel env vars (wired into all 3 apps)

- `NEXT_PUBLIC_TRUESUITE_SUPABASE_URL`
- `NEXT_PUBLIC_TRUESUITE_SUPABASE_ANON_KEY`
- `TRUESUITE_SUPABASE_SERVICE_ROLE_KEY` (encrypted)

`NEXT_PUBLIC_TRUESUITE_*` prefix used (not `NEXT_PUBLIC_SUPABASE_*`) so the TrueQR
production app can keep its current legacy Supabase project live during the rebuild
without env-var collisions.

## Adding a new migration

1. Create `migrations/00N_<short_description>.sql`
2. Apply via Supabase Management API:
   ```bash
   PAT=$(op read "op://Neptune Automation/Supabase/neptune-automation")
   curl -X POST -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
     "https://api.supabase.com/v1/projects/bnpbncugotbitppabnzh/database/query" \
     -d "$(python -c "import json,sys; print(json.dumps({'query': open(sys.argv[1]).read()}))" migrations/00N_*.sql)"
   ```
3. Commit the .sql file
4. Regenerate TS types: `supabase gen types typescript --project-id bnpbncugotbitppabnzh > database.types.ts`

## Coming next

- `database.types.ts` — generated TS types consumed by all apps via `import type { Database } from '@truesuite/db'`
- Query helper functions for common patterns (account lookups, entitlement checks)
