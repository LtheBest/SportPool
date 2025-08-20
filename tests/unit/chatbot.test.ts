import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatbotService } from '../../server/openai';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn()
      }
    };
  }
}));

describe('ChatbotService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should return successful response when OpenAI responds', async () => {
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default.prototype.chat.completions.create as any;
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Bonjour ! Je suis là pour vous aider avec vos événements.'
          }
        }]
      });

      const result = await chatbotService.sendMessage('Bonjour');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Bonjour');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default.prototype.chat.completions.create as any;
      
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await chatbotService.sendMessage('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API Error');
      expect(result.message).toContain('problème technique');
    });

    it('should include conversation history in request', async () => {
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default.prototype.chat.completions.create as any;
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Je comprends votre demande.'
          }
        }]
      });

      const history = [
        { role: 'user' as const, content: 'Bonjour' },
        { role: 'assistant' as const, content: 'Bonjour ! Comment puis-je vous aider ?' }
      ];

      await chatbotService.sendMessage('Comment créer un événement ?', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            ...history,
            expect.objectContaining({ role: 'user', content: 'Comment créer un événement ?' })
          ])
        })
      );
    });
  });

  describe('getEventSuggestions', () => {
    it('should provide event suggestions based on query', async () => {
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default.prototype.chat.completions.create as any;
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Voici quelques suggestions d\'événements de football : 1. Match amical, 2. Tournoi...'
          }
        }]
      });

      const result = await chatbotService.getEventSuggestions('football');

      expect(result.success).toBe(true);
      expect(result.message).toContain('football');
    });
  });

  describe('getOrganizationHelp', () => {
    it('should provide organization-specific help', async () => {
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default.prototype.chat.completions.create as any;
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Pour une association, je recommande...'
          }
        }]
      });

      const result = await chatbotService.getOrganizationHelp(
        'Comment gérer mes membres ?',
        'association'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('association');
    });
  });
});