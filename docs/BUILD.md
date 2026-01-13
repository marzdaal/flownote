# Инструкция по сборке приложения

FlowNotes - это гибридное приложение, которое может работать как веб-приложение и как десктопное приложение (на базе Tauri).

## Предварительные требования

### Для веб-версии:
- **Node.js** версии 18 или выше
- **npm** или **yarn**

### Для десктопной версии:
- Все требования для веб-версии
- **Rust** (последняя стабильная версия)
  - Установка: https://www.rust-lang.org/tools/install
- **Системные зависимости для Tauri:**
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **Windows**: Microsoft Visual Studio C++ Build Tools, WebView2

## Установка зависимостей

```bash
cd flownotes
npm install
```

## Сборка веб-версии

### Режим разработки

Запуск веб-версии в режиме разработки с hot-reload:

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:1420`

### Production сборка

Сборка оптимизированной версии для production:

```bash
npm run build
```

Собранные файлы будут находиться в папке `dist/`.

### Предпросмотр production сборки

Просмотр собранной веб-версии локально:

```bash
npm run preview
```

## Сборка десктопной версии

### Режим разработки

Запуск десктопного приложения в режиме разработки:

```bash
npm run tauri dev
```

Эта команда:
1. Запускает Vite dev server на порту 1420
2. Компилирует Rust код
3. Открывает десктопное окно приложения

### Production сборка

Сборка десктопного приложения для production:

```bash
npm run tauri build
```

Эта команда:
1. Собирает веб-версию (`npm run build`)
2. Компилирует Rust код в release режиме
3. Создает установщик приложения

#### Расположение собранных файлов:

- **macOS**: `src-tauri/target/release/bundle/macos/FlowNotes.app`
- **Windows**: `src-tauri/target/release/bundle/msi/FlowNotes_0.1.0_x64_en-US.msi`
- **Linux**: `src-tauri/target/release/bundle/appimage/FlowNotes_0.1.0_amd64.AppImage`

### Сборка для конкретной платформы

#### macOS:
```bash
npm run tauri build -- --target x86_64-apple-darwin  # Intel
npm run tauri build -- --target aarch64-apple-darwin # Apple Silicon
```

#### Windows:
```bash
npm run tauri build -- --target x86_64-pc-windows-msvc
```

#### Linux:
```bash
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Конфигурация сборки

### Веб-версия

Конфигурация находится в `vite.config.ts`:
- Порт разработки: `1420`
- Алиасы путей: `@` → `src/`

### Десктопная версия

Конфигурация находится в `src-tauri/tauri.conf.json`:
- Название приложения: `FlowNotes`
- Идентификатор: `com.flownotes.app`
- Версия: `0.1.0`
- Размеры окна: 1200x800 (минимум 800x600)

## Типичные проблемы и решения

### Порт 1420 уже занят

**Проблема**: `Error: Port 1420 is already in use`

**Решение**:
```bash
# macOS/Linux
lsof -ti:1420 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 1420).OwningProcess | Stop-Process
```

### Ошибки компиляции Rust

**Проблема**: Ошибки при сборке Tauri приложения

**Решение**:
1. Убедитесь, что Rust установлен: `rustc --version`
2. Обновите Rust: `rustup update`
3. Очистите кэш сборки: `cd src-tauri && cargo clean`
4. Пересоберите: `npm run tauri build`

### Отсутствуют системные зависимости (Linux)

**Проблема**: Ошибки компиляции на Linux

**Решение**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### WebView2 не установлен (Windows)

**Проблема**: Ошибки при запуске на Windows

**Решение**: Установите WebView2 Runtime:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Оптимизация сборки

### Уменьшение размера веб-версии

Vite автоматически оптимизирует сборку. Для дополнительной оптимизации можно:
- Использовать code splitting
- Настроить tree-shaking
- Минифицировать CSS и JS (включено по умолчанию в production)

### Уменьшение размера десктопной версии

Tauri автоматически создает минимальные бандлы. Размер обычно составляет 5-15 MB.

Для дополнительной оптимизации:
- Используйте `cargo build --release` с флагами оптимизации
- Настройте исключения в `tauri.conf.json` для ненужных ресурсов

## Проверка сборки

### Проверка веб-версии

После сборки проверьте:
1. Откройте `dist/index.html` в браузере
2. Проверьте консоль на наличие ошибок
3. Убедитесь, что все маршруты работают

### Проверка десктопной версии

После сборки проверьте:
1. Запустите собранное приложение
2. Проверьте работу всех функций
3. Убедитесь, что файловая система доступна (для работы с vault)

## CI/CD

### GitHub Actions пример

```yaml
name: Build

on: [push, pull_request]

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build

  build-desktop:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: tauri-apps/tauri-action@v0
        with:
          projectPath: ./flownotes
          tagName: ${{ github.ref_name }}
          releaseName: 'FlowNotes v__VERSION__'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: true
          prerelease: false
```

## Дополнительные команды

### Очистка

```bash
# Очистка node_modules и переустановка
rm -rf node_modules package-lock.json
npm install

# Очистка Rust кэша
cd src-tauri
cargo clean
cd ..

# Очистка всех собранных файлов
rm -rf dist
rm -rf src-tauri/target
```

### Проверка типов

```bash
npm run build  # Включает проверку типов через vue-tsc
```

### Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Все тесты
npm run test:run && npm run test:e2e
```

## Структура проекта

```
flownotes/
├── src/              # Исходный код Vue приложения
├── src-tauri/        # Rust код для Tauri
│   ├── src/          # Rust исходники
│   ├── Cargo.toml    # Rust зависимости
│   └── tauri.conf.json # Конфигурация Tauri
├── dist/             # Собранная веб-версия (после npm run build)
├── package.json      # Node.js зависимости и скрипты
├── vite.config.ts    # Конфигурация Vite
└── docs/             # Документация
```

## Полезные ссылки

- [Tauri Documentation](https://tauri.app/)
- [Vite Documentation](https://vitejs.dev/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Rust Documentation](https://www.rust-lang.org/learn)
