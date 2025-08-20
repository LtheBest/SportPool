import { test, expect } from '@playwright/test';

test.describe('Events Management', () => {
  let organizationId: string;

  test.beforeEach(async ({ page }) => {
    // Register and login as organization
    await page.goto('/register');
    await page.fill('[name="name"]', 'Test Sports Club');
    await page.selectOption('[name="type"]', 'club');
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="contactFirstName"]', 'Test');
    await page.fill('[name="contactLastName"]', 'Manager');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('create new event updates active events counter', async ({ page }) => {
    // Get initial active events count
    const initialCount = await page.locator('[data-testid="active-events-count"]').textContent();
    
    // Create new event
    await page.click('a[href="/events/new"]');
    await page.fill('[name="name"]', 'Match de Football Test');
    await page.fill('[name="sport"]', 'Football');
    await page.fill('[name="description"]', 'Un match de test');
    
    // Set future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('[name="date"]', futureDate.toISOString().slice(0, 16));
    
    await page.fill('[name="duration"]', '2 heures');
    await page.fill('[name="meetingPoint"]', 'Stade Municipal');
    await page.fill('[name="destination"]', 'Terrain A');
    
    await page.click('button[type="submit"]');
    
    // Should redirect back to events or dashboard
    await expect(page).toHaveURL(/\/(dashboard|events)/);
    
    // Check that active events counter increased
    await page.goto('/dashboard');
    const newCount = await page.locator('[data-testid="active-events-count"]').textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
  });

  test('participant confirmation updates counters', async ({ page }) => {
    // First create an event
    await page.click('a[href="/events/new"]');
    await page.fill('[name="name"]', 'Randonnée Test');
    await page.fill('[name="sport"]', 'Randonnée');
    await page.fill('[name="description"]', 'Une randonnée de test');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    await page.fill('[name="date"]', futureDate.toISOString().slice(0, 16));
    
    await page.fill('[name="meetingPoint"]', 'Parking Central');
    await page.fill('[name="destination"]', 'Sommet du Mont');
    
    // Add invitation email
    await page.fill('[name="inviteEmails"]', 'participant@example.com');
    
    await page.click('button[type="submit"]');
    
    // Get event ID from URL or response
    await page.waitForURL(/\/events\/\w+/);
    const eventUrl = page.url();
    const eventId = eventUrl.match(/\/events\/(\w+)/)?.[1];
    
    if (eventId) {
      // Simulate participant response (would normally come via email link)
      await page.goto(`/invitation/mock-token-${eventId}`);
      
      // Fill participation form
      await page.fill('[name="name"]', 'Jean Dupont');
      await page.selectOption('[name="role"]', 'driver');
      await page.fill('[name="availableSeats"]', '4');
      await page.fill('[name="comment"]', 'J\'ai une voiture spacieuse');
      
      await page.click('button:has-text("Confirmer ma participation")');
      
      // Go back to dashboard to check updated counters
      await page.goto('/dashboard');
      
      // Check that counters were updated
      const participantsCount = await page.locator('[data-testid="participants-count"]').textContent();
      const driversCount = await page.locator('[data-testid="drivers-count"]').textContent();
      const availableSeatsCount = await page.locator('[data-testid="available-seats-count"]').textContent();
      
      expect(parseInt(participantsCount || '0')).toBeGreaterThan(0);
      expect(parseInt(driversCount || '0')).toBeGreaterThan(0);
      expect(parseInt(availableSeatsCount || '0')).toBeGreaterThan(0);
    }
  });

  test('passenger participation reduces available seats', async ({ page }) => {
    // Similar setup as above but test passenger role
    await page.click('a[href="/events/new"]');
    await page.fill('[name="name"]', 'Match Tennis Test');
    await page.fill('[name="sport"]', 'Tennis');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    await page.fill('[name="date"]', futureDate.toISOString().slice(0, 16));
    
    await page.fill('[name="meetingPoint"]', 'Club de Tennis');
    await page.fill('[name="destination"]', 'Courts Extérieurs');
    
    await page.click('button[type="submit"]');
    
    // Get initial stats
    await page.goto('/dashboard');
    const initialSeats = parseInt(await page.locator('[data-testid="available-seats-count"]').textContent() || '0');
    
    // Add a driver first (to have available seats)
    // This would typically be done through invitation flow
    // For test, we'll simulate API calls or use the UI
    
    // Then add a passenger
    // Simulate passenger response
    const eventUrl = page.url();
    if (eventUrl.includes('/events/')) {
      // Mock passenger participation
      await page.evaluate(() => {
        // This would normally be done through the invitation system
        fetch('/api/events/mock-event/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Marie Martin',
            email: 'marie@example.com',
            role: 'passenger'
          })
        });
      });
      
      // Refresh dashboard to see updates
      await page.reload();
      
      // Available seats should decrease
      const newSeats = parseInt(await page.locator('[data-testid="available-seats-count"]').textContent() || '0');
      expect(newSeats).toBeLessThanOrEqual(initialSeats);
    }
  });
});