# Централизованный Data Layer (App Store)

## Цель
Снизить количество запросов к Supabase и сделать интерфейс реактивным без перезагрузок.

## Что было
- Каждый компонент делал свои запросы при mount.
- Переключение дат вызывало каскадные запросы.
- Отдельные хуки (`useContexts`, `useTags`, `useHomeGoalData`, `useDayStatusMap`, `useGoalDetails`, `useTimeLogs`) дублировали загрузку.

## Что сделано
Создан централизованный App Store с подпиской на слайсы через `useSyncExternalStore`.

Ключевые файлы:
- `src/store/types.ts` — типы состояния и действий.
- `src/store/createStore.ts` — редьюсер и store.
- `src/store/loader.ts` — параллельная загрузка данных.
- `src/store/selectors.ts` — вычисляемые статусы и метрики (локально).
- `src/store/mutations.ts` — оптимистические мутации.
- `src/store/sync.ts` — batched sync + `localStorage` persist.
- `src/store/AppStoreProvider.tsx` — provider + hooks.

## Архитектура и связи
### Провайдер
`AppStoreProvider`:
- `initSync(store)` — восстанавливает pending мутации и синхронизирует.
- `initializeStore(store)` — параллельная загрузка данных.

### Хуки/слайсы
- `useAppContexts()` / `useAppTags()` — данные справочников без отдельных запросов.
- `useActiveTimer()` — активный таймер из store.
- `useGoalsForDate(date)` — цели для выбранной даты.
- `useGoalStatusMap(goals, date)` — статус по целям (локальный расчет).
- `useDayStatusMapFromStore(days)` — статусы для календаря (локально).
- `useTimeSecondsMap(goals, date)` / `useCheckStatesMap(goals, date)` — локальные метрики.

### Где используется
- Главная: `src/components/home/useHomeGoalData.tsx`
  - Берет `goals`, `statusMap`, `timeSecondsMap`, `checkStates` из store.
  - Мутации: `addCounterEvent`, `addCheckEvent`.
- Календарь: `src/components/calendar/useDayStatusMap.tsx`
  - Берет данные из store.
- Детали цели: `src/components/goal-details/useGoalDetails.tsx`
  - Все события и прогресс — из store.
- Тайм‑логи: `src/components/time-logs/useTimeLogs.ts`
  - Данные берутся из store, локальная агрегация.
- Статистика: `app/stats/useStatsData.ts`
  - Статусы и время берутся из store.

## Как теперь работает синхронизация
### Оптимистические мутации
`counter_events` / `check_events` / `time_entries`:
- Сразу обновляют store (UI мгновенно реагирует).
- Добавляются в очередь `pendingMutations`.

### Persist + восстановление
- Очередь `pendingMutations` сохраняется в `localStorage`.
- При старте восстанавливается и синхронизируется.
- При загрузке данных store мерджит pending‑события с ответами сервера.

### Предотвращение дублей
- ID создается сервером (UUID), после insert store заменяет временный ID на реальный.
- При rehydrate применяется дедуп по сигнатуре события.

## Таймер
- Таймер старт/стоп — immediate write (не батчится).
- UI для таймера считает elapsed локально, без двойного суммирования.

## Итоговая оптимизация
- Вместо множества последовательных запросов — один набор параллельных запросов при старте.
- При переключении даты запросы не выполняются — используется локальный cache.
- Все UI‑компоненты получают данные из единого источника.

## Важно
- Если правится data‑layer, обновляй этот документ.
- При добавлении новых событий — добавляй их в store + sync.
