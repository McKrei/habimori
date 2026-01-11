Проект: веб-приложение (Next.js + TypeScript) с бэкендом на Supabase.

### Отвечай на русском языке всегда.

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
- i18n: мульти язычность (русский + английский)

## Структура i18n
```
src/i18n/
├── config.ts              # Конфигурация языков (ru, en)
├── TranslationContext.tsx # Provider + useTranslation() hook
├── locales/
│   ├── ru.json           # Русские переводы
│   └── en.json           # Английские переводы
└── original-texts.md     # Справочник всех ключей переводов
```

## UI правила
- Стили только через Tailwind классы.
- Повторяемые элементы выносить в `src/components/`.
- Все пользовательские тексты — через `useTranslation()`.

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

## Мульти язычность (i18n)
При добавлении или изменении пользовательских текстов:
1. Добавить ключ перевода в `src/i18n/locales/ru.json`
2. Добавить перевод в `src/i18n/locales/en.json`
3. Обновить `src/i18n/original-texts.md`
4. Использовать в компоненте: `const { t } = useTranslation(); t("key")`

Пример:
```tsx
// В компоненте
const { t } = useTranslation();
return <button>{t("common.save")}</button>;

// В ru.json
"common.save": "Сохранить"

// В en.json
"common.save": "Save"
```

Переключатель языка: `LanguageSwitcher` — кнопка в шапке (показывает EN/RU).
Язык пользователя сохраняется в `users.language` (Supabase) и восстанавливается при входе.

## Структура кода (ключевые места)
- Главная: `app/page.tsx`
- Создание цели: `app/goals/new/page.tsx`
- Детали цели: `app/goals/[id]/page.tsx`
- Статистика: `app/stats/page.tsx`
- Глобальный таймер: `src/components/GlobalTimerBar.tsx`
- Активный таймер (контекст): `src/components/ActiveTimerProvider.tsx`
- Логика периодов/статусов: `src/components/goalPeriods.ts`
- Supabase client: `lib/supabase/client.ts`
