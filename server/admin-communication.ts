import { db } from './db';
import { adminConversations, adminMessages, organizations, notifications } from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { sendEmail } from './email';

export interface CreateConversationRequest {
  organizationId: string;
  subject: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SendMessageRequest {
  conversationId: string;
  senderId: string;
  senderType: 'admin' | 'organization';
  message: string;
  messageType?: 'text' | 'system' | 'attachment';
  attachmentUrl?: string;
}

/**
 * Crée une nouvelle conversation avec l'admin
 */
export async function createConversation(request: CreateConversationRequest) {
  try {
    // Vérifier que l'organisation existe
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, request.organizationId))
      .limit(1);

    if (!organization[0]) {
      throw new Error('Organisation non trouvée');
    }

    const org = organization[0];

    // Créer la conversation
    const conversation = await db.insert(adminConversations).values({
      organizationId: request.organizationId,
      subject: request.subject,
      priority: request.priority || 'medium',
      status: 'open',
    }).returning();

    if (!conversation[0]) {
      throw new Error('Erreur lors de la création de la conversation');
    }

    // Ajouter le premier message
    await db.insert(adminMessages).values({
      conversationId: conversation[0].id,
      senderId: request.organizationId,
      senderType: 'organization',
      message: request.message,
      messageType: 'text',
    });

    // Créer une notification pour l'organisation
    await db.insert(notifications).values({
      organizationId: request.organizationId,
      type: 'info',
      title: 'Message envoyé à l\'administration',
      message: `Votre message avec le sujet "${request.subject}" a été envoyé à l'administration. Vous recevrez une réponse sous peu.`,
    });

    // Envoyer un email de notification à l'admin (optionnel)
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@TeamMove.app',
        subject: `[TeamMove] Nouveau message de ${org.name}`,
        html: `
          <h2>Nouveau message de support</h2>
          <p><strong>Organisation :</strong> ${org.name}</p>
          <p><strong>Email :</strong> ${org.email}</p>
          <p><strong>Sujet :</strong> ${request.subject}</p>
          <p><strong>Priorité :</strong> ${request.priority}</p>
          <p><strong>Message :</strong></p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
            ${request.message.replace(/\n/g, '<br>')}
          </div>
          <p><a href="${process.env.APP_URL}/admin/conversations/${conversation[0].id}">Répondre</a></p>
        `,
      });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email admin:', emailError);
    }

    return conversation[0];
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    throw error;
  }
}

/**
 * Envoie un message dans une conversation existante
 */
export async function sendMessage(request: SendMessageRequest) {
  try {
    // Vérifier que la conversation existe
    const conversation = await db.select()
      .from(adminConversations)
      .where(eq(adminConversations.id, request.conversationId))
      .limit(1);

    if (!conversation[0]) {
      throw new Error('Conversation non trouvée');
    }

    const conv = conversation[0];

    // Vérifier les permissions
    if (request.senderType === 'organization' && conv.organizationId !== request.senderId) {
      throw new Error('Permissions insuffisantes');
    }

    // Ajouter le message
    const message = await db.insert(adminMessages).values({
      conversationId: request.conversationId,
      senderId: request.senderId,
      senderType: request.senderType,
      message: request.message,
      messageType: request.messageType || 'text',
      attachmentUrl: request.attachmentUrl,
    }).returning();

    // Mettre à jour la conversation
    await db.update(adminConversations)
      .set({
        lastMessageAt: new Date(),
        status: request.senderType === 'organization' ? 'pending' : 'open',
        updatedAt: new Date(),
      })
      .where(eq(adminConversations.id, request.conversationId));

    // Obtenir les informations de l'expéditeur
    const sender = await db.select()
      .from(organizations)
      .where(eq(organizations.id, request.senderId))
      .limit(1);

    const senderInfo = sender[0];

    // Créer des notifications
    if (request.senderType === 'admin') {
      // Message de l'admin vers l'organisation
      await db.insert(notifications).values({
        organizationId: conv.organizationId,
        type: 'info',
        title: 'Nouvelle réponse de l\'administration',
        message: `L'administration a répondu à votre message concernant "${conv.subject}".`,
        actionUrl: `/dashboard/support/${request.conversationId}`,
      });

      // Envoyer un email à l'organisation
      const organization = await db.select()
        .from(organizations)
        .where(eq(organizations.id, conv.organizationId))
        .limit(1);

      if (organization[0]) {
        try {
          await sendEmail({
            to: organization[0].email,
            subject: `[TeamMove] Réponse de l'administration - ${conv.subject}`,
            html: `
              <h2>Nouvelle réponse de l'administration</h2>
              <p>Bonjour ${organization[0].contactFirstName},</p>
              <p>L'administration a répondu à votre message concernant "<strong>${conv.subject}</strong>".</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
                ${request.message.replace(/\n/g, '<br>')}
              </div>
              <p><a href="${process.env.APP_URL}/dashboard/support/${request.conversationId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la conversation</a></p>
              <p>Cordialement,<br>L'équipe TeamMove</p>
            `,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email à l\'organisation:', emailError);
        }
      }
    } else {
      // Message de l'organisation vers l'admin
      try {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@TeamMove.app',
          subject: `[TeamMove] Réponse de ${senderInfo?.name || 'Organisation'} - ${conv.subject}`,
          html: `
            <h2>Nouvelle réponse de ${senderInfo?.name || 'Organisation'}</h2>
            <p><strong>Conversation :</strong> ${conv.subject}</p>
            <p><strong>Organisation :</strong> ${senderInfo?.name}</p>
            <p><strong>Email :</strong> ${senderInfo?.email}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
              ${request.message.replace(/\n/g, '<br>')}
            </div>
            <p><a href="${process.env.APP_URL}/admin/conversations/${request.conversationId}">Répondre</a></p>
          `,
        });
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email admin:', emailError);
      }
    }

    return message[0];
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    throw error;
  }
}

