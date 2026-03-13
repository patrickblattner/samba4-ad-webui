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
  await expect(page.locator('table').getByText('Domain Admins').first()).toBeVisible({ timeout: 10000 })
}

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can open group properties by double-clicking', async ({ page }) => {
    await navigateToUsers(page)

    const groupRow = page.locator('table tr', { hasText: 'Domain Admins' }).first()
    await groupRow.dblclick()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible()
  })

  test('group properties dialog has all tabs', async ({ page }) => {
    await navigateToUsers(page)

    const groupRow = page.locator('table tr', { hasText: 'Domain Admins' }).first()
    await groupRow.dblclick()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    const expectedTabs = ['General', 'Members', 'Member Of', 'Managed By']
    for (const tab of expectedTabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible()
    }
  })

  test('can view group members', async ({ page }) => {
    await navigateToUsers(page)

    const groupRow = page.locator('table tr', { hasText: 'Domain Admins' }).first()
    await groupRow.dblclick()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await page.getByRole('tab', { name: 'Members' }).click()
    // Domain Admins should have Administrator as member
    await expect(page.getByText(/administrator/i).first()).toBeVisible({ timeout: 5000 })
  })
})
