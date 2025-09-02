import { storage } from './storage';
import { emailServiceEnhanced as emailService } from './email-enhanced';
import { db } from './db';
import { scheduledReminders, events, eventParticipants, organizations } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

class ReminderSchedulerService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Démarrer le service de planification des rappels
   */
  start() {
    if (this.isRunning) {
      console.log('🔔 Reminder scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting reminder scheduler service...');
    
    // Vérifier les rappels à traiter toutes les minutes
    this.intervalId = setInterval(async () => {
      await this.processScheduledReminders();
    }, 60 * 1000); // Toutes les 60 secondes

    // Traitement initial
    this.processScheduledReminders();
  }

  /**
   * Arrêter le service de planification
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Reminder scheduler stopped');
  }

  /**
   * Traiter les rappels programmés
   */
  private async processScheduledReminders() {
    try {
      // Récupérer tous les rappels en attente dont l'heure est arrivée
      const pendingReminders = await storage.getPendingReminders();

      if (pendingReminders.length === 0) {
        return; // Aucun rappel à traiter
      }

      console.log(`📝 Processing ${pendingReminders.length} scheduled reminder(s)...`);

      for (const reminder of pendingReminders) {
        await this.processIndividualReminder(reminder);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled reminders:', error);
    }
  }

  /**
   * Traiter un rappel individuel
   */
  private async processIndividualReminder(reminder: any) {
    try {
      console.log(`📨 Processing reminder ${reminder.id} for event ${reminder.eventId}`);

      // Marquer le rappel comme en cours de traitement
      await storage.updateScheduledReminder(reminder.id, {
        status: 'sent', // Optimiste, on changera en 'failed' si ça échoue
        executedAt: new Date()
      });

      // Récupérer les détails de l'événement et de l'organisation
      const event = await storage.getEvent(reminder.eventId);
      if (!event) {
        throw new Error(`Event ${reminder.eventId} not found`);
      }

      const organization = await storage.getOrganization(reminder.organizationId);
      if (!organization) {
        throw new Error(`Organization ${reminder.organizationId} not found`);
      }

      // Récupérer les participants
      const participants = await storage.getEventParticipants(reminder.eventId);
      if (participants.length === 0) {
        console.log(`⚠️ No participants found for event ${reminder.eventId}`);
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      // Envoyer le rappel à tous les participants
      for (const participant of participants) {
        try {
          let messageContent = '';
          
          if (reminder.customMessage) {
            messageContent = reminder.customMessage;
            
            if (reminder.includeEventDetails) {
              messageContent += '\n\n--- Détails de l\'événement ---\n';
              messageContent += `📅 Événement: ${event.name}\n`;
              messageContent += `🏃 Sport: ${event.sport}\n`;
              messageContent += `📍 Rendez-vous: ${event.meetingPoint}\n`;
              messageContent += `🎯 Destination: ${event.destination}\n`;
              messageContent += `🕐 Date: ${new Date(event.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}\n`;
              
              if (event.description) {
                messageContent += `📝 Description: ${event.description}\n`;
              }
            }
          } else {
            // Message par défaut basé sur le nombre de jours
            const daysText = reminder.daysBeforeEvent === 1 ? 'demain' : `dans ${reminder.daysBeforeEvent} jours`;
            messageContent = `🔔 Rappel : L'événement "${event.name}" a lieu ${daysText} !\n\n`;
            messageContent += `📅 Date: ${new Date(event.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}\n`;
            messageContent += `🏃 Sport: ${event.sport}\n`;
            messageContent += `📍 Rendez-vous: ${event.meetingPoint}\n`;
            messageContent += `🎯 Destination: ${event.destination}\n\n`;
            messageContent += `N'oubliez pas de vérifier les détails du covoiturage et de prévenir en cas d'imprévu !`;
          }

          const emailSent = await emailService.sendCustomEmail(
            participant.email,
            `🔔 Rappel - ${event.name}`,
            messageContent,
            organization
          );

          if (emailSent.success) {
            successCount++;
          } else {
            failedCount++;
            console.error(`Failed to send reminder to ${participant.email}:`, emailSent.error);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error sending reminder to ${participant.email}:`, error);
        }
      }

      // Mettre à jour les statistiques du rappel
      await storage.updateScheduledReminder(reminder.id, {
        sentCount: successCount,
        failedCount: failedCount,
        status: failedCount === 0 ? 'sent' : (successCount > 0 ? 'sent' : 'failed')
      });

      console.log(`✅ Reminder ${reminder.id} processed: ${successCount} sent, ${failedCount} failed`);

    } catch (error) {
      console.error(`❌ Error processing reminder ${reminder.id}:`, error);
      
      // Marquer le rappel comme échoué
      await storage.updateScheduledReminder(reminder.id, {
        status: 'failed',
        executedAt: new Date(),
        failedCount: 1
      }).catch(updateError => {
        console.error('Failed to update reminder status:', updateError);
      });
    }
  }

  /**
   * Nettoyer les anciens rappels (older than 30 days)
   */
  async cleanupOldReminders() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await db.delete(scheduledReminders)
        .where(and(
          sql`created_at < ${thirtyDaysAgo}`,
          sql`status != 'pending'`
        ));

      console.log('🧹 Old reminders cleaned up');
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  /**
   * Obtenir des statistiques sur les rappels
   */
  async getStats() {
    try {
      const stats = await db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        sent: sql<number>`count(*) filter (where status = 'sent')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`
      }).from(scheduledReminders);

      return stats[0] || { total: 0, pending: 0, sent: 0, failed: 0 };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return { total: 0, pending: 0, sent: 0, failed: 0 };
    }
  }
}

// Instance singleton
export const reminderScheduler = new ReminderSchedulerService();

// Démarrer automatiquement le service
if (process.env.NODE_ENV !== 'test') {
  reminderScheduler.start();
  
  // Nettoyer les anciens rappels une fois par jour
  setInterval(() => {
    reminderScheduler.cleanupOldReminders();
  }, 24 * 60 * 60 * 1000);
}

export default reminderScheduler;