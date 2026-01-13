# Документация FlowNotes

Этот каталог содержит документацию проекта.

## Содержание

### Сборка приложения

- **[BUILD.md](./BUILD.md)** — Инструкция по сборке приложения для веба и десктопа. Содержит команды сборки, требования, решение типичных проблем и примеры CI/CD.

### Тестирование

- **[PRODUCT_TESTING_CHECKLIST.md](./PRODUCT_TESTING_CHECKLIST.md)** — Чек-лист для ручного продуктового тестирования. Используйте для проверки всех функций приложения вручную.

- **[TECHNICAL_TESTING_GUIDE.md](./TECHNICAL_TESTING_GUIDE.md)** — Руководство по запуску автоматических тестов. Содержит команды, правила и шаблоны для написания тестов.

## Быстрый старт

### Запуск тестов

```bash
# Frontend unit & component тесты
npm run test:run

# Rust backend тесты  
cd src-tauri && cargo test

# E2E тесты
npm run test:e2e
```

### Ручное тестирование

1. Откройте [PRODUCT_TESTING_CHECKLIST.md](./PRODUCT_TESTING_CHECKLIST.md)
2. Запустите приложение: `npm run tauri dev`
3. Проходите по чек-листу, отмечая статус каждого пункта

## Структура проекта

```
flownotes/
├── docs/                    # ← Вы здесь
│   ├── README.md
│   ├── BUILD.md
│   ├── PRODUCT_TESTING_CHECKLIST.md
│   └── TECHNICAL_TESTING_GUIDE.md
├── src/                     # Frontend (Vue 3)
│   ├── __tests__/           # Unit & Component тесты
│   ├── components/          # Vue компоненты
│   ├── composables/         # Vue composables
│   ├── stores/              # Pinia stores
│   └── views/               # Страницы
├── e2e/                     # E2E тесты (Playwright)
└── src-tauri/               # Backend (Rust/Tauri)
    └── src/
        └── commands/        # Tauri команды + тесты
```
