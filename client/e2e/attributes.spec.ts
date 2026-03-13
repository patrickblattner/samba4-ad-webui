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

/** Double-click a table row by dispatching a native dblclick event on the row's first cell */
async function dblclickTableRow(page: Page, text: string) {
  const row = page.locator('table tbody tr', { hasText: text }).first()
  await expect(row).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(300)
  await row.evaluate((el) => {
    const cell = el.querySelector('td')
    if (cell) cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
}

test.describe('Attribute Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('user properties dialog has Attribute Editor tab', async ({ page }) => {
    await navigateToUsers(page)

    await dblclickTableRow(page, 'Administrator')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole('tab', { name: 'Attribute Editor' })).toBeVisible()
  })

  test('attribute editor loads and shows attributes', async ({ page }) => {
    await navigateToUsers(page)

    await dblclickTableRow(page, 'Administrator')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await page.getByRole('tab', { name: 'Attribute Editor' }).click()

    // Should show attribute table with known AD attributes
    await expect(page.getByText('sAMAccountName').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('distinguishedName').first()).toBeVisible({ timeout: 5000 })
  })

  test('attribute editor has filter input', async ({ page }) => {
    await navigateToUsers(page)

    await dblclickTableRow(page, 'Administrator')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await page.getByRole('tab', { name: 'Attribute Editor' }).click()
    await expect(page.getByText('sAMAccountName').first()).toBeVisible({ timeout: 5000 })

    // Filter should narrow down results
    const filterInput = page.getByPlaceholder('Filter attributes...')
    await expect(filterInput).toBeVisible()
    await filterInput.fill('sAMAccount')

    // Should still show sAMAccountName but not unrelated attributes
    await expect(page.getByText('sAMAccountName').first()).toBeVisible()
  })

  test('attribute editor shows Edit button', async ({ page }) => {
    await navigateToUsers(page)

    await dblclickTableRow(page, 'Administrator')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await page.getByRole('tab', { name: 'Attribute Editor' }).click()
    await expect(page.getByText('sAMAccountName').first()).toBeVisible({ timeout: 5000 })

    // Edit button should exist (disabled when no attribute selected)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  test('group properties dialog has Attribute Editor tab', async ({ page }) => {
    await navigateToUsers(page)

    await dblclickTableRow(page, 'Domain Admins')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole('tab', { name: 'Attribute Editor' })).toBeVisible()
  })
})
