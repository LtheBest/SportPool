import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { page } from './world';

Given('que je suis sur la page d\'inscription', async () => {
  await page.goto('/register');
  await expect(page).toHaveTitle(/Inscription/);
});

When('je remplis le formulaire d\'inscription avec :', async (dataTable) => {
  const data = dataTable.rowsHash();
  
  if (data.name) await page.fill('[name="name"]', data.name);
  if (data.type) await page.selectOption('[name="type"]', data.type);
  if (data.email) await page.fill('[name="email"]', data.email);
  if (data.phone) await page.fill('[name="phone"]', data.phone);
  if (data.address) await page.fill('[name="address"]', data.address);
  if (data.description) await page.fill('[name="description"]', data.description);
  if (data.contactFirstName) await page.fill('[name="contactFirstName"]', data.contactFirstName);
  if (data.contactLastName) await page.fill('[name="contactLastName"]', data.contactLastName);
  if (data.sirenNumber) await page.fill('[name="sirenNumber"]', data.sirenNumber);
  if (data.password) await page.fill('[name="password"]', data.password);
});

When('je remplis le formulaire d\'inscription avec l\'email {string}', async (email: string) => {
  await page.fill('[name="name"]', 'Test Org');
  await page.selectOption('[name="type"]', 'association');
  await page.fill('[name="email"]', email);
  await page.fill('[name="contactFirstName"]', 'John');
  await page.fill('[name="contactLastName"]', 'Doe');
  await page.fill('[name="password"]', 'password123');
});

When('je clique sur le bouton {string}', async (buttonText: string) => {
  await page.click(`button:has-text("${buttonText}")`);
});

Then('je devrais être redirigé vers le tableau de bord', async () => {
  await expect(page).toHaveURL(/\/dashboard/);
});

Then('je devrais voir un message de confirmation', async () => {
  await expect(page.locator('.success, .alert-success')).toBeVisible();
});

Then('je devrais voir une erreur {string}', async (errorMessage: string) => {
  await expect(page.locator('.error, .alert-error')).toContainText(errorMessage);
});

Given('qu\'une organisation existe déjà avec l\'email {string}', async (email: string) => {
  // Cette étape nécessiterait une setup de données de test
  // Pour l'instant, on simule avec des données mock
  console.log(`Setting up existing organization with email: ${email}`);
});