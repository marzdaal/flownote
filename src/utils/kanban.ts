import type { TaskStatus } from '@/types'

export interface KanbanColumnConfig {
  id: string
  title: string
  color: string
  status?: TaskStatus
}

export function reorderColumns<T extends { id: string }>(
  columns: T[],
  activeId: string,
  overId: string | null
): T[] {
  if (!overId || activeId === overId) return columns

  const fromIndex = columns.findIndex(column => column.id === activeId)
  const toIndex = columns.findIndex(column => column.id === overId)

  if (fromIndex === -1 || toIndex === -1) return columns

  const next = columns.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function updateColumnTitle<T extends { id: string; title: string }>(
  columns: T[],
  columnId: string,
  title: string
): T[] {
  return columns.map(column =>
    column.id === columnId ? { ...column, title } : column
  )
}

export function addColumn<T extends { id: string }>(
  columns: T[],
  column: T
): T[] {
  return [...columns, column]
}
