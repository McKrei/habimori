# Тестирование

## Unit/компонентные тесты

- Фреймворк: Vitest + React Testing Library.
- Команда: `npm run test`.

## E2E тесты

- Фреймворк: Playwright.
- Команда: `npm run test:e2e`.

### Окружение

E2E тесты запускаются в окружении с доступом к Supabase. Убедитесь, что:

- заданы `NEXT_PUBLIC_SUPABASE_URL` и ключи Supabase;
- Google OAuth настроен в Supabase (для ручных проверок);
- если тесты запускаются против удалённого окружения, задайте `PLAYWRIGHT_BASE_URL`.
