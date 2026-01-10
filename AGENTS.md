Проект: веб-приложение (Next.js + TypeScript) с бэкендом на Supabase.

## Где документация (сначала читать это)
- Документация (оглавление): README.md
- Обзор продукта и экранов: ./docs/overview.md
- UserFlow: ./docs/user-flows.md
- Доменные правила: ./docs/domain-rules.md
- Модель данных: ./docs/data-model.md
- Схема БД (DBML для dbdiagram.io): ./docs/schema.dbml
- Разработка: ./docs/dev.md
- Тестирование: ./docs/testing.md
- Текущее состояние проекта: ./docs/plan.md
- Backlog/идеи: ./docs/roadmap.md

## Технологии проекта
- Next.js (App Router) + TypeScript
- Supabase (auth + database)
- UI: Tailwind CSS (utility-классы)
- Google authentication через Supabase OAuth

UI-правила:
- Стили пишем через Tailwind-классы, без раздувания inline-style.
- Повторяемые куски интерфейса выносим в `src/components/`.

## Переменные окружения
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (опционально, используется при наличии)

## Проверки (обязательно прогонять после изменений)
Всегда:
- Установка: `npm install` (или `make install`)
- Dev: `npm run dev` (или `make dev`)
- Lint: `npm run lint` (или `make lint`)
- Build: `npm run build` (или `make build`)

Проверка типов:
- `npm run typecheck` (или `make typecheck`)

Тесты:
- Unit/компонентные: `npm run test` (Vitest)
- E2E: `npm run test:e2e` (Playwright)

Если меняешь поведение/логику сущностей — обнови документы.

## Правила изменений
- Делать минимальные, локальные изменения.
- Не добавлять новые зависимости без необходимости.
- Не трогать ключи/секреты/приватные токены.
