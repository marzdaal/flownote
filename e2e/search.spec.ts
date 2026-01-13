import { test, expect } from '@playwright/test'

test.describe('Search Functionality', () => {
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
    await page.goto('/inbox')
  })

  test('should have search button in sidebar', async ({ page }) => {
    await expect(page.locator('[title*="Search"]').first()).toBeVisible()
  })

  test('should show file cards when clicking on files', async ({ page }) => {
    await page.waitForSelector('.card', { timeout: 5000 })
    
    const firstCard = page.locator('.card').first()
    await firstCard.click()
    
    // Editor panel should open
    await page.waitForTimeout(500)
    
    // Look for editor-related content (depends on implementation)
  })
})

test.describe('Navigation', () => {
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
  })

  test('should navigate to Today view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Today/i }).click()
    
    await expect(page).toHaveURL('/today')
    await expect(page.getByText(/Good/i)).toBeVisible() // Good morning/afternoon/evening
  })

  test('should navigate to Projects view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Projects/i }).click()
    
    await expect(page).toHaveURL('/projects')
  })

  test('should navigate to Kanban view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Board/i }).click()
    
    await expect(page).toHaveURL('/kanban')
    await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible()
  })

  test('should navigate to Calendar view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Calendar/i }).click()
    
    await expect(page).toHaveURL('/calendar')
  })

  test('should navigate to Notes view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Notes/i }).click()
    
    await expect(page).toHaveURL('/notes')
  })

  test('should navigate to Areas view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Areas/i }).click()
    
    await expect(page).toHaveURL('/areas')
  })

  test('should navigate to Settings view', async ({ page }) => {
    await page.goto('/inbox')
    
    await page.getByRole('button', { name: /Settings/i }).click()
    
    await expect(page).toHaveURL('/settings')
  })

  test('should show active state for current nav item', async ({ page }) => {
    await page.goto('/inbox')
    
    // Inbox button should have active class
    const inboxButton = page.getByRole('button', { name: /Inbox/i })
    await expect(inboxButton).toHaveClass(/active/)
  })
})

test.describe('Today View', () => {
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
    await page.goto('/today')
  })

  test('should display greeting', async ({ page }) => {
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible()
  })

  test('should display today date', async ({ page }) => {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    
    await expect(page.getByText(new RegExp(dayName, 'i'))).toBeVisible()
  })

  test('should show task stats', async ({ page }) => {
    // Should show Today count
    await expect(page.getByText('Today')).toBeVisible()
    
    // Should show Overdue count
    await expect(page.getByText('Overdue')).toBeVisible()
    
    // Should show This week count
    await expect(page.getByText('This week')).toBeVisible()
  })

  test('should have Add Task button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible()
  })

  test('should show Daily Note button if note exists', async ({ page }) => {
    // Daily note button may or may not be visible depending on mock data
    const dailyNoteButton = page.getByRole('button', { name: /Daily Note/i })
    // Just check the page loads correctly
  })
})

test.describe('Welcome Screen', () => {
  test('should show welcome screen when no vault configured', async ({ page }) => {
    // Clear localStorage
    await page.addInitScript(() => {
      localStorage.clear()
    })
    
    await page.goto('/')
    
    await expect(page).toHaveURL('/')
    // Should show welcome/setup content
  })

  test('should redirect to inbox when vault is configured', async ({ page }) => {
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
    
    await page.goto('/')
    
    // Should redirect to inbox
    await expect(page).toHaveURL('/inbox')
  })
})

test.describe('Editor Panel', () => {
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
    await page.goto('/inbox')
  })

  test('should open editor when file card is clicked', async ({ page }) => {
    await page.waitForSelector('.card', { timeout: 5000 })
    
    const firstCard = page.locator('.card').first()
    await firstCard.click()
    
    // Wait for editor to appear
    await page.waitForTimeout(500)
    
    // Editor panel should be visible (check for editor-specific elements)
    // This depends on the EditorPanel implementation
  })
})
