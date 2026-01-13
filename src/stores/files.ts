import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VaultFile, Task, Project, Note, DailyNote, VaultConfig } from '@/types'
import { useIndexingStore } from './indexing'

// Default vault config matching our Obsidian structure
const defaultVaultConfig: VaultConfig = {
  path: '',
  folders: {
    inbox: '00 - Inbox',
    projects: '01 - Projects',
    tasks: '02 - Tasks',
    notes: '03 - Notes',
    daily: '04 - Daily',
    areas: '05 - Areas',
    templates: '06 - Templates',
    archive: 'Archive',
  },
}

export const useFilesStore = defineStore('files', () => {
  // State
  const vaultConfig = ref<VaultConfig>(defaultVaultConfig)
  const files = ref<Map<string, VaultFile>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - Inbox files
  const inboxFiles = computed(() => {
    return Array.from(files.value.values())
      .filter(f => f.folder.includes(vaultConfig.value.folders.inbox))
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
  })

  // Computed - Tasks by status
  const tasks = computed(() => {
    const taskFolder = vaultConfig.value.folders.tasks
    return Array.from(files.value.values())
      .filter(f => f.folder.includes(taskFolder)) as Task[]
  })

  const notStarted = computed(() => 
    tasks.value.filter(t => t.frontmatter.status === 'not-started')
  )

  const nextActions = computed(() => 
    tasks.value.filter(t => 
      t.frontmatter.status === 'next-action' || 
      (t.folder.includes('Next Actions') && !t.frontmatter.status)
    )
  )

  const waitingFor = computed(() => 
    tasks.value.filter(t => 
      t.frontmatter.status === 'waiting' ||
      (t.folder.includes('Waiting For') && !t.frontmatter.status)
    )
  )

  const somedayMaybe = computed(() => 
    tasks.value.filter(t => 
      t.frontmatter.status === 'someday' ||
      (t.folder.includes('Someday Maybe') && !t.frontmatter.status)
    )
  )

  // Computed - Today's tasks
  const todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return nextActions.value.filter(t => t.frontmatter.due === today)
  })

  // Computed - Projects
  const projects = computed(() => {
    return Array.from(files.value.values())
      .filter(f => f.folder.includes(vaultConfig.value.folders.projects)) as Project[]
  })

  const activeProjects = computed(() => 
    projects.value.filter(p => p.frontmatter.status === 'active')
  )

  // Computed - Notes
  const notes = computed(() => {
    return Array.from(files.value.values())
      .filter(f => f.folder.includes(vaultConfig.value.folders.notes)) as Note[]
  })

  // Computed - Daily notes
  const dailyNotes = computed(() => {
    return Array.from(files.value.values())
      .filter(f => f.folder.includes(vaultConfig.value.folders.daily)) as DailyNote[]
  })

  const todayNote = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return dailyNotes.value.find(n => n.name.includes(today))
  })

  // Computed - Stats by area (deprecated - use areasStore directly)
  // Kept for backwards compatibility with tests
  const areaStats = computed(() => {
    // Get unique areas from tasks and projects
    const areaIds = new Set<string>()
    tasks.value.forEach(t => {
      if (t.frontmatter.area) areaIds.add(t.frontmatter.area)
    })
    projects.value.forEach(p => {
      if (p.frontmatter.area) areaIds.add(p.frontmatter.area)
    })
    // Add default areas if no data
    if (areaIds.size === 0) {
      ['work', 'health', 'learning', 'home'].forEach(a => areaIds.add(a))
    }
    
    return Array.from(areaIds).map(area => ({
      id: area,
      name: area.charAt(0).toUpperCase() + area.slice(1),
      tasksCount: tasks.value.filter(t => t.frontmatter.area === area).length,
      projectsCount: projects.value.filter(p => p.frontmatter.area === area).length,
    }))
  })

  // Actions
  async function initVault() {
    isLoading.value = true
    error.value = null

    try {
      // Try to load from Tauri FS if available
      if (vaultConfig.value.path && vaultConfig.value.path !== 'demo') {
        try {
          await loadFromFileSystem(vaultConfig.value.path)
          return
        } catch (e) {
          console.log('Tauri FS not available, using mock data')
        }
      }
      
      // Fallback to mock data
      await loadMockData()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load vault'
    } finally {
      isLoading.value = false
    }
  }

  async function loadFromFileSystem(basePath: string) {
    try {
      const { readDir, readTextFile, stat } = await import('@tauri-apps/plugin-fs')
      
      // Recursive function to read all files
      async function readDirRecursive(dirPath: string) {
        const entries = await readDir(dirPath)
        
        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry.name}`
          
          if (entry.isDirectory) {
            await readDirRecursive(fullPath)
          } else if (entry.name.endsWith('.md')) {
            try {
              const content = await readTextFile(fullPath)
              const fileStats = await stat(fullPath)
              
              const { frontmatter, body } = parseFrontmatter(content)
              
              const file: VaultFile = {
                path: fullPath,
                name: entry.name.replace('.md', ''),
                content: body,
                frontmatter,
                folder: dirPath,
                createdAt: new Date(fileStats.birthtime || Date.now()),
                modifiedAt: new Date(fileStats.mtime || Date.now()),
              }
              
              files.value.set(fullPath, file)
            } catch (e) {
              console.error(`Failed to read file ${fullPath}:`, e)
            }
          }
        }
      }
      
      files.value.clear()
      await readDirRecursive(basePath)
    } catch (e) {
      console.error('Failed to load from file system:', e)
      throw e
    }
  }

  function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
    const trimmed = content.trim()
    
    if (!trimmed.startsWith('---')) {
      return { frontmatter: {}, body: content }
    }

    const endIndex = trimmed.indexOf('---', 3)
    if (endIndex === -1) {
      return { frontmatter: {}, body: content }
    }

    const yamlStr = trimmed.slice(3, endIndex).trim()
    const body = trimmed.slice(endIndex + 3).trim()

    try {
      // Simple YAML parsing
      const frontmatter: Record<string, unknown> = {}
      const lines = yamlStr.split('\n')
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim()
          let value: unknown = line.slice(colonIndex + 1).trim()
          
          // Handle arrays
          if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
            try {
              value = JSON.parse(value.replace(/'/g, '"'))
            } catch {}
          }
          // Handle booleans
          else if (value === 'true') value = true
          else if (value === 'false') value = false
          // Remove quotes
          else if (typeof value === 'string') {
            value = value.replace(/^["']|["']$/g, '')
          }
          
          frontmatter[key] = value
        }
      }

      return { frontmatter, body }
    } catch {
      return { frontmatter: {}, body: content }
    }
  }

  async function loadMockData() {
    const indexingStore = useIndexingStore()
    
    // Reset indexing for clean demo
    indexingStore.reset()
    
    // Clear any old demo files
    files.value.clear()
    
    // Helper to generate ID and register
    const genId = (area?: string, path?: string) => {
      const id = indexingStore.generateId(area)
      if (path) indexingStore.registerFile(path, id)
      return id
    }
    
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    // Mock data for development without Tauri
    const mockFiles: VaultFile[] = [
      // ========== INBOX (необработанные входящие) ==========
      {
        path: '00 - Inbox/Идея автоматизации отчётов.md',
        name: 'Идея автоматизации отчётов',
        content: '# Идея автоматизации отчётов\n\nНа встрече Алексей упомянул инструмент для автоматической генерации отчётов.\nНужно изучить подробнее - возможно, сэкономит 2-3 часа в неделю.',
        frontmatter: { id: genId(undefined, '00 - Inbox/Идея автоматизации отчётов.md'), created: today },
        folder: '00 - Inbox',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '00 - Inbox/Подкаст про продуктивность.md',
        name: 'Подкаст про продуктивность',
        content: '# Подкаст про продуктивность\n\nКоллега посоветовал "Huberman Lab" - эпизод про сон и продуктивность.',
        frontmatter: { id: genId(undefined, '00 - Inbox/Подкаст про продуктивность.md'), created: today },
        folder: '00 - Inbox',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '00 - Inbox/Рецепт смузи.md',
        name: 'Рецепт смузи',
        content: '# Рецепт смузи\n\nБанан + шпинат + миндальное молоко + протеин',
        frontmatter: { id: genId(undefined, '00 - Inbox/Рецепт смузи.md'), created: today },
        folder: '00 - Inbox',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      
      // ========== TASKS - НЕ НАЧАТО (Kanban: первая колонка) ==========
      {
        path: '02 - Tasks/Next Actions/Изучить новый фреймворк.md',
        name: 'Изучить новый фреймворк',
        content: '# Изучить новый фреймворк\n\nПосмотреть туториалы по Solid.js',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Next Actions/Изучить новый фреймворк.md'),
          status: 'not-started', 
          area: 'work', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Купить кроссовки для бега.md',
        name: 'Купить кроссовки для бега',
        content: '# Купить кроссовки для бега\n\nПрисмотреть Nike или Asics',
        frontmatter: { 
          id: genId('health', '02 - Tasks/Next Actions/Купить кроссовки для бега.md'),
          status: 'not-started', 
          area: 'health', 
          priority: 'medium',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Разобрать шкаф.md',
        name: 'Разобрать шкаф',
        content: '# Разобрать шкаф\n\nВыбросить старые вещи, организовать хранение',
        frontmatter: { 
          id: genId('home', '02 - Tasks/Next Actions/Разобрать шкаф.md'),
          status: 'not-started', 
          area: 'home', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      
      // ========== TASKS - NEXT ACTIONS ==========
      {
        path: '02 - Tasks/Next Actions/Собрать данные воронки.md',
        name: 'Собрать данные воронки из Amplitude',
        content: '# Собрать данные воронки из Amplitude\n\n## Цель\nПолучить данные по конверсии за последние 30 дней\n\n## Шаги\n- [ ] Экспорт из Amplitude\n- [ ] Обработка в Python\n- [ ] Визуализация в Tableau',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Next Actions/Собрать данные воронки.md'),
          status: 'next-action', 
          area: 'work', 
          due: today, 
          priority: 'high',
          project: '[[Анализ воронки регистрации]]',
          created: '2026-01-06'
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date('2026-01-06'),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Созвон с командой дизайна.md',
        name: 'Созвон с командой дизайна',
        content: '# Созвон с командой дизайна\n\nОбсудить редизайн страницы регистрации',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Next Actions/Созвон с командой дизайна.md'),
          status: 'next-action', 
          area: 'work', 
          due: today, 
          priority: 'high',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Подготовить презентацию.md',
        name: 'Подготовить презентацию для стендапа',
        content: '# Подготовить презентацию для стендапа\n\nРезультаты анализа воронки за неделю',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Next Actions/Подготовить презентацию.md'),
          status: 'next-action', 
          area: 'work', 
          due: tomorrow, 
          priority: 'medium',
          project: '[[Анализ воронки регистрации]]',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Выбрать приложение для растяжки.md',
        name: 'Выбрать приложение для растяжки',
        content: '# Выбрать приложение для растяжки\n\nВарианты:\n- StretchIt\n- Down Dog\n- Romwod',
        frontmatter: { 
          id: genId('health', '02 - Tasks/Next Actions/Выбрать приложение для растяжки.md'),
          status: 'next-action', 
          area: 'health', 
          due: tomorrow, 
          priority: 'high',
          project: '[[Начать заниматься растяжкой]]',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Пробежка в парке.md',
        name: 'Пробежка в парке',
        content: '# Пробежка в парке\n\n5 км, легкий темп',
        frontmatter: { 
          id: genId('health', '02 - Tasks/Next Actions/Пробежка в парке.md'),
          status: 'next-action', 
          area: 'health', 
          due: today, 
          priority: 'medium',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Купить растения.md',
        name: 'Купить растения для гостиной',
        content: '# Купить растения для гостиной\n\n- Монстера\n- Фикус\n- Сансевиерия',
        frontmatter: { 
          id: genId('home', '02 - Tasks/Next Actions/Купить растения.md'),
          status: 'next-action', 
          area: 'home', 
          due: nextWeek, 
          priority: 'medium',
          project: '[[Украшение гостиной]]',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Next Actions/Пройти урок на Coursera.md',
        name: 'Пройти урок на Coursera',
        content: '# Пройти урок на Coursera\n\nКурс "Machine Learning" - Week 3',
        frontmatter: { 
          id: genId('learning', '02 - Tasks/Next Actions/Пройти урок на Coursera.md'),
          status: 'next-action', 
          area: 'learning', 
          due: today, 
          priority: 'medium',
          project: '[[Изучение ML]]',
          created: today
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      // Просроченная задача
      {
        path: '02 - Tasks/Next Actions/Оплатить счета.md',
        name: 'Оплатить счета за квартиру',
        content: '# Оплатить счета за квартиру\n\nИнтернет, электричество, вода',
        frontmatter: { 
          id: genId('home', '02 - Tasks/Next Actions/Оплатить счета.md'),
          status: 'next-action', 
          area: 'home', 
          due: yesterday, 
          priority: 'high',
          created: '2026-01-05'
        },
        folder: '02 - Tasks/Next Actions',
        createdAt: new Date('2026-01-05'),
        modifiedAt: new Date(),
      },
      
      // ========== TASKS - WAITING FOR ==========
      {
        path: '02 - Tasks/Waiting For/Доступ к таблице платежей.md',
        name: 'Доступ к таблице платежей',
        content: '# Доступ к таблице платежей\n\nЖду доступ от DBA команды',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Waiting For/Доступ к таблице платежей.md'),
          status: 'waiting', 
          area: 'work', 
          waiting_for: '@Дмитрий (DBA)',
          due: tomorrow,
          priority: 'high',
          created: '2026-01-06'
        },
        folder: '02 - Tasks/Waiting For',
        createdAt: new Date('2026-01-06'),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Waiting For/Фидбек по макетам.md',
        name: 'Фидбек по макетам от заказчика',
        content: '# Фидбек по макетам от заказчика\n\nОтправил макеты в понедельник, жду ответ',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Waiting For/Фидбек по макетам.md'),
          status: 'waiting', 
          area: 'work', 
          waiting_for: '@Клиент (Иван)',
          priority: 'medium',
          created: today
        },
        folder: '02 - Tasks/Waiting For',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Waiting For/Результаты анализов.md',
        name: 'Результаты анализов крови',
        content: '# Результаты анализов крови\n\nСдал в лаборатории, обещали через 3 дня',
        frontmatter: { 
          id: genId('health', '02 - Tasks/Waiting For/Результаты анализов.md'),
          status: 'waiting', 
          area: 'health', 
          waiting_for: '@Лаборатория',
          due: nextWeek,
          priority: 'medium',
          created: today
        },
        folder: '02 - Tasks/Waiting For',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Waiting For/Доставка мебели.md',
        name: 'Доставка мебели из IKEA',
        content: '# Доставка мебели из IKEA\n\nЗаказал полку KALLAX, доставка в субботу',
        frontmatter: { 
          id: genId('home', '02 - Tasks/Waiting For/Доставка мебели.md'),
          status: 'waiting', 
          area: 'home', 
          waiting_for: '@IKEA',
          due: nextWeek,
          priority: 'low',
          project: '[[Украшение гостиной]]',
          created: today
        },
        folder: '02 - Tasks/Waiting For',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      
      // ========== TASKS - SOMEDAY/MAYBE ==========
      {
        path: '02 - Tasks/Someday Maybe/Выучить японский.md',
        name: 'Выучить японский язык',
        content: '# Выучить японский язык\n\nХочу смотреть аниме без субтитров',
        frontmatter: { 
          id: genId('learning', '02 - Tasks/Someday Maybe/Выучить японский.md'),
          status: 'someday', 
          area: 'learning', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Someday Maybe',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Someday Maybe/Попробовать скалолазание.md',
        name: 'Попробовать скалолазание',
        content: '# Попробовать скалолазание\n\nЕсть скалодром рядом с домом',
        frontmatter: { 
          id: genId('health', '02 - Tasks/Someday Maybe/Попробовать скалолазание.md'),
          status: 'someday', 
          area: 'health', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Someday Maybe',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Someday Maybe/Написать статью на Хабр.md',
        name: 'Написать статью на Хабр',
        content: '# Написать статью на Хабр\n\nТема: "Как я оптимизировал воронку конверсии"',
        frontmatter: { 
          id: genId('work', '02 - Tasks/Someday Maybe/Написать статью на Хабр.md'),
          status: 'someday', 
          area: 'work', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Someday Maybe',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '02 - Tasks/Someday Maybe/Сделать ремонт на балконе.md',
        name: 'Сделать ремонт на балконе',
        content: '# Сделать ремонт на балконе\n\nУтеплить и обустроить рабочее место',
        frontmatter: { 
          id: genId('home', '02 - Tasks/Someday Maybe/Сделать ремонт на балконе.md'),
          status: 'someday', 
          area: 'home', 
          priority: 'low',
          created: today
        },
        folder: '02 - Tasks/Someday Maybe',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      
      // ========== PROJECTS ==========
      {
        path: '01 - Projects/Анализ воронки регистрации.md',
        name: 'Анализ воронки регистрации',
        content: '# Анализ воронки регистрации\n\n## Цель\nВыявить узкие места в процессе регистрации и повысить конверсию на 15%.\n\n## Этапы\n1. Сбор данных из Amplitude\n2. Анализ drop-off точек\n3. A/B тесты гипотез\n4. Внедрение улучшений\n\n## Связанные задачи\n- [[Собрать данные воронки из Amplitude]]\n- [[Подготовить презентацию для стендапа]]',
        frontmatter: { 
          id: genId('work', '01 - Projects/Анализ воронки регистрации.md'),
          status: 'active', 
          area: 'work',
          start: '2026-01-06',
          outcome: 'Повысить конверсию регистрации на 15%'
        },
        folder: '01 - Projects',
        createdAt: new Date('2026-01-06'),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Дашборд метрик продукта.md',
        name: 'Дашборд метрик продукта',
        content: '# Дашборд метрик продукта\n\n## Цель\nСоздать единый дашборд для отслеживания ключевых метрик.\n\n## Метрики\n- DAU/WAU/MAU\n- Retention\n- Revenue\n- NPS',
        frontmatter: { 
          id: genId('work', '01 - Projects/Дашборд метрик продукта.md'),
          status: 'active', 
          area: 'work',
          start: '2026-01-02',
          outcome: 'Автоматический дашборд в Tableau'
        },
        folder: '01 - Projects',
        createdAt: new Date('2026-01-02'),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Начать заниматься растяжкой.md',
        name: 'Начать заниматься растяжкой',
        content: '# Начать заниматься растяжкой\n\n## Цель\nВыработать привычку ежедневной растяжки для здоровья спины.\n\n## План\n- Выбрать приложение\n- Заниматься 15 минут каждое утро\n- Отслеживать прогресс',
        frontmatter: { 
          id: genId('health', '01 - Projects/Начать заниматься растяжкой.md'),
          status: 'active', 
          area: 'health',
          start: today,
          outcome: 'Привычка растяжки каждое утро'
        },
        folder: '01 - Projects',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Подготовка к марафону.md',
        name: 'Подготовка к марафону',
        content: '# Подготовка к марафону\n\n## Цель\nПробежать полумарафон весной 2026.\n\n## План тренировок\n- Январь: 20 км/неделю\n- Февраль: 30 км/неделю\n- Март: 40 км/неделю',
        frontmatter: { 
          id: genId('health', '01 - Projects/Подготовка к марафону.md'),
          status: 'active', 
          area: 'health',
          start: '2026-01-01',
          outcome: 'Финишировать полумарафон'
        },
        folder: '01 - Projects',
        createdAt: new Date('2026-01-01'),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Украшение гостиной.md',
        name: 'Украшение гостиной',
        content: '# Украшение гостиной\n\n## Цель\nСоздать уютное пространство для отдыха.\n\n## Идеи\n- Растения\n- Новое освещение\n- Картины/постеры\n- Текстиль',
        frontmatter: { 
          id: genId('home', '01 - Projects/Украшение гостиной.md'),
          status: 'active', 
          area: 'home',
          start: '2026-01-02',
          outcome: 'Уютная гостиная с продуманным декором'
        },
        folder: '01 - Projects',
        createdAt: new Date('2026-01-02'),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Изучение ML.md',
        name: 'Изучение ML',
        content: '# Изучение Machine Learning\n\n## Цель\nОсвоить основы ML для применения в продуктовой аналитике.\n\n## Ресурсы\n- Coursera: Andrew Ng ML Course\n- Книга: "Hands-On ML"\n- Kaggle competitions',
        frontmatter: { 
          id: genId('learning', '01 - Projects/Изучение ML.md'),
          status: 'active', 
          area: 'learning',
          start: '2026-01-05',
          outcome: 'Построить предиктивную модель churn'
        },
        folder: '01 - Projects',
        createdAt: new Date('2026-01-05'),
        modifiedAt: new Date(),
      },
      {
        path: '01 - Projects/Лечение зубов.md',
        name: 'Лечение зубов',
        content: '# Лечение зубов\n\n## План\n- Консультация\n- Чистка\n- Лечение кариеса\n- Установка пломб',
        frontmatter: { 
          id: genId('health', '01 - Projects/Лечение зубов.md'),
          status: 'on-hold', 
          area: 'health',
          start: '2025-12-15',
          outcome: 'Здоровые зубы'
        },
        folder: '01 - Projects',
        createdAt: new Date('2025-12-15'),
        modifiedAt: new Date(),
      },
      
      // ========== NOTES ==========
      {
        path: '03 - Notes/Метрики воронки конверсии.md',
        name: 'Метрики воронки конверсии',
        content: '# Метрики воронки конверсии\n\n## Основные метрики\n- **Conversion Rate** — % пользователей, прошедших воронку\n- **Drop-off Rate** — % отвала на каждом шаге\n- **Time to Convert** — время до конверсии\n\n## Формулы\n```\nCR = (Conversions / Visitors) × 100%\nDrop-off = 1 - (Step N / Step N-1)\n```',
        frontmatter: { 
          id: genId('work', '03 - Notes/Метрики воронки конверсии.md'),
          area: 'work',
          tags: ['analytics', 'metrics', 'conversion'],
          created: '2026-01-05'
        },
        folder: '03 - Notes',
        createdAt: new Date('2026-01-05'),
        modifiedAt: new Date(),
      },
      {
        path: '03 - Notes/SQL оптимизация запросов.md',
        name: 'SQL оптимизация запросов',
        content: '# SQL оптимизация запросов\n\n## Основные приёмы\n- Используй EXPLAIN ANALYZE\n- Добавляй индексы на часто фильтруемые колонки\n- Избегай SELECT *\n- Используй LIMIT при отладке\n\n## Полезные ресурсы\n- [[https://use-the-index-luke.com]]',
        frontmatter: { 
          id: genId('learning', '03 - Notes/SQL оптимизация запросов.md'),
          area: 'learning',
          tags: ['sql', 'database', 'optimization'],
          created: today
        },
        folder: '03 - Notes',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '03 - Notes/Польза растяжки для здоровья.md',
        name: 'Польза растяжки для здоровья',
        content: '# Польза растяжки для здоровья\n\n## Преимущества\n- Улучшает гибкость\n- Снижает риск травм\n- Уменьшает боли в спине\n- Улучшает осанку\n- Снижает стресс\n\n## Рекомендации\n- Растягиваться после разогрева\n- Удерживать каждую позу 30 секунд\n- Не делать резких движений',
        frontmatter: { 
          id: genId('health', '03 - Notes/Польза растяжки для здоровья.md'),
          area: 'health',
          tags: ['health', 'fitness', 'stretching'],
          created: today
        },
        folder: '03 - Notes',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '03 - Notes/Принципы минимализма в интерьере.md',
        name: 'Принципы минимализма в интерьере',
        content: '# Принципы минимализма в интерьере\n\n## Основы\n- Меньше вещей — больше пространства\n- Качество важнее количества\n- Нейтральные цвета + акценты\n- Функциональная мебель\n\n## Практические шаги\n1. Избавиться от лишнего\n2. Организовать хранение\n3. Выбрать качественные базовые вещи',
        frontmatter: { 
          id: genId('home', '03 - Notes/Принципы минимализма в интерьере.md'),
          area: 'home',
          tags: ['home', 'minimalism', 'design'],
          created: today
        },
        folder: '03 - Notes',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      {
        path: '03 - Notes/Retention анализ.md',
        name: 'Retention анализ',
        content: '# Retention анализ\n\n## Типы retention\n- **Day 1 Retention** — вернулись на следующий день\n- **Week 1 Retention** — вернулись через неделю\n- **Rolling Retention** — вернулись хотя бы раз после N дней\n\n## Когортный анализ\nГруппировка пользователей по дате регистрации для сравнения retention разных когорт.',
        frontmatter: { 
          id: genId('work', '03 - Notes/Retention анализ.md'),
          area: 'work',
          tags: ['analytics', 'retention', 'cohort'],
          created: '2026-01-03'
        },
        folder: '03 - Notes',
        createdAt: new Date('2026-01-03'),
        modifiedAt: new Date(),
      },
      {
        path: '03 - Notes/Заметки по ML курсу.md',
        name: 'Заметки по ML курсу',
        content: '# Заметки по ML курсу\n\n## Week 1: Введение\n- Supervised vs Unsupervised learning\n- Regression vs Classification\n\n## Week 2: Linear Regression\n- Cost function: J(θ)\n- Gradient descent\n\n## Week 3: Logistic Regression\n- Sigmoid function\n- Decision boundary',
        frontmatter: { 
          id: genId('learning', '03 - Notes/Заметки по ML курсу.md'),
          area: 'learning',
          tags: ['ml', 'coursera', 'notes'],
          created: '2026-01-05'
        },
        folder: '03 - Notes',
        createdAt: new Date('2026-01-05'),
        modifiedAt: new Date(),
      },
      
      // ========== DAILY NOTE ==========
      {
        path: `04 - Daily/${today}.md`,
        name: today,
        content: `# ${today}\n\n## План на день\n- [ ] Созвон с дизайнерами\n- [ ] Собрать данные воронки\n- [ ] Пробежка 5 км\n- [ ] Урок на Coursera\n\n## Заметки\n- Утром хорошо выспался\n- Нужно не забыть про счета\n\n## Итоги дня\n...`,
        frontmatter: { 
          date: today,
          created: today
        },
        folder: '04 - Daily',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    ]

    mockFiles.forEach(file => {
      files.value.set(file.path, file)
    })
    
    console.log(`Demo data loaded: ${mockFiles.length} files`)
  }

  async function createFile(
    folder: string, 
    name: string, 
    content: string, 
    frontmatter: Record<string, unknown> = {}
  ) {
    const indexingStore = useIndexingStore()
    const now = new Date()
    
    // Generate unique ID based on area only (like JIRA: WORK-1, HOME-2)
    const area = frontmatter.area as string | undefined
    const itemId = indexingStore.generateId(area)
    
    // Generate unique filename - allow duplicates by adding counter suffix
    let baseName = name
    let finalPath = `${folder}/${baseName}.md`
    let counter = 1
    
    // Check if file exists and add suffix if needed
    while (files.value.has(finalPath)) {
      baseName = `${name} (${counter})`
      finalPath = `${folder}/${baseName}.md`
      counter++
    }
    
    const file: VaultFile = {
      path: finalPath,
      name: baseName,
      content,
      frontmatter: { 
        ...frontmatter, 
        id: itemId,
        created: now.toISOString().split('T')[0] 
      },
      folder,
      createdAt: now,
      modifiedAt: now,
    }

    files.value.set(finalPath, file)
    indexingStore.registerFile(finalPath, itemId)
    
    return file
  }

  async function updateFile(path: string, updates: Partial<VaultFile>) {
    const file = files.value.get(path)
    if (!file) return

    // Merge frontmatter, keeping the original ID (never changes)
    const newFrontmatter = updates.frontmatter 
      ? { ...file.frontmatter, ...updates.frontmatter, id: file.frontmatter.id }
      : file.frontmatter

    const updated = {
      ...file,
      ...updates,
      frontmatter: newFrontmatter,
      modifiedAt: new Date(),
    }

    files.value.set(path, updated)
    return updated
  }

  async function moveFile(oldPath: string, newFolder: string, applyTemplate?: string) {
    const indexingStore = useIndexingStore()
    const file = files.value.get(oldPath)
    if (!file) return

    // Generate unique filename - allow duplicates by adding counter suffix
    let baseName = file.name
    let newPath = `${newFolder}/${baseName}.md`
    let counter = 1
    
    while (files.value.has(newPath) && newPath !== oldPath) {
      baseName = `${file.name} (${counter})`
      newPath = `${newFolder}/${baseName}.md`
      counter++
    }
    
    // Remove old
    files.value.delete(oldPath)

    // Update path in index (ID stays the same!)
    indexingStore.updateFilePath(oldPath, newPath)

    // Create new with updated folder and potentially new name
    // ID never changes - it's permanent like in JIRA
    const updated: VaultFile = {
      ...file,
      path: newPath,
      name: baseName,
      folder: newFolder,
      modifiedAt: new Date(),
    }

    // Apply template frontmatter if specified (but keep ID)
    if (applyTemplate === 'task') {
      updated.frontmatter = {
        ...updated.frontmatter,
        status: 'next-action',
        priority: 'medium',
      }
    } else if (applyTemplate === 'project') {
      updated.frontmatter = {
        ...updated.frontmatter,
        status: 'active',
        start: new Date().toISOString().split('T')[0],
      }
    }

    files.value.set(newPath, updated)
    return updated
  }

  async function deleteFile(path: string) {
    const indexingStore = useIndexingStore()
    files.value.delete(path)
    indexingStore.unregisterFile(path)
  }

  function getFile(path: string) {
    return files.value.get(path)
  }

  function searchFiles(query: string) {
    const lowerQuery = query.toLowerCase()
    return Array.from(files.value.values()).filter(file => 
      file.name.toLowerCase().includes(lowerQuery) ||
      file.content.toLowerCase().includes(lowerQuery)
    )
  }

  return {
    // State
    vaultConfig,
    files,
    isLoading,
    error,
    
    // Computed
    inboxFiles,
    tasks,
    notStarted,
    nextActions,
    waitingFor,
    somedayMaybe,
    todayTasks,
    projects,
    activeProjects,
    notes,
    dailyNotes,
    todayNote,
    areaStats,
    
    // Actions
    initVault,
    createFile,
    updateFile,
    moveFile,
    deleteFile,
    getFile,
    searchFiles,
  }
})