/**
 * Récupère les conversations d'une organisation
 */
export async function getOrganizationConversations(organizationId: string) {
  try {
    const conversations = await db.select({
      id: adminConversations.id,
      subject: adminConversations.subject,
      status: adminConversations.status,
      priority: adminConversations.priority,
      lastMessageAt: adminConversations.lastMessageAt,
      createdAt: adminConversations.createdAt,
    })
      .from(adminConversations)
      .where(eq(adminConversations.organizationId, organizationId))
      .orderBy(desc(adminConversations.lastMessageAt));

    return conversations;
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    throw error;
  }
}

/**
 * Récupère les messages d'une conversation
 */
export async function getConversationMessages(conversationId: string, organizationId?: string) {
  try {
    // Vérifier les permissions si organizationId est fourni
    if (organizationId) {
      const conversation = await db.select()
        .from(adminConversations)
        .where(eq(adminConversations.id, conversationId))
        .limit(1);

      if (!conversation[0] || conversation[0].organizationId !== organizationId) {
        throw new Error('Permissions insuffisantes');
      }
    }

    const messages = await db.select({
      id: adminMessages.id,
      senderId: adminMessages.senderId,
      senderType: adminMessages.senderType,
      message: adminMessages.message,
      messageType: adminMessages.messageType,
      attachmentUrl: adminMessages.attachmentUrl,
      read: adminMessages.read,
      createdAt: adminMessages.createdAt,
      senderName: organizations.name,
      senderEmail: organizations.email,
    })
      .from(adminMessages)
      .leftJoin(organizations, eq(adminMessages.senderId, organizations.id))
      .where(eq(adminMessages.conversationId, conversationId))
      .orderBy(adminMessages.createdAt);

    return messages;
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    throw error;
  }
}

/**
 * Marque les messages comme lus
 */
export async function markMessagesAsRead(conversationId: string, userId: string, userType: 'admin' | 'organization') {
  try {
    await db.update(adminMessages)
      .set({ read: true })
      .where(
        and(
          eq(adminMessages.conversationId, conversationId),
          // Marquer comme lus les messages qui ne sont PAS de l'utilisateur actuel
          userType === 'admin' 
            ? eq(adminMessages.senderType, 'organization')
            : eq(adminMessages.senderType, 'admin')
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error);
    throw error;
  }
}

/**
 * Ferme une conversation
 */
export async function closeConversation(conversationId: string, closedByType: 'admin' | 'organization') {
  try {
    const conversation = await db.update(adminConversations)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(adminConversations.id, conversationId))
      .returning();

    if (!conversation[0]) {
      throw new Error('Conversation non trouvée');
    }

    // Ajouter un message système
    await db.insert(adminMessages).values({
      conversationId,
      senderId: closedByType === 'admin' ? 'admin' : conversation[0].organizationId,
      senderType: closedByType,
      message: `Conversation fermée par ${closedByType === 'admin' ? 'l\'administration' : 'l\'organisation'}.`,
      messageType: 'system',
    });

    // Notification pour l'organisation si fermée par l'admin
    if (closedByType === 'admin') {
      await db.insert(notifications).values({
        organizationId: conversation[0].organizationId,
        type: 'info',
        title: 'Conversation fermée',
        message: `La conversation "${conversation[0].subject}" a été fermée par l'administration.`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la fermeture de la conversation:', error);
    throw error;
  }
}

/**
 * Récupère toutes les conversations pour l'admin
 */
export async function getAllConversationsForAdmin() {
  try {
    const conversations = await db.select({
      id: adminConversations.id,
      organizationId: adminConversations.organizationId,
      organizationName: organizations.name,
      organizationEmail: organizations.email,
      subject: adminConversations.subject,
      status: adminConversations.status,
      priority: adminConversations.priority,
      lastMessageAt: adminConversations.lastMessageAt,
      createdAt: adminConversations.createdAt,
    })
      .from(adminConversations)
      .leftJoin(organizations, eq(adminConversations.organizationId, organizations.id))
      .orderBy(desc(adminConversations.lastMessageAt));

    return conversations;
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations admin:', error);
    throw error;
  }
}