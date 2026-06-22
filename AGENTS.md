# TrueSuite — Agent Operations

This is the Neptune Angels SMB tools monorepo. Three apps, shared infra.

## Apps
- `apps/trueqr/` — **PRODUCTION**. Live at trueqr.co. Do not break.
- `apps/truepage/` — Scaffold. Build out here.
- `apps/truebook/` — Scaffold. Build out here.

## When working here
- Read `CLAUDE.md` in repo root for full conventions
- TrueQR is the canonical pattern reference — copy its approach, don't reinvent
- Each app deploys independently to Vercel; do not introduce cross-app imports (use `packages/*`)
- Production changes to TrueQR require explicit approval

## Don't
- Don't link Neptune ventures to Conor Neu publicly
- Don't introduce financial-services features (regulated, off-limits)
- Don't break the live TrueQR build

## Do
- Copy heavily from `apps/trueqr/` for the new apps
- Surface shared code into `packages/*` once it's used by 2+ apps
- Keep TypeScript strict, no `any`
