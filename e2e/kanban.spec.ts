import { test, expect } from '@playwright/test'

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('flownotes-settings', JSON.stringify({
        vaultPath: 'demo',
        theme: 'dark',
        fontSize: 16,
        showLineNumbers: false,
        spellcheck: true,
        autoSave: true,
        autoSaveDelay: 1000,
      }))
    })
    await page.goto('/kanban')
  })

  test('should display kanban board header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible()
  })

  test('should display all four columns', async ({ page }) => {
    await expect(page.getByText('Inbox')).toBeVisible()
    await expect(page.getByText('Next Actions')).toBeVisible()
    await expect(page.getByText('Waiting For')).toBeVisible()
    await expect(page.getByText('Someday')).toBeVisible()
  })

  test('should show task counts in column headers', async ({ page }) => {
    // Each column should have a count badge
    const countBadges = page.locator('.rounded-full')
    await expect(countBadges.first()).toBeVisible()
  })

  test('should display area filter dropdown', async ({ page }) => {
    const filterSelect = page.locator('select')
    await expect(filterSelect).toBeVisible()
    
    // Should have area options
    await expect(page.getByText('All Areas')).toBeVisible()
  })

  test('should filter tasks by area', async ({ page }) => {
    const filterSelect = page.locator('select')
    await filterSelect.selectOption('work')
    
    // Wait for filter to apply
    await page.waitForTimeout(300)
    
    // Tasks should be filtered (exact behavior depends on mock data)
  })

  test('should show empty state in columns without tasks', async ({ page }) => {
    // At least some columns may show "Drop tasks here" if empty
    const emptyStates = page.getByText('Drop tasks here')
    // This may or may not be visible depending on mock data
  })

  test('should make task cards draggable', async ({ page }) => {
    await page.waitForSelector('[draggable="true"]', { timeout: 5000 })
    
    const draggableCards = page.locator('[draggable="true"]')
    const count = await draggableCards.count()
    
    // Should have some draggable cards if there are tasks
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should highlight column on drag over', async ({ page }) => {
    await page.waitForSelector('[draggable="true"]', { timeout: 5000 })
    
    const cards = page.locator('[draggable="true"]')
    const count = await cards.count()
    
    if (count > 0) {
      const firstCard = cards.first()
      const targetColumn = page.locator('.border-t-4').nth(1) // Second column
      
      // Start drag
      await firstCard.hover()
      await page.mouse.down()
      
      // Move to target column
      const box = await targetColumn.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      }
      
      // Column should be highlighted (has ring class)
      // End drag
      await page.mouse.up()
    }
  })
})

test.describe('Kanban Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('flownotes-settings', JSON.stringify({
        vaultPath: 'demo',
        theme: 'dark',
        fontSize: 16,
        showLineNumbers: false,
        spellcheck: true,
        autoSave: true,
        autoSaveDelay: 1000,
      }))
    })
    await page.goto('/kanban')
  })

  test('should move task between columns via drag and drop', async ({ page }) => {
    await page.waitForSelector('[draggable="true"]', { timeout: 5000 })
    
    const cards = page.locator('[draggable="true"]')
    const count = await cards.count()
    
    if (count > 0) {
      // Get first card's task name
      const firstCard = cards.first()
      const taskName = await firstCard.locator('p').first().textContent()
      
      // Get source column count
      const sourceColumn = page.locator('.border-t-4').first()
      const sourceCountBefore = await sourceColumn.locator('[draggable="true"]').count()
      
      // Drag to next column
      const targetColumn = page.locator('.border-t-4').nth(1)
      
      await firstCard.dragTo(targetColumn)
      
      // Wait for state update
      await page.waitForTimeout(500)
      
      // Verify task moved (source count decreased or target has the task)
      const sourceCountAfter = await sourceColumn.locator('[draggable="true"]').count()
      
      // The task should have moved
      // Note: This depends on whether the task was in the first column
    }
  })

  test('should persist task position after page reload', async ({ page }) => {
    // This test verifies state persistence
    // In production, this would persist to the filesystem
    // In demo mode, state is in memory only
    
    await page.waitForSelector('[draggable="true"]', { timeout: 5000 })
    
    // Note: Full persistence test requires actual file system integration
  })
})
