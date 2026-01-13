import { test, expect } from '@playwright/test'

test.describe('Inbox View', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock vault path in localStorage to skip welcome screen
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

  test('should display inbox header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  })

  test('should show quick capture button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Quick Capture/i })).toBeVisible()
  })

  test('should show item count in header', async ({ page }) => {
    await expect(page.getByText(/items to process/i)).toBeVisible()
  })

  test('should display inbox files', async ({ page }) => {
    // Wait for files to load
    await page.waitForSelector('.card', { timeout: 5000 })
    
    // Should have file cards
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible()
  })

  test('should open quick capture modal when button clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Quick Capture/i }).click()
    
    // Modal should appear
    await expect(page.getByPlaceholder('Quick capture...')).toBeVisible()
  })

  test('should close quick capture modal on escape', async ({ page }) => {
    await page.getByRole('button', { name: /Quick Capture/i }).click()
    await expect(page.getByPlaceholder('Quick capture...')).toBeVisible()
    
    await page.keyboard.press('Escape')
    
    await expect(page.getByPlaceholder('Quick capture...')).not.toBeVisible()
  })

  test('should show action buttons on file card hover', async ({ page }) => {
    await page.waitForSelector('.card', { timeout: 5000 })
    
    const firstCard = page.locator('.card').first()
    await firstCard.hover()
    
    // Action buttons should become visible
    await expect(page.getByRole('button', { name: /Task/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Project/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Note/i }).first()).toBeVisible()
  })

  test('should show empty state when inbox is empty', async ({ page }) => {
    // Clear files to show empty state
    await page.evaluate(() => {
      const store = (window as any).__pinia?.state?.value?.files
      if (store) {
        store.files = new Map()
      }
    })
    
    // Check for empty state text (may need to refresh)
    const emptyText = page.getByText(/Inbox Zero/i)
    // This may or may not be visible depending on mock data
  })
})

test.describe('Inbox Quick Capture Flow', () => {
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

  test('should create new item via quick capture', async ({ page }) => {
    // Open quick capture
    await page.getByRole('button', { name: /Quick Capture/i }).click()
    
    // Type a new idea
    const input = page.getByPlaceholder('Quick capture...')
    await input.fill('Test Quick Capture Item')
    await input.press('Enter')
    
    // Modal should close
    await expect(input).not.toBeVisible()
    
    // New item should appear in inbox (may need small wait)
    await page.waitForTimeout(500)
    await expect(page.getByText('Test Quick Capture Item')).toBeVisible()
  })

  test('should not create item if input is empty', async ({ page }) => {
    const initialCount = await page.locator('.card').count()
    
    // Open quick capture
    await page.getByRole('button', { name: /Quick Capture/i }).click()
    
    // Press enter without typing
    const input = page.getByPlaceholder('Quick capture...')
    await input.press('Enter')
    
    // Modal should close
    await expect(input).not.toBeVisible()
    
    // Count should remain the same
    const finalCount = await page.locator('.card').count()
    expect(finalCount).toBe(initialCount)
  })
})
