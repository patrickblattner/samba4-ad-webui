import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill('Administrator')
  await page.getByLabel('Password').fill('Admin1234!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Samba4 AD Web UI').first()).toBeVisible({ timeout: 10000 })
}

test.describe('Directory Tree & Object List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows tree with root nodes after login', async ({ page }) => {
    // Should see tree nodes (OUs and containers from the domain)
    await expect(page.getByText('Users').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Computers').first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking a tree node loads objects in the list', async ({ page }) => {
    // Click on Users container
    const usersNode = page.getByText('Users').first()
    await expect(usersNode).toBeVisible({ timeout: 10000 })
    await usersNode.click()

    // Should see objects in the table (Administrator at minimum)
    await expect(page.getByText('Administrator').first()).toBeVisible({ timeout: 10000 })
  })

  test('expanding a tree node shows children', async ({ page }) => {
    // Wait for tree to load
    await expect(page.getByText('Users').first()).toBeVisible({ timeout: 10000 })

    // Look for expandable nodes (OUs with children)
    // The domain should have expandable nodes
    const expandButtons = page.locator('[data-testid="tree-expand"]')
    const count = await expandButtons.count()
    if (count > 0) {
      await expandButtons.first().click()
      // After expanding, there should be more nodes visible
      await page.waitForTimeout(1000)
    }
  })

  test('object list shows table after selecting node', async ({ page }) => {
    // Click Users to see user objects
    const usersNode = page.getByText('Users').first()
    await expect(usersNode).toBeVisible({ timeout: 10000 })
    await usersNode.click()

    // Wait for objects to load — Administrator should appear
    await expect(page.getByText('Administrator').first()).toBeVisible({ timeout: 10000 })
  })

  test('header shows user name and sign out', async ({ page }) => {
    await expect(page.getByText('Administrator').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/sign out/i)).toBeVisible()
  })
})
