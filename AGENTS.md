Проект: веб-приложение (Next.js + TypeScript) с бэкендом на Supabase.

## Документация (входная точка)
- README: `README.md`
- Обзор продукта: `docs/overview.md`
- Экраны/UI: `docs/screens.md`
- Доменные правила: `docs/domain-rules.md`
- Модель данных: `docs/data-model.md`
- Разработка и проверки: `docs/dev.md`
- Текущее состояние/статус: `docs/plan.md`

## Технологии
- Next.js (App Router) + TypeScript
- Supabase (auth + database)
- UI: Tailwind CSS
- Google OAuth

## Структура кода (ключевые места)
- Главная: `app/page.tsx`
- Создание цели: `app/goals/new/page.tsx`
- Детали цели: `app/goals/[id]/page.tsx`
- Статистика: `app/stats/page.tsx`
- Глобальный таймер: `src/components/GlobalTimerBar.tsx`
- Активный таймер (контекст): `src/components/ActiveTimerProvider.tsx`
- Логика периодов/статусов: `src/components/goalPeriods.ts`
- Supabase client: `lib/supabase/client.ts`

## UI правила
- Стили только через Tailwind классы.
- Повторяемые элементы выносить в `src/components/`.

## Проверки (после изменений)
Всегда:
- Установка: `npm install`
- Dev: `npm run dev` или `make dev`
- Lint: `npm run lint`
- Build: `npm run build`

Проверка типов:
- `npm run typecheck`

Тесты:
- Unit/Integration: `npm test`
- E2E: `npm run test:e2e`

## Правила изменений
- Минимальные, локальные изменения.
- Не добавлять зависимости без необходимости.
- Не трогать ключи/секреты.
- Если меняешь поведение/логику — обнови документацию.
- После каждой группы изменений проверяй UI через MCP (Playwright).
