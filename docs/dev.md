## Разработка

### Требования

- Node.js 20+
- npm

### Переменные окружения

Создать `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (опционально; используется при наличии)

> В Supabase должен быть включен Google OAuth provider.

### Команды

- Установка: `npm install` или `make install`
- Dev: `npm run dev` или `make dev`
- Lint: `npm run lint` или `make lint`
- Typecheck: `npm run typecheck` или `make typecheck`
- Unit tests: `npm run test` или `make test`
- E2E tests: `npm run test:e2e` или `make test-e2e`
- Build: `npm run build` или `make build`

### Docker

- Сборка и запуск: `make app`
