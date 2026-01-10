# Habimori (MVP)

Habimori is a Next.js + TypeScript app for goal tracking with time logging, contexts, and tags, backed by Supabase.

## Документация

- Обзор продукта и экранов: `docs/overview.md`
- User flows: `docs/user-flows.md`
- Доменные правила: `docs/domain-rules.md`
- Модель данных: `docs/data-model.md`
- Схема БД (DBML): `docs/schema.dbml`
- Разработка: `docs/dev.md`
- Тестирование: `docs/testing.md`
- Текущее состояние проекта: `docs/plan.md`
- Backlog/идеи: `docs/roadmap.md`

## Требования

- Node.js 20+
- npm

## Переменные окружения

Создать `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (опционально; при наличии используется вместо anon key)

> В Supabase должен быть включен Google OAuth provider.

## Запуск

```bash
npm install
npm run dev
```

или

```bash
make dev
```

Открыть: `http://localhost:3000`

## Проверки

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Docker

```bash
make app
```
