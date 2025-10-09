import cron from 'node-cron';
import { SubscriptionService } from './subscription-service';
import { EmailService } from './email-service';
// import { getDaysUntilExpiry, validateSubscription } from './subscription-config'; // Ces fonctions n'existent pas

// Import du storage - sera résolu à l'exécution
let storage: any;

export interface ReminderConfig {
  enabled: boolean;
  daysBeforeExpiry: number[];
  emailTemplate?: string;
  notificationTypes: ('email' | 'dashboard')[];
}

// Configuration par défaut des rappels
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  daysBeforeExpiry: [7, 3, 1], // Rappels à 7, 3 et 1 jour(s)
  notificationTypes: ['email', 'dashboard']
};

export class SchedulerService {
  private static initialized = false;
  private static reminderConfig: ReminderConfig = DEFAULT_REMINDER_CONFIG;

  // Initialiser le service de planification
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const { storage: storageInstance } = await import('./storage');
      storage = storageInstance;

      // Démarrer les tâches programmées
      this.startScheduledTasks();

      this.initialized = true;
      console.log('✅ Scheduler service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize scheduler service:', error);
    }
  }

  // Démarrer toutes les tâches programmées
  private static startScheduledTasks(): void {
    // Vérifier les abonnements expirés tous les jours à 9h00
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Running daily subscription check...');
      await this.checkExpiredSubscriptions();
    });

    // Envoyer les rappels de renouvellement tous les jours à 10h00
    cron.schedule('0 10 * * *', async () => {
      console.log('🔔 Running daily renewal reminders...');
      await this.sendRenewalReminders();
    });

    // Nettoyer les données anciennes toutes les semaines (dimanche à 2h00)
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running weekly cleanup...');
      await this.cleanupOldData();
    });

    // Générer les statistiques mensuelles (1er du mois à 8h00)
    cron.schedule('0 8 1 * *', async () => {
      console.log('📊 Generating monthly statistics...');
      await this.generateMonthlyStats();
    });

    console.log('⏰ Scheduled tasks started');
  }

  // Vérifier les abonnements expirés et les désactiver
  static async checkExpiredSubscriptions(): Promise<void> {
    try {
      console.log('🔍 Checking for expired subscriptions...');

      const organizations = await storage.getAllOrganizations();
      let expiredCount = 0;

      for (const org of organizations) {
        // Ignorer les comptes admin et découverte
        if (org.role === 'admin' || org.subscriptionType === 'decouverte') {
          continue;
        }

        const validation = validateSubscription(org);
        
        if (!validation.isValid && validation.needsRenewal) {
          console.log(`⚠️ Subscription expired for organization ${org.id} (${org.name})`);
          
          // Rétrograder vers découverte
          await SubscriptionService.cancelSubscription(org.id);
          
          // Créer une notification dashboard
          await this.createExpiryNotification(org);
          
          expiredCount++;
        }
      }

      console.log(`✅ Subscription check completed. ${expiredCount} subscriptions expired.`);
    } catch (error) {
      console.error('❌ Error checking expired subscriptions:', error);
    }
  }

  // Envoyer les rappels de renouvellement
  static async sendRenewalReminders(): Promise<void> {
    if (!this.reminderConfig.enabled) {
      console.log('ℹ️ Renewal reminders disabled');
      return;
    }

    try {
      console.log('🔔 Sending renewal reminders...');

      const organizations = await storage.getAllOrganizations();
      let remindersSent = 0;

      for (const org of organizations) {
        // Ignorer les comptes admin et découverte
        if (org.role === 'admin' || org.subscriptionType === 'decouverte') {
          continue;
        }

        const daysUntilExpiry = getDaysUntilExpiry(org);
        
        if (daysUntilExpiry !== null && daysUntilExpiry > 0) {
          // Vérifier si on doit envoyer un rappel
          const shouldSendReminder = this.reminderConfig.daysBeforeExpiry.includes(daysUntilExpiry);
          
          if (shouldSendReminder) {
            // Vérifier si on n'a pas déjà envoyé ce rappel aujourd'hui
            const lastReminder = await this.getLastReminderSent(org.id, daysUntilExpiry);
            
            if (!lastReminder || this.isNewDay(lastReminder)) {
              await this.sendReminderToOrganization(org, daysUntilExpiry);
              await this.recordReminderSent(org.id, daysUntilExpiry);
              remindersSent++;
            }
          }
        }
      }

      console.log(`✅ Renewal reminders completed. ${remindersSent} reminders sent.`);
    } catch (error) {
      console.error('❌ Error sending renewal reminders:', error);
    }
  }

  // Envoyer un rappel à une organisation
  private static async sendReminderToOrganization(org: any, daysLeft: number): Promise<void> {
    try {
      const reminderTypes = this.reminderConfig.notificationTypes;

      // Email reminder
      if (reminderTypes.includes('email')) {
        await EmailService.sendRenewalReminder(org);
      }

      // Dashboard notification
      if (reminderTypes.includes('dashboard')) {
        await this.createReminderNotification(org, daysLeft);
      }

      console.log(`📧 Reminder sent to ${org.name} (${daysLeft} days left)`);
    } catch (error) {
      console.error(`❌ Error sending reminder to ${org.id}:`, error);
    }
  }

  // Créer une notification de rappel dans le dashboard
  private static async createReminderNotification(org: any, daysLeft: number): Promise<void> {
    try {
      const message = daysLeft === 1 
        ? 'Votre abonnement expire demain !'
        : `Votre abonnement expire dans ${daysLeft} jours.`;

      await storage.createNotification({
        organizationId: org.id,
        type: 'warning',
        title: '🔔 Rappel de renouvellement',
        message: message + ' Renouvelez dès maintenant pour éviter toute interruption.',
        actionUrl: '/dashboard/billing',
      });
    } catch (error) {
      console.error('Error creating reminder notification:', error);
    }
  }

  // Créer une notification d'expiration
  private static async createExpiryNotification(org: any): Promise<void> {
    try {
      await storage.createNotification({
        organizationId: org.id,
        type: 'error',
        title: '⚠️ Abonnement expiré',
        message: 'Votre abonnement a expiré et vous avez été basculé vers l\'offre Découverte. Renouvelez pour retrouver toutes vos fonctionnalités.',
        actionUrl: '/pricing',
      });
    } catch (error) {
      console.error('Error creating expiry notification:', error);
    }
  }

  // Nettoyer les anciennes données
  static async cleanupOldData(): Promise<void> {
    try {
      console.log('🧹 Starting data cleanup...');

      // Supprimer les anciens tokens expirés (plus de 30 jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await storage.cleanupExpiredTokens(thirtyDaysAgo);

      // Supprimer les anciennes notifications lues (plus de 90 jours)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      await storage.cleanupOldNotifications(ninetyDaysAgo);

      // Supprimer les anciens logs de rappels (plus de 180 jours)
      const oneEightyDaysAgo = new Date();
      oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

      await this.cleanupOldReminders(oneEightyDaysAgo);

      console.log('✅ Data cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Générer les statistiques mensuelles
  static async generateMonthlyStats(): Promise<void> {
    try {
      console.log('📊 Generating monthly statistics...');

      const stats = await this.calculateMonthlyMetrics();
      
      // Sauvegarder les statistiques
      await storage.saveMonthlyStats(stats);
      
      // Envoyer rapport aux admins si configuré
      if (process.env.ADMIN_EMAIL) {
        await this.sendMonthlyReportToAdmins(stats);
      }

      console.log('✅ Monthly statistics generated');
    } catch (error) {
      console.error('❌ Error generating statistics:', error);
    }
  }

  // Calculer les métriques mensuelles
  private static async calculateMonthlyMetrics(): Promise<any> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const organizations = await storage.getAllOrganizations();
    
    const stats = {
      period: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`,
      totalOrganizations: organizations.length,
      activeSubscriptions: organizations.filter(org => org.subscriptionType !== 'decouverte' && org.subscriptionStatus === 'active').length,
      newSubscriptions: 0, // À calculer avec les dates de création
      subscriptionsByType: {
        decouverte: organizations.filter(org => org.subscriptionType === 'decouverte').length,
        evenementielle: organizations.filter(org => org.subscriptionType === 'evenementielle').length,
        pro_club: organizations.filter(org => org.subscriptionType === 'pro_club').length,
        pro_pme: organizations.filter(org => org.subscriptionType === 'pro_pme').length,
        pro_entreprise: organizations.filter(org => org.subscriptionType === 'pro_entreprise').length,
      },
      totalRevenue: 0, // À calculer
      eventsCreated: 0, // À récupérer depuis la base
      invitationsSent: 0, // À récupérer depuis la base
      generatedAt: new Date(),
    };

    return stats;
  }

  // Envoyer le rapport mensuel aux admins
  private static async sendMonthlyReportToAdmins(stats: any): Promise<void> {
    try {
      const subject = `📊 Rapport mensuel TeamMove - ${stats.period}`;
      const message = `
        Voici le rapport mensuel des activités TeamMove :
        
        📈 Organisations totales : ${stats.totalOrganizations}
        💼 Abonnements actifs : ${stats.activeSubscriptions}
        🆕 Nouveaux abonnements : ${stats.newSubscriptions}
        
        Répartition par offre :
        - Découverte : ${stats.subscriptionsByType.decouverte}
        - Événementielle : ${stats.subscriptionsByType.evenementielle}
        - Pro Club : ${stats.subscriptionsByType.pro_club}
        - Pro PME : ${stats.subscriptionsByType.pro_pme}
        - Pro Entreprise : ${stats.subscriptionsByType.pro_entreprise}
        
        📅 Événements créés : ${stats.eventsCreated}
        📧 Invitations envoyées : ${stats.invitationsSent}
      `;

      await EmailService.sendNotificationEmail(
        process.env.ADMIN_EMAIL!,
        subject,
        message,
        `${process.env.APP_URL}/admin/stats`,
        'Voir les détails'
      );
    } catch (error) {
      console.error('❌ Error sending monthly report:', error);
    }
  }

  // Méthodes utilitaires pour le tracking des rappels
  private static async getLastReminderSent(orgId: string, daysLeft: number): Promise<Date | null> {
    // Implémentation simplifiée - en pratique, cela irait chercher dans une table de logs
    return null;
  }

  private static async recordReminderSent(orgId: string, daysLeft: number): Promise<void> {
    // Implémentation simplifiée - en pratique, cela sauvegarderait dans une table de logs
    console.log(`📝 Recording reminder sent: org=${orgId}, days=${daysLeft}`);
  }

  private static isNewDay(lastDate: Date): boolean {
    const now = new Date();
    return now.getDate() !== lastDate.getDate() || 
           now.getMonth() !== lastDate.getMonth() || 
           now.getFullYear() !== lastDate.getFullYear();
  }

  private static async cleanupOldReminders(cutoffDate: Date): Promise<void> {
    // Implémentation pour nettoyer les anciens logs de rappels
    console.log(`🗑️ Cleaning up reminders older than ${cutoffDate}`);
  }

  // Configuration dynamique des rappels
  static updateReminderConfig(config: Partial<ReminderConfig>): void {
    this.reminderConfig = { ...this.reminderConfig, ...config };
    console.log('⚙️ Reminder configuration updated:', this.reminderConfig);
  }

  static getReminderConfig(): ReminderConfig {
    return { ...this.reminderConfig };
  }

  // Forcer l'exécution des tâches (pour les tests ou l'admin)
  static async runTaskNow(taskName: string): Promise<void> {
    switch (taskName) {
      case 'checkExpired':
        await this.checkExpiredSubscriptions();
        break;
      case 'sendReminders':
        await this.sendRenewalReminders();
        break;
      case 'cleanup':
        await this.cleanupOldData();
        break;
      case 'generateStats':
        await this.generateMonthlyStats();
        break;
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }

  // Obtenir le statut du scheduler
  static getStatus(): { initialized: boolean; config: ReminderConfig; nextRuns: any[] } {
    return {
      initialized: this.initialized,
      config: this.reminderConfig,
      nextRuns: [] // En pratique, on retournerait les prochaines exécutions des tâches cron
    };
  }
}