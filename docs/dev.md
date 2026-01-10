# Development

## Requirements
- Node.js 20+
- npm

## Environment
Create `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (optional override)

## Commands
- Install: `npm install` or `make install`
- Dev server: `npm run dev` or `make dev`
- Lint: `npm run lint` or `make lint`
- Typecheck: `npm run typecheck` or `make typecheck`
- Build: `npm run build` or `make build`

## Docker
- Build + run: `make app`

## Tests
- Unit/Integration: `npm test` or `make test`
- E2E: `npm run test:e2e` or `make test-e2e`

### Test environment
Integration tests expect production Supabase credentials via env vars:

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_TEST_EMAIL`
- `SUPABASE_TEST_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, to auto-provision test user)

E2E tests use:

- `E2E_BASE_URL` (production URL; falls back to `http://localhost:3000` locally)
