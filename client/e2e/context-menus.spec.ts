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

test.describe('Context Menus', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('right-click on tree node shows context menu', async ({ page }) => {
    const usersNode = page.getByText('Users').first()
    await expect(usersNode).toBeVisible({ timeout: 10000 })
    await usersNode.click({ button: 'right' })

    // Context menu should appear with expected items
    await expect(page.getByRole('menuitem', { name: /new user/i }).or(page.getByText('New User').last())).toBeVisible({ timeout: 3000 })
  })

  test('right-click on table row shows context menu', async ({ page }) => {
    await navigateToUsers(page)

    const adminRow = page.locator('table tbody tr', { hasText: 'Administrator' }).first()
    await adminRow.click({ button: 'right' })

    // Context menu should appear with user-appropriate options
    await expect(page.getByRole('menuitem', { name: /properties/i }).or(page.getByText('Properties').last())).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Copy DN option', async ({ page }) => {
    await navigateToUsers(page)

    const adminRow = page.locator('table tbody tr', { hasText: 'Administrator' }).first()
    await adminRow.click({ button: 'right' })

    await expect(page.getByRole('menuitem', { name: /copy dn/i }).or(page.getByText('Copy DN').last())).toBeVisible({ timeout: 3000 })
  })
})
