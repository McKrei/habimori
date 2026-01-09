Проект: веб-приложение (Next.js + TypeScript) с бэкендом на Supabase.

##  Где документация (сначала читать это)
- Документация (оглавление): README.md
- Схема БД (DBML для dbdiagram.io): ./docs/schema.dbml
- UserFlow (пользовательские потоки): ./docs/user-flows.md
- Доменные правила (позитив/негатив, периоды, успех/провал): ./docs/domain-rules.md
- Модель данных (описание сущностей): ./docs/data-model.md
- Разработка (как запускать/проверять): ./docs/dev.md
- План разработки проекта от текщих задач к горизонту который видим: ./docs/plan.md
- Идеи на будущее (не MVP): ./docs/roadmap.md

## Технологии проекта
- Next.js (App Router) + TypeScript
- Supabase (auth + database)
- UI: Tailwind CSS (Cascading Style Sheets — каскадные таблицы стилей через utility-классы)
-  Google autntification


UI-правила:
- Стили пишем через Tailwind-классы, без раздувания inline-style.
- Повторяемые куски интерфейса выносим в `src/components/`.

## Проверки (обязательно прогонять после изменений)
Всегда:
- Установка: `npm install`
- Dev: `npm run dev`
- Lint (линтер): `npm run lint`
- Build: `npm run build`

Проверка типов:
- Добавь скрипт `typecheck` и используй: `npm run typecheck`

Тесты:
- Если тесты подключены, то:
  - Unit (модульные): `npm test`
  - E2E (end-to-end — сквозные): `npm run test:e2e`
- Если тестов ещё нет в проекте — при первом добавлении используем:
  - Vitest + React Testing Library для unit/компонентных
  - Playwright для e2e
  и фиксируем команды в package.json.


Если меняешь поведение/логику сущностей — обнови документы

## Правила изменений
- Делать минимальные, локальные изменения.
- Не добавлять новые зависимости без необходимости.
- Не трогать ключи/секреты/приватные токены.
