## Разработка

### Требования

- Node.js 20+
- npm

### Переменные окружения

Создать `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Команды

- Установка: `npm install`
- Dev: `npm run dev` или `make run`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

### Docker

- Сборка и запуск: `make app`

### Тесты

- Unit: `npm test` (если подключены)
- E2E: `npm run test:e2e` (если подключены)
