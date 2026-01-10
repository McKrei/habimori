# Habimori

Minimal goal + time tracking app built with Next.js and Supabase.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS
- Google OAuth

## Documentation

- Project overview: `docs/overview.md`
- Screens and UI: `docs/screens.md`
- Domain rules: `docs/domain-rules.md`
- Data model: `docs/data-model.md`
- Development workflow: `docs/dev.md`
- Current scope/status: `docs/plan.md`

## Requirements

- Node.js 20+
- npm

## Environment

Create `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (optional override)

## Run

```bash
npm install
npm run dev
```

or

```bash
make dev
```

Open: `http://localhost:3000`

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Docker

```bash
make app
```
