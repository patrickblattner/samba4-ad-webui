import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill('Administrator')
  await page.getByLabel('Password').fill('Admin1234!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 10000 })
}

async function navigateToUsers(page: Page) {
  const usersNode = page.getByText('Users').first()
  await expect(usersNode).toBeVisible({ timeout: 10000 })
  await usersNode.click()
  await expect(page.locator('table').getByText('Administrator').first()).toBeVisible({ timeout: 10000 })
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Enter key opens properties when object is selected', async ({ page }) => {
    await navigateToUsers(page)

    // Select the Administrator row
    const adminRow = page.locator('table tbody tr', { hasText: 'Administrator' }).first()
    await adminRow.click()
    await page.waitForTimeout(500)

    // The keyboard handler listens on window, so dispatch the event directly
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    // Properties dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })

  test('F5 refreshes the current view', async ({ page }) => {
    await navigateToUsers(page)

    // Press F5 - should refresh without errors
    await page.keyboard.press('F5')

    // The table should still be visible after refresh
    await expect(page.locator('table').getByText('Administrator').first()).toBeVisible({ timeout: 10000 })
  })
})
