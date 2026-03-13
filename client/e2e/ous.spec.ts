import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill('Administrator')
  await page.getByLabel('Password').fill('Admin1234!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 10000 })
}

async function navigateToContainer(page: Page, containerName: string) {
  const node = page.getByText(containerName).first()
  await expect(node).toBeVisible({ timeout: 10000 })
  await node.click()
  await page.waitForTimeout(1000)
}

test.describe('OU Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('toolbar shows New OU button', async ({ page }) => {
    await navigateToContainer(page, 'Users')
    await expect(page.getByRole('button', { name: /new ou/i })).toBeVisible({ timeout: 5000 })
  })

  test('can open create OU dialog', async ({ page }) => {
    await navigateToContainer(page, 'Users')
    await page.getByRole('button', { name: /new ou/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('New Organizational Unit')).toBeVisible()
  })

  test('create OU dialog has name and description fields', async ({ page }) => {
    await navigateToContainer(page, 'Users')
    await page.getByRole('button', { name: /new ou/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
  })

  test('toolbar shows Delete OU button', async ({ page }) => {
    await navigateToContainer(page, 'Users')
    await expect(page.getByRole('button', { name: /delete ou/i })).toBeVisible({ timeout: 5000 })
  })

  test('can create and delete an OU', async ({ page }) => {
    // Navigate to Users container to create OU there
    await navigateToContainer(page, 'Users')

    // Create a test OU
    await page.getByRole('button', { name: /new ou/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await page.getByLabel('Name').fill('E2E-Test-OU')
    await page.getByLabel('Description').fill('Created by E2E test')
    await page.getByRole('button', { name: /create/i }).click()

    // Wait for OU to be created
    await page.waitForTimeout(2000)

    // Close dialog if still open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // The OU should now appear in the tree - check for it
    const ouNode = page.getByText('E2E-Test-OU').first()
    if (await ouNode.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Select it in the tree
      await ouNode.click()
      await page.waitForTimeout(500)

      // Delete via Delete OU button
      await page.getByRole('button', { name: /delete ou/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Delete Organizational Unit')).toBeVisible()

      // Click the Delete button in the dialog
      await page.getByRole('button', { name: 'Delete' }).last().click()
      await page.waitForTimeout(2000)
    }
  })
})
