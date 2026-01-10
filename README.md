# Habimori

Минимальное приложение для целей и учета времени на базе Next.js и Supabase.

## Стек

- Next.js (App Router) + TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS
- Google OAuth

## Документация

- Обзор продукта: `docs/overview.md`
- Экраны/UI: `docs/screens.md`
- Доменные правила: `docs/domain-rules.md`
- Модель данных: `docs/data-model.md`
- Разработка и проверки: `docs/dev.md`
- Текущее состояние/статус: `docs/plan.md`

## Требования

- Node.js 20+
- npm

## Переменные окружения

Создайте `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (опционально)

## Запуск

```bash
npm install
npm run dev
```

или

```bash
make dev
```

Адрес: `http://localhost:3000`

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
