import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\/login/)
    await expect(page.getByText('Samba4 AD Web UI')).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('Administrator')
    await page.getByLabel('Password').fill('WrongPassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/failed|invalid|error/i)).toBeVisible({ timeout: 15000 })
  })

  test('successful login redirects to home', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('Administrator')
    await page.getByLabel('Password').fill('Admin1234!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // After login, the directory page loads with tree/header
    await expect(page.getByText('Samba4 AD Web UI').first()).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('logout returns to login page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('Administrator')
    await page.getByLabel('Password').fill('Admin1234!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Samba4 AD Web UI').first()).toBeVisible({ timeout: 15000 })

    await page.getByText(/sign out/i).click()
    await page.waitForURL(/\/login/)
    await expect(page.getByLabel('Username')).toBeVisible()
  })

  test('persists session on page reload', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('Administrator')
    await page.getByLabel('Password').fill('Admin1234!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Wait for directory page to fully load (sign out button only appears when logged in)
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 })

    await page.reload()
    // After reload, should still be on the directory page with sign out visible
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible({ timeout: 15000 })
    await expect(page).not.toHaveURL(/\/login/)
  })
})
