// File types
export interface VaultFile {
  path: string
  name: string
  content: string
  frontmatter: Frontmatter
  folder: string
  createdAt: Date
  modifiedAt: Date
}

export interface Frontmatter {
  [key: string]: unknown
  id?: string // Unique index ID (e.g., WORK-1, HOME-42)
  status?: TaskStatus | ProjectStatus
  area?: AreaType
  project?: string
  due?: string
  priority?: Priority
  waiting_for?: string
  created?: string
  tags?: string[]
  type?: string
  outcome?: string
  start?: string
  end?: string
}

// Task types
export type TaskStatus = 'not-started' | 'next-action' | 'waiting' | 'someday' | 'done'
export type ProjectStatus = 'active' | 'on-hold' | 'completed'
export type Priority = 'high' | 'medium' | 'low'
export type AreaType = string // Dynamic areas

export interface Task extends VaultFile {
  frontmatter: {
    status: TaskStatus
    area?: AreaType
    project?: string
    due?: string
    priority?: Priority
    waiting_for?: string
    created: string
  }
}

export interface Project extends VaultFile {
  frontmatter: {
    status: ProjectStatus
    area?: AreaType
    start?: string
    end?: string
    outcome?: string
  }
}

export interface Note extends VaultFile {
  frontmatter: {
    tags?: string[]
    created: string
  }
}

export interface DailyNote extends VaultFile {
  frontmatter: {
    date: string
  }
}

export interface Area {
  id: string
  name: string
  icon: string
  color: string
  description?: string
}

export interface AreaWithStats extends Area {
  tasksCount: number
  projectsCount: number
}

// View types
export type ViewType = 
  | 'inbox' 
  | 'today' 
  | 'projects' 
  | 'kanban' 
  | 'calendar' 
  | 'notes' 
  | 'areas'
  | 'settings'

export interface NavItem {
  id: ViewType
  label: string
  icon: string
  shortcut?: string
}

// Vault config
export interface VaultConfig {
  path: string
  folders: {
    inbox: string
    projects: string
    tasks: string
    notes: string
    daily: string
    areas: string
    templates: string
    archive: string
  }
}

// Kanban
export interface KanbanColumn {
  id: string
  title: string
  folder: string
  tasks: Task[]
}

// Calendar
export interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  tasks: Task[]
  dailyNote?: DailyNote
}

// Search
export interface SearchResult {
  file: VaultFile
  matches: SearchMatch[]
}

export interface SearchMatch {
  line: number
  content: string
  highlight: [number, number][]
}

// Editor
export interface EditorState {
  file: VaultFile | null
  isModified: boolean
  isSaving: boolean
}

// App settings
export interface AppSettings {
  vaultPath: string
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  showLineNumbers: boolean
  spellcheck: boolean
  autoSave: boolean
  autoSaveDelay: number
}
