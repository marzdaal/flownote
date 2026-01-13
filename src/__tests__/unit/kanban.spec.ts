import { describe, expect, it } from 'vitest'
import { addColumn, reorderColumns, updateColumnTitle } from '@/utils/kanban'

describe('kanban utils', () => {
  it('reorders columns by id', () => {
    const columns = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ]

    const result = reorderColumns(columns, 'a', 'c')
    expect(result.map(column => column.id)).toEqual(['b', 'c', 'a'])
  })

  it('updates a column title', () => {
    const columns = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ]

    const result = updateColumnTitle(columns, 'b', 'Beta')
    expect(result.find(column => column.id === 'b')?.title).toBe('Beta')
  })

  it('adds a new column', () => {
    const columns = [{ id: 'a', title: 'A' }]
    const result = addColumn(columns, { id: 'b', title: 'B' })
    expect(result).toHaveLength(2)
  })
})
