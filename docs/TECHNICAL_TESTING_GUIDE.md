# Руководство по техническому тестированию FlowNotes

Этот документ содержит правила и процедуры для запуска автоматических тестов.

---

## Структура тестов

```
flownotes/
├── src/
│   └── __tests__/
│       ├── setup.ts              # Настройка тестового окружения
│       ├── unit/                 # Unit тесты
│       │   ├── useMarkdown.spec.ts
│       │   ├── useSearch.spec.ts
│       │   └── stores/
│       │       ├── files.spec.ts
│       │       ├── ui.spec.ts
│       │       └── settings.spec.ts
│       └── components/           # Component тесты
│           ├── FileCard.spec.ts
│           ├── TaskItem.spec.ts
│           └── TiptapEditor.spec.ts
├── e2e/                          # E2E тесты (Playwright)
│   ├── inbox.spec.ts
│   ├── kanban.spec.ts
│   └── search.spec.ts
└── src-tauri/
    └── src/
        └── commands/             # Rust тесты (inline)
            ├── files.rs          # #[cfg(test)] mod tests
            ├── search.rs
            └── templates.rs
```

---

## Правила запуска тестов

### Когда запускать тесты

| Ситуация | Какие тесты запускать |
|----------|----------------------|
| Изменения в composables | `npm run test:run -- useMarkdown useSearch` |
| Изменения в stores | `npm run test:run -- stores/` |
| Изменения в компонентах | `npm run test:run -- components/` |
| Изменения в Rust backend | `cd src-tauri && cargo test` |
| Перед коммитом | `npm run test:run` + `cargo test` |
| Перед релизом | Все тесты + E2E |

### Команды запуска

```bash
# ====== FRONTEND ТЕСТЫ (Vitest) ======

# Все тесты в watch режиме
npm run test

# Однократный запуск всех тестов
npm run test:run

# Конкретный файл
npm run test:run -- useMarkdown.spec.ts

# Конкретная папка
npm run test:run -- unit/stores/

# С покрытием кода
npm run test:coverage

# ====== RUST ТЕСТЫ ======

# Все Rust тесты
cd src-tauri && cargo test

# Конкретный модуль
cargo test files::tests

# С выводом println!
cargo test -- --nocapture

# Только один тест
cargo test test_parse_valid_frontmatter

# ====== E2E ТЕСТЫ (Playwright) ======

# Все E2E тесты
npm run test:e2e

# С UI
npm run test:e2e:ui

# Конкретный файл
npx playwright test inbox.spec.ts

# Конкретный браузер
npx playwright test --project=chromium
```

---

## Правила для AI (Claude) при тестировании

### Перед внесением изменений в код

1. **Запустить релевантные тесты** для файлов, которые будут изменены
2. **Убедиться, что тесты проходят** до начала изменений
3. **Запомнить количество тестов** для проверки после изменений

### После внесения изменений

1. **Запустить те же тесты снова**
2. **Проверить, что количество пройденных тестов не уменьшилось**
3. **Если тесты падают** — исправить код, а не тесты (если только тесты не устарели)

### При добавлении новой функциональности

1. **Написать тесты ДО или ВМЕСТЕ с кодом**
2. **Покрыть тестами**:
   - Happy path (нормальный сценарий)
   - Edge cases (граничные случаи)
   - Error cases (ошибочные ситуации)
3. **Минимальное покрытие**:
   - Composables: функции должны быть покрыты на 80%+
   - Stores: actions и computed должны быть покрыты
   - Components: рендеринг props, user interactions

### Чек-лист перед отправкой изменений

```
[ ] npm run test:run — все тесты проходят
[ ] cargo test — все Rust тесты проходят  
[ ] Нет новых warning-ов в консоли
[ ] Если добавлена новая функция — есть тесты
[ ] Если исправлен баг — есть тест, предотвращающий регрессию
```

---

## Что тестировать в каждом модуле

### useMarkdown.ts

| Функция | Что тестировать |
|---------|-----------------|
| `parseFrontmatter` | Валидный YAML, пустой контент, без frontmatter, некорректный YAML, массивы, булевы значения, числа, строки с двоеточиями |
| `serializeMarkdown` | Корректная сериализация, пустой frontmatter, массивы, спецсимволы |
| `extractWikilinks` | Одиночные ссылки, множественные, вложенные, пустой контент |
| `extractTags` | Из frontmatter, inline теги, дедупликация |
| `markdownToHtml` | Заголовки, форматирование, ссылки, wikilinks |
| `getTitle` | H1 в начале, H1 не в начале, без H1 |

### useSearch.ts

