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
