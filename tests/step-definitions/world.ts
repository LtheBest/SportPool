import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import { BeforeAll, AfterAll, Before, After } from '@cucumber/cucumber';

let browser: Browser;
let context: BrowserContext;
export let page: Page;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

Before(async () => {
  context = await browser.newContext();
  page = await context.newPage();
});

After(async () => {
  await page.close();
  await context.close();
});

AfterAll(async () => {
  await browser.close();
});