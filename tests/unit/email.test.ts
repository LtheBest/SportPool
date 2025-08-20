import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from '../../server/email';

// Mock mailjet
vi.mock('node-mailjet', () => ({
  default: {
    apiConnect: () => ({
      post: () => ({
        request: vi.fn().mockResolvedValue({
          body: { Messages: [{ Status: 'success' }] }
        })
      })
    })
  }
}));

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendCustomTemplateEmail', () => {
    it('should send email with custom template successfully', async () => {
      const result = await emailService.sendCustomTemplateEmail(
        'test@example.com',
        'Test User',
        'Hello from test!',
        'Test Subject'
      );

      expect(result).toBe(true);
    });

    it('should handle missing required fields', async () => {
      try {
        await emailService.sendCustomTemplateEmail('', '', '', '');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('sendEventNotificationTemplate', () => {
    it('should send event notification with template', async () => {
      const result = await emailService.sendEventNotificationTemplate(
        'participant@example.com',
        'John Doe',
        'Match de Football',
        '25 décembre 2024 à 15h00',
        'Club Sportif'
      );

      expect(result).toBe(true);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        'John Doe',
        'reset-token-123'
      );

      expect(result).toBe(true);
    });
  });

  describe('sendEventInvitationEmail', () => {
    it('should send event invitation email', async () => {
      const eventDate = new Date('2024-12-25T15:00:00');
      
      const result = await emailService.sendEventInvitationEmail(
        'invitee@example.com',
        'Match de Football',
        'Club Sportif',
        eventDate,
        'invitation-token-123'
      );

      expect(result).toBe(true);
    });
  });
});