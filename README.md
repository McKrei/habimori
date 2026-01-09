# Habimori (MVP)

Next.js + TypeScript + Supabase.

## Требования

- Node.js 20+
- npm

## Переменные окружения

Создать `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Запуск

```bash
npm install
npm run dev
```

или

```bash
make run
```

Открыть: `http://localhost:3000`

## Проверки

```bash
npm run lint
npm run typecheck
npm run build
```

## Docker

```bash
make app
```
