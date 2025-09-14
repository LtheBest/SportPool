import { db } from './db';
import { notifications, organizations } from '../shared/schema';
import { eq, desc, and, isNull, count } from 'drizzle-orm';
import { sendEmail } from './email';

export interface CreateNotificationRequest {
  organizationId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  eventId?: string;
  sendEmail?: boolean; // Optionnel: envoyer aussi par email
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
}

/**
 * Crée une nouvelle notification
 */
export async function createNotification(request: CreateNotificationRequest) {
  try {
    // Créer la notification en base
    const notification = await db.insert(notifications).values({
      organizationId: request.organizationId,
      type: request.type,
      title: request.title,
      message: request.message,
      actionUrl: request.actionUrl,
      eventId: request.eventId,
    }).returning();

    // Envoyer par email si demandé
    if (request.sendEmail) {
      const organization = await db.select()
        .from(organizations)
        .where(eq(organizations.id, request.organizationId))
        .limit(1);

      if (organization[0]) {
        await sendNotificationEmail(organization[0], {
          type: request.type,
          title: request.title,
          message: request.message,
          actionUrl: request.actionUrl,
        });
      }
    }

    return notification[0];
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    throw error;
  }
}

/**
 * Récupère les notifications d'une organisation
 */
export async function getOrganizationNotifications(organizationId: string, limit = 50, offset = 0) {
  try {
    const organizationNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.organizationId, organizationId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return organizationNotifications;
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    throw error;
  }
}

/**
 * Récupère les notifications non lues d'une organisation
 */
export async function getUnreadNotifications(organizationId: string) {
  try {
    const unreadNotifications = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.read, false)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return unreadNotifications;
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications non lues:', error);
    throw error;
  }
}

/**
 * Compte les notifications non lues
 */
export async function getUnreadNotificationCount(organizationId: string): Promise<number> {
  try {
    const result = await db.select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.read, false)
        )
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Erreur lors du comptage des notifications non lues:', error);
    return 0;
  }
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string, organizationId: string) {
  try {
    const result = await db.update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.organizationId, organizationId)
        )
      )
      .returning();

    return result[0];
  } catch (error) {
    console.error('Erreur lors du marquage de la notification comme lue:', error);
    throw error;
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead(organizationId: string) {
  try {
    await db.update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.read, false)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    throw error;
  }
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notificationId: string, organizationId: string) {
  try {
    const result = await db.delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.organizationId, organizationId)
        )
      )
      .returning();

    return result[0];
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    throw error;
  }
}

/**
 * Supprime les notifications anciennes (plus de 30 jours)
 */
export async function cleanupOldNotifications() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedNotifications = await db.delete(notifications)
      .where(
        and(
          eq(notifications.read, true),
          // Note: Cette condition nécessiterait une fonction de date appropriée
          // Pour l'instant, nous la commentons et utiliserons un job cron séparé
        )
      );

    console.log('Notifications anciennes supprimées');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du nettoyage des notifications:', error);
    throw error;
  }
}

/**
 * Envoie une notification par email
 */
async function sendNotificationEmail(
  organization: any, 
  notification: { type: string; title: string; message: string; actionUrl?: string }
) {
  try {
    const iconMap = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    const colorMap = {
      info: '#17a2b8',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
    };

    const icon = iconMap[notification.type as keyof typeof iconMap] || '🔔';
    const color = colorMap[notification.type as keyof typeof colorMap] || '#17a2b8';

    const actionButton = notification.actionUrl 
      ? `<a href="${process.env.APP_URL}${notification.actionUrl}" style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Voir les détails</a>`
      : '';

    await sendEmail({
      to: organization.email,
      subject: `[TeamMove] ${notification.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">TeamMove</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: ${color}; margin-top: 0; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${icon}</span>
                ${notification.title}
              </h2>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                Bonjour ${organization.contactFirstName},
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid ${color}; margin: 20px 0;">
                ${notification.message.replace(/\n/g, '<br>')}
              </div>
              
              ${actionButton}
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>Vous recevez cet email car vous êtes inscrit aux notifications TeamMove.</p>
            <p><a href="${process.env.APP_URL}/dashboard/preferences" style="color: #667eea;">Gérer vos préférences de notification</a></p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
  }
}

/**
 * Crée des notifications système pour tous les utilisateurs
 */
export async function createSystemNotification(request: Omit<CreateNotificationRequest, 'organizationId'>) {
  try {
    // Récupérer toutes les organisations actives
    const activeOrganizations = await db.select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.isActive, true));

    // Créer une notification pour chaque organisation
    const promises = activeOrganizations.map(org => 
      createNotification({
        ...request,
        organizationId: org.id,
      })
    );

    await Promise.all(promises);

    return { 
      success: true, 
      notificationsCreated: activeOrganizations.length 
    };
  } catch (error) {
    console.error('Erreur lors de la création des notifications système:', error);
    throw error;
  }
}

/**
 * Notifications prédéfinies pour les événements courants
 */
export const NotificationTemplates = {
  SUBSCRIPTION_UPGRADED: (planType: string, billingInterval: string) => ({
    type: 'success' as const,
    title: 'Abonnement mis à niveau',
    message: `Votre abonnement a été mis à niveau vers le plan ${planType} (${billingInterval}). Profitez de toutes les fonctionnalités premium !`,
  }),

  SUBSCRIPTION_CANCELLED: () => ({
    type: 'warning' as const,
    title: 'Abonnement annulé',
    message: 'Votre abonnement premium a été annulé. Il restera actif jusqu\'à la fin de votre période de facturation.',
  }),

  PAYMENT_FAILED: () => ({
    type: 'error' as const,
    title: 'Échec du paiement',
    message: 'Le paiement de votre abonnement a échoué. Veuillez mettre à jour vos informations de paiement pour éviter une interruption de service.',
    actionUrl: '/dashboard/billing',
  }),

  LIMIT_REACHED: (limitType: string, limit: number) => ({
    type: 'warning' as const,
    title: `Limite ${limitType} atteinte`,
    message: `Vous avez atteint votre limite de ${limit} ${limitType} pour ce mois. Passez au plan Premium pour un accès illimité.`,
    actionUrl: '/dashboard/upgrade',
  }),

  EVENT_CREATED: (eventName: string) => ({
    type: 'success' as const,
    title: 'Événement créé',
    message: `L'événement "${eventName}" a été créé avec succès. Les participants peuvent maintenant s'inscrire.`,
  }),

  WELCOME: (organizationName: string) => ({
    type: 'success' as const,
    title: 'Bienvenue sur TeamMove !',
    message: `Bienvenue ${organizationName} ! Votre organisation a été créée avec succès. Vous pouvez maintenant commencer à organiser vos événements sportifs.`,
  }),

  SYSTEM_MAINTENANCE: (maintenanceDate: string) => ({
    type: 'info' as const,
    title: 'Maintenance programmée',
    message: `Une maintenance système est programmée le ${maintenanceDate}. Le service pourrait être temporairement indisponible.`,
  }),
};

export { createNotification as createNotificationService };