| Функция | Что тестировать |
|---------|-----------------|
| `setQuery` / `results` | Поиск по title, content, tags; сортировка по релевантности; лимит результатов |
| `fuzzyMatch` | Exact match, fuzzy match, пустые строки |
| `getFileSuggestions` | Фильтрация, сортировка, лимит |

### stores/files.ts

| Область | Что тестировать |
|---------|-----------------|
| Computed | `inboxFiles`, `tasks`, `nextActions`, `waitingFor`, `somedayMaybe`, `todayTasks`, `projects`, `notes`, `dailyNotes`, `areaStats` |
| Actions | `createFile`, `updateFile`, `moveFile`, `deleteFile`, `searchFiles` |
| Edge cases | Пустой vault, несуществующие пути, дубликаты |

### stores/ui.ts

| Область | Что тестировать |
|---------|-----------------|
| State | Начальные значения |
| Actions | `openEditor`, `closeEditor`, `openQuickCapture`, `saveQuickCapture`, `setFilter`, `clearFilters` |
| Computed | `isEditing` |

### stores/settings.ts

| Область | Что тестировать |
|---------|-----------------|
| Persistence | Загрузка из localStorage, сохранение при изменении |
| Actions | `updateSetting`, `resetSettings` |

### Rust: files.rs

| Функция | Что тестировать |
|---------|-----------------|
| `parse_frontmatter` | Все типы данных YAML, edge cases |
| `read_vault` | Рекурсивное чтение, игнорирование .obsidian, только .md |
| `read_file` / `write_file` | CRUD операции, несуществующие файлы |
| `move_file` | Перемещение, создание директорий |
| `list_files` | Листинг, игнорирование hidden |

### Rust: search.rs

| Функция | Что тестировать |
|---------|-----------------|
| `search_files` | Поиск по имени, контенту, case-insensitive, highlight positions, сортировка |

### Rust: templates.rs

| Функция | Что тестировать |
|---------|-----------------|
| `apply_template` | task, project, note, daily шаблоны; сохранение существующих полей; удаление неподходящих полей |

---

## Интерпретация результатов

### Vitest output

```
✓ src/__tests__/unit/useMarkdown.spec.ts (25 tests) 42ms
✓ src/__tests__/unit/useSearch.spec.ts (18 tests) 38ms
✓ src/__tests__/unit/stores/files.spec.ts (22 tests) 51ms

Test Files  3 passed (3)
Tests       65 passed (65)
```

**Всё хорошо**: все тесты зелёные

```
× src/__tests__/unit/useMarkdown.spec.ts (24 tests | 1 failed)
  × parseFrontmatter › should parse arrays
    AssertionError: expected [] to equal ["work", "urgent"]
```

**Есть проблема**: нужно исправить код или тест

### Cargo test output

```
running 15 tests
test commands::files::tests::parse_frontmatter_tests::test_parse_valid_frontmatter ... ok
test commands::files::tests::parse_frontmatter_tests::test_parse_no_frontmatter ... ok
...
test result: ok. 15 passed; 0 failed; 0 ignored
```

**Всё хорошо**: все тесты пройдены

---

## Добавление новых тестов

### Шаблон unit теста (Vitest)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useMyComposable } from '@/composables/useMyComposable'

describe('useMyComposable', () => {
  describe('myFunction', () => {
    it('should do X when Y', () => {
      const { myFunction } = useMyComposable()
      
      const result = myFunction(input)
      
      expect(result).toBe(expected)
    })
    
    it('should handle edge case', () => {
      // ...
    })
    
    it('should throw on invalid input', () => {
      expect(() => myFunction(null)).toThrow()
    })
  })
})
```

### Шаблон component теста

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' }
    })
    
    expect(wrapper.text()).toContain('Test')
  })

  it('should emit event on click', async () => {
    const wrapper = mount(MyComponent)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### Шаблон Rust теста

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_my_function() {
        let dir = tempdir().unwrap();
        // setup
        
        let result = my_function(args).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().field, expected);
    }
    
    #[tokio::test]
    async fn test_my_function_error_case() {
        let result = my_function(invalid_args).await;
        
        assert!(result.is_err());
    }
}
```

---

## Troubleshooting

### Тесты не запускаются

```bash
# Проверить установку зависимостей
npm install

# Для Rust
cd src-tauri && cargo build
```

### Тесты падают с timeout

```bash
# Увеличить timeout в vite.config.ts
test: {
  testTimeout: 10000,
}
```

### E2E тесты падают

```bash
# Переустановить браузеры
npx playwright install

# Проверить, что dev сервер запущен
npm run dev
```

### Rust тесты не компилируются

```bash
# Проверить зависимости
cd src-tauri && cargo check

# Обновить lock файл
cargo update
```
