import OpenAI from 'openai';

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatbotResponse {
  message: string;
  success: boolean;
  error?: string;
}

class ChatbotService {
  private systemPrompt = `
    Tu es un assistant virtuel pour une plateforme de gestion d'événements sportifs et associatifs.
    
    Ton rôle est d'aider les utilisateurs avec :
    - La création et gestion d'événements
    - L'inscription et participation aux événements
    - Les questions sur le covoiturage
    - Les informations générales sur la plateforme
    - Les problèmes techniques simples
    
    Tu dois être :
    - Amical et professionnel
    - Concis mais informatif
    - Orienté solution
    - Capable de guider les utilisateurs vers les bonnes fonctionnalités
    
    Si tu ne peux pas répondre à une question spécifique, suggère à l'utilisateur de contacter le support.
  `;

  async sendMessage(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<ChatbotResponse> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0]?.message?.content;

      if (!assistantMessage) {
        throw new Error('No response from OpenAI');
      }

      return {
        message: assistantMessage,
        success: true
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      return {
        message: "Désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants ou contacter le support.",
        success: false,
        error: 'OpenAI API Error'
      };
    }
  }

  async getEventSuggestions(query: string): Promise<ChatbotResponse> {
    const prompt = `
      L'utilisateur cherche des suggestions d'événements avec cette requête : "${query}"
      
      Donne des suggestions créatives et pertinentes d'événements sportifs ou associatifs.
      Inclus des détails comme le type d'activité, la durée suggérée, et des conseils pratiques.
      Limite ta réponse à 3-4 suggestions maximum.
    `;

    return this.sendMessage(prompt);
  }

  async getOrganizationHelp(query: string, organizationType: string): Promise<ChatbotResponse> {
    const prompt = `
      L'utilisateur a une question concernant la gestion de son organisation de type "${organizationType}".
      Sa question : "${query}"
      
      Fournis une réponse adaptée à ce type d'organisation, avec des conseils pratiques
      pour utiliser la plateforme efficacement.
    `;

    return this.sendMessage(prompt);
  }
}

export const chatbotService = new ChatbotService();