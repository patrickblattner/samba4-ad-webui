import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill('Administrator')
  await page.getByLabel('Password').fill('Admin1234!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 10000 })
}

async function navigateToComputers(page: Page) {
  const computersNode = page.getByText('Computers').first()
  await expect(computersNode).toBeVisible({ timeout: 10000 })
  await computersNode.click()
  // Wait for the table to appear (may be empty or have objects)
  await page.waitForTimeout(1000)
}

test.describe('Computer Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can navigate to Computers container', async ({ page }) => {
    await navigateToComputers(page)
    // The Computers container should be selected in the tree
    await expect(page.getByText('Computers').first()).toBeVisible()
  })

  test('toolbar shows New Computer button', async ({ page }) => {
    await navigateToComputers(page)
    await expect(page.getByRole('button', { name: /new computer/i })).toBeVisible({ timeout: 5000 })
  })

  test('can open create computer dialog', async ({ page }) => {
    await navigateToComputers(page)
    await page.getByRole('button', { name: /new computer/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })
})
