# Разработка

## Требования
- Node.js 20+
- npm

## Переменные окружения
Создайте `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (опционально)

## Команды
- Установка: `npm install` или `make install`
- Dev сервер: `npm run dev` или `make dev`
- Линт: `npm run lint` или `make lint`
- Проверка типов: `npm run typecheck` или `make typecheck`
- Сборка: `npm run build` или `make build`
- Все проверки: `make test-all`

## Docker
- Build + run: `make app`

## Тесты
- Unit/Integration: `npm test` или `make test`
- E2E: `npm run test:e2e` или `make test-e2e`

### Окружение для тестов
Integration-тесты ожидают креденшлы Supabase в env:

- `SUPABASE_URL` (или `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (или `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_TEST_EMAIL`
- `SUPABASE_TEST_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY` (опционально, для авто-создания тестового пользователя)

E2E тесты используют:

- `E2E_BASE_URL` (production URL; локально `http://localhost:3000`)

## i18n (многоязычность)

Приложение использует React Context для переводов (без heavy i18n библиотек).

### Структура
```
src/i18n/
├── config.ts              # Конфигурация языков (ru, en)
├── TranslationContext.tsx # Provider + useTranslation() hook
├── index.ts               # Экспорты
├── locales/
│   ├── ru.json           # Русские переводы
│   └── en.json           # Английские переводы
└── original-texts.md     # Справочник всех ключей
```

### Использование в компоненте
```tsx
import { useTranslation } from "@/src/i18n/TranslationContext";

export default function MyComponent() {
  const { t } = useTranslation();
  return <button>{t("common.save")}</button>;
}
```

### Переменные в переводах
```json
"filters.selected": "Выбрано: {{count}}"
```

### Добавление нового перевода
1. Добавить ключ в `src/i18n/locales/ru.json`
2. Добавить перевод в `src/i18n/locales/en.json`
3. Обновить `original-texts.md`

### Переключатель языка
`LanguageSwitcher` — кнопка в шапке, показывает текущий язык (EN/RU) и переключает на другой.

### Сохранение языка
- При инициализации: приоритет — БД → localStorage → браузер
- При переключении: сохраняется в `users.language` (Supabase) и localStorage

Поле `users.language` добавляется миграцией:
```sql
ALTER TABLE public.users ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
```

### ESLint
Переменные с префиксом `_` игнорируются:
```tsx
export default function Component({ lng: _lng }: Props) {
  // _lng не вызывает предупреждения @typescript-eslint/no-unused-vars
}
```
