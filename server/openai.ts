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
      // Vérifier si l'API key est présente
      if (!process.env.OPENAI_API_KEY) {
        console.error('OpenAI API Key not found in environment variables');
        return {
          message: "Le service de chat intelligent n'est pas configuré. Veuillez contacter l'administrateur.",
          success: false,
          error: 'Missing API Key'
        };
      }

      // Fallback simple si l'API OpenAI n'est pas disponible
      if (!openai) {
        return this.getFallbackResponse(userMessage);
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      console.log('Sending request to OpenAI with messages:', messages.length);

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

      console.log('OpenAI response received successfully');
      return {
        message: assistantMessage,
        success: true
      };

    } catch (error: any) {
      console.error('OpenAI API Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // Si c'est une erreur de quota ou d'API key, utiliser le fallback
      if (error.code === 'insufficient_quota' || error.status === 401 || error.code === 'invalid_api_key') {
        return this.getFallbackResponse(userMessage);
      }
      
      return {
        message: "Désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants ou contacter le support.",
        success: false,
        error: 'OpenAI API Error'
      };
    }
  }

  private getFallbackResponse(userMessage: string): ChatbotResponse {
    const lowerMessage = userMessage.toLowerCase();
    
    // Réponses basées sur des mots-clés simples
    if (lowerMessage.includes('événement') || lowerMessage.includes('event')) {
      return {
        message: `Pour créer un événement, rendez-vous dans votre tableau de bord et cliquez sur "Créer un événement". Vous pourrez ensuite renseigner tous les détails : nom, sport, date, lieu de rendez-vous et destination.

Une fois créé, vous pouvez inviter des participants par email qui pourront s'inscrire comme conducteurs (avec places disponibles) ou passagers.`,
        success: true
      };
    }
    
    if (lowerMessage.includes('covoiturage') || lowerMessage.includes('voiture')) {
      return {
        message: `Notre système de covoiturage permet aux participants de s'inscrire soit comme :

🚗 **Conducteur** : Précisez le nombre de places disponibles dans votre véhicule
👥 **Passager** : Vous serez associé automatiquement à un conducteur

Les organisateurs peuvent suivre en temps réel le nombre de participants, conducteurs et places disponibles.`,
        success: true
      };
    }
    
    if (lowerMessage.includes('inscription') || lowerMessage.includes('compte')) {
      return {
        message: `Pour créer votre compte organisation :

1. Cliquez sur "Commencer gratuitement"
2. Choisissez votre type d'organisation (club, association, entreprise)
3. Renseignez vos informations de contact
4. Optionnel : ajoutez votre numéro SIREN pour les organisations officielles

Vous pourrez ensuite accéder à votre tableau de bord pour gérer vos événements.`,
        success: true
      };
    }
    
    if (lowerMessage.includes('aide') || lowerMessage.includes('help') || lowerMessage.includes('bonjour') || lowerMessage.includes('salut')) {
      return {
        message: `Bonjour ! Je suis votre assistant SportPool 👋

Je peux vous aider avec :
• La création d'événements sportifs
• L'organisation du covoiturage
• L'inscription et gestion des participants  
• La navigation sur la plateforme

Posez-moi une question spécifique et je vous guiderai !`,
        success: true
      };
    }
    
    // Réponse générique
    return {
      message: `Je comprends votre question sur "${userMessage}".

Voici les principales fonctionnalités de SportPool :
• **Créer des événements** sportifs ponctuels ou récurrents
• **Organiser le covoiturage** avec gestion automatique des places  
• **Inviter des participants** par email
• **Suivre les statistiques** en temps réel

Pour plus d'aide spécifique, n'hésitez pas à reformuler votre question ou contactez le support.`,
      success: true
    };
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