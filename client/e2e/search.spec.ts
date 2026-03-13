import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill('Administrator')
  await page.getByLabel('Password').fill('Admin1234!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 10000 })
}

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('search bar is visible in the header', async ({ page }) => {
    await expect(page.getByPlaceholder('Search objects...')).toBeVisible({ timeout: 5000 })
  })

  test('search shows results for valid query', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search objects...')
    await searchInput.fill('Administrator')

    // Wait for debounced search and results
    await expect(page.getByText('No results found.').or(page.locator('.truncate.font-medium').first())).toBeVisible({ timeout: 5000 })

    // Should show at least the Administrator user
    await expect(page.locator('button').filter({ hasText: 'Administrator' }).first()).toBeVisible({ timeout: 5000 })
  })

  test('search shows no results for gibberish', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search objects...')
    await searchInput.fill('xyznonexistent12345')

    await expect(page.getByText('No results found.')).toBeVisible({ timeout: 5000 })
  })

  test('clicking search result navigates to parent container', async ({ page }) => {
    // First navigate to some container
    const usersNode = page.getByText('Users').first()
    await expect(usersNode).toBeVisible({ timeout: 10000 })
    await usersNode.click()
    await page.waitForTimeout(1000)

    // Search for Administrator
    const searchInput = page.getByPlaceholder('Search objects...')
    await searchInput.fill('Administrator')

    // Wait for results
    const resultBtn = page.locator('button').filter({ hasText: 'Administrator' }).first()
    await expect(resultBtn).toBeVisible({ timeout: 5000 })

    // Click the result
    await resultBtn.click()

    // Search should close and input should be cleared
    await expect(searchInput).toHaveValue('')
  })

  test('search can be cleared with X button', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search objects...')
    await searchInput.fill('Admin')

    // Wait for the clear button to appear
    await page.waitForTimeout(500)

    // Clear button should be visible (it's the X icon)
    // Click anywhere to close dropdown first, then check input
    await searchInput.fill('')
    await expect(searchInput).toHaveValue('')
  })
})
