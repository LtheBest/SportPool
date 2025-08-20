import { test, expect } from '@playwright/test';

test.describe('Chatbot', () => {
  test.beforeEach(async ({ page }) => {
    // Mock OpenAI API responses
    await page.route('**/api/chatbot/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'POST' && url.includes('/message')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Bonjour ! Je suis là pour vous aider avec vos événements. Comment puis-je vous assister ?',
            success: true
          })
        });
      } else if (url.includes('/event-suggestions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Voici quelques suggestions d\'événements : 1. Match de football amical, 2. Tournoi de tennis, 3. Randonnée en montagne',
            success: true
          })
        });
      } else if (url.includes('/organization-help')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Pour votre organisation, je recommande d\'utiliser les fonctionnalités de gestion des membres et d\'organisation d\'événements récurrents.',
            success: true
          })
        });
      }
    });
  });

  test('chatbot responds to general questions', async ({ page }) => {
    await page.goto('/chatbot');
    
    // Type message in chat input
    await page.fill('[data-testid="chat-input"]', 'Comment créer un événement ?');
    await page.click('[data-testid="send-button"]');
    
    // Wait for response
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Bonjour');
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('événements');
  });

  test('chatbot provides event suggestions', async ({ page }) => {
    await page.goto('/chatbot');
    
    // Ask for event suggestions
    await page.fill('[data-testid="chat-input"]', 'Suggère-moi des événements sportifs');
    await page.click('[data-testid="send-button"]');
    
    // Should show suggestions
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('suggestions');
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('football');
  });

  test('chatbot provides organization-specific help when logged in', async ({ page }) => {
    // First register and login
    await page.goto('/register');
    await page.fill('[name="name"]', 'Test Club');
    await page.selectOption('[name="type"]', 'club');
    await page.fill('[name="email"]', `chatbot-test-${Date.now()}@example.com`);
    await page.fill('[name="contactFirstName"]', 'Chat');
    await page.fill('[name="contactLastName"]', 'Bot');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Go to chatbot
    await page.goto('/chatbot');
    
    // Ask organization-specific question
    await page.fill('[data-testid="chat-input"]', 'Comment gérer mes membres ?');
    await page.click('[data-testid="send-button"]');
    
    // Should provide organization-specific advice
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('organisation');
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('membres');
  });

  test('chatbot handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chatbot/message', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Je rencontre un problème technique. Veuillez réessayer.',
          success: false,
          error: 'API Error'
        })
      });
    });
    
    await page.goto('/chatbot');
    
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('problème technique');
  });

  test('chatbot maintains conversation history', async ({ page }) => {
    await page.goto('/chatbot');
    
    // Send first message
    await page.fill('[data-testid="chat-input"]', 'Bonjour');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Bonjour');
    
    // Send follow-up message
    await page.fill('[data-testid="chat-input"]', 'Merci pour votre aide');
    await page.click('[data-testid="send-button"]');
    
    // Both messages should be visible
    const messages = page.locator('[data-testid="chat-messages"] .message');
    await expect(messages).toHaveCount(4); // 2 user messages + 2 bot responses
  });

  test('chatbot input validation', async ({ page }) => {
    await page.goto('/chatbot');
    
    // Try to send empty message
    await page.click('[data-testid="send-button"]');
    
    // Should not send empty message
    const messages = page.locator('[data-testid="chat-messages"] .message');
    await expect(messages).toHaveCount(0);
    
    // Input should still be focused or show validation message
    await expect(page.locator('[data-testid="chat-input"]')).toBeFocused();
  });
});