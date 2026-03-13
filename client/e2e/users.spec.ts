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

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can open user properties by double-clicking a user row', async ({ page }) => {
    await navigateToUsers(page)

    const adminRow = page.locator('table tr', { hasText: 'Administrator' }).first()
    await adminRow.dblclick()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible()
  })

  test('user properties dialog has all ADUC tabs', async ({ page }) => {
    await navigateToUsers(page)

    const adminRow = page.locator('table tr', { hasText: 'Administrator' }).first()
    await adminRow.dblclick()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    const expectedTabs = ['General', 'Address', 'Account', 'Profile', 'Telephones', 'Organization', 'Member Of']
    for (const tab of expectedTabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible()
    }
  })

  test('can switch between property tabs', async ({ page }) => {
    await navigateToUsers(page)

    const adminRow = page.locator('table tr', { hasText: 'Administrator' }).first()
    await adminRow.dblclick()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Click Account tab
    await page.getByRole('tab', { name: 'Account' }).click()
    // Should see UPN field
    await expect(page.getByText(/user logon name|principal/i).first()).toBeVisible({ timeout: 3000 })

    // Click Organization tab
    await page.getByRole('tab', { name: 'Organization' }).click()
    await expect(page.getByText(/title|department|company/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('can create a new user via dialog', async ({ page }) => {
    await navigateToUsers(page)

    await page.getByRole('button', { name: /new user/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Fill in user details
    await page.getByLabel(/first name/i).fill('E2E')
    await page.getByLabel(/last name/i).fill('TestUser')
    const logonInput = page.getByLabel(/user logon name/i).first()
    await logonInput.fill('e2e.testuser')

    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill('TestPass123!')
    await passwordInputs.nth(1).fill('TestPass123!')

    await page.getByRole('button', { name: /create/i }).click()
    await page.waitForTimeout(2000)

    // Close the dialog
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // User should appear in the list
    await expect(page.locator('table').getByText('E2E TestUser').first()).toBeVisible({ timeout: 10000 })
  })

  test('toolbar buttons reflect selection state', async ({ page }) => {
    await navigateToUsers(page)

    // Delete button should be disabled when nothing is selected
    await expect(page.getByRole('button', { name: /delete/i })).toBeDisabled()

    // Click a user row to select it
    const adminRow = page.locator('table tr', { hasText: 'Administrator' }).first()
    await adminRow.click()

    // Delete button should now be enabled
    await expect(page.getByRole('button', { name: /delete/i })).toBeEnabled({ timeout: 3000 })
  })
})

// Cleanup: delete the test user created above
test('cleanup: delete e2e test user', async ({ page }) => {
  await login(page)
  await navigateToUsers(page)

  const testUser = page.locator('table').getByText('E2E TestUser')
  if (await testUser.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Select the user row
    const userRow = page.locator('table tr', { hasText: 'E2E TestUser' }).first()
    await userRow.click()
    await page.waitForTimeout(300)

    // Set up confirm handler and click delete
    page.on('dialog', dialog => dialog.accept())
    const deleteBtn = page.getByRole('button', { name: /delete/i })
    await expect(deleteBtn).toBeEnabled({ timeout: 3000 })
    await deleteBtn.click()
    await page.waitForTimeout(2000)
  }
})
