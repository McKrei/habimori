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
