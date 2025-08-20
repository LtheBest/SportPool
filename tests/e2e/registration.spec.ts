import { test, expect } from '@playwright/test';

test.describe('Registration', () => {
  test('successful organization registration with SIREN number', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.fill('[name="name"]', 'Test Organization');
    await page.selectOption('[name="type"]', 'association');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="phone"]', '0123456789');
    await page.fill('[name="address"]', '123 Rue de Test');
    await page.fill('[name="description"]', 'Une organisation de test');
    await page.fill('[name="contactFirstName"]', 'John');
    await page.fill('[name="contactLastName"]', 'Doe');
    await page.fill('[name="sirenNumber"]', '123456789');
    await page.fill('[name="password"]', 'motdepasse123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
  });

  test('registration fails with invalid SIREN number', async ({ page }) => {
    await page.goto('/register');

    // Fill form with invalid SIREN
    await page.fill('[name="name"]', 'Test Organization');
    await page.selectOption('[name="type"]', 'association');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="contactFirstName"]', 'John');
    await page.fill('[name="contactLastName"]', 'Doe');
    await page.fill('[name="sirenNumber"]', '12345'); // Invalid SIREN
    await page.fill('[name="password"]', 'motdepasse123');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error, .alert-error')).toContainText('SIREN');
  });

  test('registration fails with existing email', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.fill('[name="name"]', 'First Organization');
    await page.selectOption('[name="type"]', 'club');
    await page.fill('[name="email"]', 'duplicate@example.com');
    await page.fill('[name="contactFirstName"]', 'Jane');
    await page.fill('[name="contactLastName"]', 'Smith');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Logout
    await page.click('button:has-text("Déconnexion")');

    // Try to register with same email
    await page.goto('/register');
    await page.fill('[name="name"]', 'Second Organization');
    await page.selectOption('[name="type"]', 'association');
    await page.fill('[name="email"]', 'duplicate@example.com');
    await page.fill('[name="contactFirstName"]', 'Bob');
    await page.fill('[name="contactLastName"]', 'Wilson');
    await page.fill('[name="password"]', 'password456');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error, .alert-error')).toContainText('existe déjà');
  });
});