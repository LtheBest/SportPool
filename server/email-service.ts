import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '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');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'alt.f7-3ywk4mu@yopmail.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'teammove';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  
  // Créer le template HTML moderne et professionnel
  static createEmailTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TeamMove</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                letter-spacing: -1px;
            }
            .tagline {
                font-size: 16px;
                opacity: 0.9;
                margin: 0;
            }
            .content {
                padding: 40px 30px;
            }
            .plan-card {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 25px;
                border-radius: 8px;
                margin: 25px 0;
                text-align: center;
            }
            .plan-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .plan-price {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 15px;
            }
            .features {
                background-color: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px 0;
            }
            .feature-icon {
                color: #10b981;
                margin-right: 12px;
                font-weight: bold;
            }
            .invoice-section {
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                background-color: #fafafa;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
            }
            .invoice-details {
                margin-bottom: 15px;
            }
            .invoice-total {
                background-color: #667eea;
                color: white;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
            .footer {
                background-color: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
            }
            .contact-info {
                margin-top: 15px;
            }
            .social-links {
                margin-top: 20px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 0 10px;
                }
                .header, .content, .footer {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏃‍♂️ TeamMove</div>
                <p class="tagline">Votre plateforme de covoiturage sportif</p>
            </div>
            
            <div class="content">
                ${content}
            </div>
            
            <div class="footer">
                <p><strong>TeamMove</strong> - Simplifiez l'organisation de vos événements sportifs</p>
                <div class="contact-info">
                    <p>📧 Support: support@teammove.fr</p>
                    <p>🌐 Site web: <a href="${process.env.APP_URL || 'https://teammove.fr'}" style="color: #667eea;">teammove.fr</a></p>
                </div>
                <div class="social-links">
                    <p>Suivez-nous sur nos réseaux sociaux pour ne rien manquer !</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Envoyer email de confirmation d'abonnement
  static async sendSubscriptionEmail(
    organization: any, 
    plan: any, 
    type: 'activated' | 'cancelled' | 'expired' | 'renewal_reminder'
  ): Promise<void> {
    try {
      const template = this.getSubscriptionEmailTemplate(organization, plan, type);
      
      const msg = {
        to: organization.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: template.subject,
        html: this.createEmailTemplate(template.html),
        text: template.text,
      };

      await sgMail.send(msg);
      console.log(`✅ Email d'abonnement envoyé: ${type} to ${organization.email}`);
    } catch (error) {
      console.error('❌ Erreur envoi email abonnement:', error);
      throw error;
    }
  }

  // Générer le template d'email selon le type
  private static getSubscriptionEmailTemplate(organization: any, plan: any, type: string): EmailTemplate {
    const orgName = `${organization.contactFirstName} ${organization.contactLastName}`;
    const planPrice = plan.price > 0 ? `${(plan.price / 100).toFixed(2)}€` : 'Gratuit';
    
    switch (type) {
      case 'activated':
        return {
          subject: `🎉 Bienvenue dans ${plan.name} - TeamMove`,
          html: `
            <h2>Félicitations ${orgName} ! 🎉</h2>
            <p>Votre abonnement <strong>${plan.name}</strong> a été activé avec succès.</p>
            
            <div class="plan-card">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">${planPrice}</div>
                <p style="margin: 0; opacity: 0.9;">${plan.description}</p>
            </div>

            <div class="features">
                <h3 style="margin-top: 0; color: #374151;">✨ Vos nouvelles fonctionnalités :</h3>
                ${plan.features.map((feature: string) => `
                    <div class="feature-item">
                        <span class="feature-icon">✅</span>
                        <span>${feature}</span>
                    </div>
                `).join('')}
            </div>

            ${this.generateInvoiceSection(plan, organization)}

            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL}/dashboard" class="button">
                    Accéder à votre tableau de bord
                </a>
            </div>

            <p><strong>Merci de faire confiance à TeamMove !</strong></p>
            <p>Notre équipe est là pour vous accompagner dans l'organisation de vos événements sportifs.</p>
          `,
          text: `Félicitations ${orgName}! Votre abonnement ${plan.name} (${planPrice}) a été activé. Accédez à votre tableau de bord: ${process.env.APP_URL}/dashboard`
        };

      case 'cancelled':
        return {
          subject: `Abonnement annulé - TeamMove`,
          html: `
            <h2>Abonnement annulé</h2>
            <p>Bonjour ${orgName},</p>
            <p>Votre abonnement <strong>${plan.name}</strong> a été annulé avec succès.</p>
            <p>Vous avez été automatiquement basculé vers l'offre <strong>Découverte</strong>.</p>
            
            <div class="features">
                <h3>🔄 Votre offre actuelle - Découverte :</h3>
                <div class="feature-item">
                    <span class="feature-icon">✅</span>
                    <span>1 événement maximum</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✅</span>
                    <span>Jusqu'à 20 invitations</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✅</span>
                    <span>Support par email</span>
                </div>
            </div>

            <p>Vous pouvez à tout moment souscrire à une nouvelle offre depuis votre tableau de bord.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL}/pricing" class="button">
                    Voir nos offres
                </a>
            </div>
          `,
          text: `Bonjour ${orgName}, votre abonnement ${plan.name} a été annulé. Vous êtes maintenant sur l'offre Découverte.`
        };

      case 'expired':
        return {
          subject: `⚠️ Abonnement expiré - TeamMove`,
          html: `
            <h2>⚠️ Votre abonnement a expiré</h2>
            <p>Bonjour ${orgName},</p>
            <p>Votre abonnement <strong>${plan.name}</strong> a expiré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}.</p>
            <p>Vous avez été automatiquement basculé vers l'offre <strong>Découverte</strong>.</p>
            
            <p><strong>Pour continuer à profiter de toutes les fonctionnalités :</strong></p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL}/pricing" class="button">
                    Renouveler mon abonnement
                </a>
            </div>
          `,
          text: `Votre abonnement ${plan.name} a expiré. Renouvelez-le sur ${process.env.APP_URL}/pricing`
        };

      case 'renewal_reminder':
        const daysLeft = Math.ceil((new Date(organization.subscriptionEndDate || organization.packageExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return {
          subject: `🔔 Rappel : Votre abonnement expire dans ${daysLeft} jour(s)`,
          html: `
            <h2>🔔 Rappel de renouvellement</h2>
            <p>Bonjour ${orgName},</p>
            <p>Votre abonnement <strong>${plan.name}</strong> expire dans <strong>${daysLeft} jour(s)</strong>.</p>
            
            <p>Pour éviter toute interruption de service, nous vous invitons à renouveler votre abonnement dès maintenant.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL}/dashboard/billing" class="button">
                    Renouveler maintenant
                </a>
            </div>
            
            <p><em>Si vous avez déjà renouvelé, vous pouvez ignorer ce message.</em></p>
          `,
          text: `Votre abonnement ${plan.name} expire dans ${daysLeft} jour(s). Renouvelez sur ${process.env.APP_URL}/dashboard/billing`
        };

      default:
        throw new Error(`Type d'email non supporté: ${type}`);
    }
  }

  // Générer la section facture
  private static generateInvoiceSection(plan: any, organization: any): string {
    if (plan.price === 0) return '';

    const now = new Date();
    const formattedDate = format(now, 'dd MMMM yyyy', { locale: fr });
    const invoiceNumber = `TM-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${organization.id.slice(-6)}`;

    return `
      <div class="invoice-section">
          <div class="invoice-header">
              <div>
                  <h3 style="margin: 0; color: #374151;">📄 Facture</h3>
                  <p style="margin: 5px 0; color: #6b7280;">N° ${invoiceNumber}</p>
              </div>
              <div style="text-align: right;">
                  <p style="margin: 0; color: #6b7280;">Date: ${formattedDate}</p>
              </div>
          </div>
          
          <div class="invoice-details">
              <p><strong>Facturé à :</strong></p>
              <p>${organization.name}<br>
                 ${organization.contactFirstName} ${organization.contactLastName}<br>
                 ${organization.email}</p>
          </div>
          
          <div class="invoice-details">
              <p><strong>Détail :</strong></p>
              <p>${plan.name} - ${plan.description}</p>
              <p>Période: ${formattedDate}</p>
          </div>
          
          <div class="invoice-total">
              Total TTC: ${(plan.price / 100).toFixed(2)}€
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
              <em>Cette facture est générée automatiquement. Pour toute question, contactez notre support.</em>
          </p>
      </div>
    `;
  }

  // Envoyer email de rappel de renouvellement
  static async sendRenewalReminder(organization: any): Promise<void> {
    try {
      // Déterminer le plan actuel
      const currentPlan = {
        name: organization.subscriptionType || 'Découverte',
        price: 0, // Sera mis à jour selon le type
        description: 'Votre abonnement actuel'
      };

      await this.sendSubscriptionEmail(organization, currentPlan, 'renewal_reminder');
    } catch (error) {
      console.error('❌ Erreur envoi rappel renouvellement:', error);
    }
  }

  // Envoyer email de notification générique
  static async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      let content = `
        <h2>${subject}</h2>
        <p>${message}</p>
      `;

      if (actionUrl && actionText) {
        content += `
          <div style="text-align: center; margin: 30px 0;">
              <a href="${actionUrl}" class="button">
                  ${actionText}
              </a>
          </div>
        `;
      }

      const msg = {
        to: to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: subject,
        html: this.createEmailTemplate(content),
        text: `${subject}\n\n${message}${actionUrl ? `\n\n${actionText}: ${actionUrl}` : ''}`
      };

      await sgMail.send(msg);
      console.log(`✅ Email de notification envoyé à: ${to}`);
    } catch (error) {
      console.error('❌ Erreur envoi email notification:', error);
      throw error;
    }
  }

  // Envoyer email de confirmation de suppression de compte
  static async sendAccountDeletionEmail(
    userEmail: string,
    userName: string,
    userType: 'user' | 'organizer',
    deletedBy: 'admin' | 'self',
    eventsCount?: number
  ): Promise<void> {
    try {
      const template = this.getAccountDeletionEmailTemplate(userName, userType, deletedBy, eventsCount);
      
      const msg = {
        to: userEmail,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: template.subject,
        html: this.createEmailTemplate(template.html),
        text: template.text,
      };

      await sgMail.send(msg);
      console.log(`✅ Email de suppression de compte envoyé à: ${userEmail}`);
    } catch (error) {
      console.error('❌ Erreur envoi email suppression compte:', error);
      throw error;
    }
  }

  // Générer le template d'email de suppression de compte
  private static getAccountDeletionEmailTemplate(
    userName: string,
    userType: 'user' | 'organizer',
    deletedBy: 'admin' | 'self',
    eventsCount?: number
  ): EmailTemplate {
    const userTypeText = userType === 'organizer' ? 'organisateur' : 'utilisateur';
    const deletedByText = deletedBy === 'admin' ? 'par un administrateur' : 'à votre demande';
    
    const subject = `Confirmation de suppression de votre compte TeamMove`;
    
    const html = `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 20px;">👋</div>
        <h2 style="color: #dc2626;">Votre compte TeamMove a été supprimé</h2>
      </div>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="color: #dc2626; margin-top: 0;">⚠️ Suppression confirmée</h3>
        <p><strong>Bonjour ${userName},</strong></p>
        <p>Nous vous confirmons que votre compte ${userTypeText} TeamMove a été supprimé ${deletedByText} le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}.</p>
      </div>

      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">📋 Récapitulatif des données supprimées :</h3>
        <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
          <li>Informations personnelles et de contact</li>
          <li>Paramètres et préférences de compte</li>
          ${eventsCount && eventsCount > 0 ? `<li>${eventsCount} événement(s) créé(s) et leurs données associées</li>` : ''}
          <li>Historique des participations aux événements</li>
          <li>Messages et communications</li>
          <li>Données de connexion et d'authentification</li>
        </ul>
      </div>

      ${deletedBy === 'admin' ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #92400e; margin-top: 0;">ℹ️ Suppression administrative</h3>
          <p style="color: #92400e;">
            Votre compte a été supprimé par un administrateur TeamMove. Si vous pensez qu'il s'agit d'une erreur 
            ou si vous souhaitez plus d'informations sur les raisons de cette suppression, 
            vous pouvez contacter notre équipe support.
          </p>
        </div>
      ` : `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #065f46; margin-top: 0;">✅ Suppression à votre demande</h3>
          <p style="color: #065f46;">
            Votre demande de suppression de compte a été traitée conformément à vos souhaits.
          </p>
        </div>
      `}

      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #475569; margin-top: 0;">🔒 Confidentialité et sécurité</h3>
        <p style="color: #64748b; margin-bottom: 15px;">
          Conformément au RGPD et à nos engagements de confidentialité :
        </p>
        <ul style="color: #64748b; margin: 0; padding-left: 20px;">
          <li>Toutes vos données personnelles ont été définitivement supprimées</li>
          <li>Les sauvegardes contenant vos données seront automatiquement purgées</li>
          <li>Votre adresse email a été ajoutée à notre liste d'exclusion</li>
          <li>Aucune réactivation automatique n'est possible</li>
        </ul>
      </div>

      <div style="background-color: #e0f2fe; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
        <h3 style="color: #0277bd; margin-top: 0;">💙 Nous vous remercions</h3>
        <p style="color: #01579b;">
          Merci d'avoir fait confiance à TeamMove pour l'organisation de vos événements sportifs. 
          Nous espérons avoir contribué positivement à vos activités.
        </p>
        ${deletedBy === 'self' ? `
          <p style="color: #01579b;">
            Si vous changez d'avis à l'avenir, vous êtes toujours le bienvenu pour créer un nouveau compte.
          </p>
        ` : ''}
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; margin-bottom: 15px;">
          <strong>Besoin d'aide ou de renseignements ?</strong>
        </p>
        <p style="color: #6b7280;">
          📧 support@teammove.fr<br>
          🌐 <a href="${process.env.APP_URL || 'https://teammove.fr'}" style="color: #667eea;">teammove.fr</a>
        </p>
      </div>
    `;

    const text = `
Votre compte TeamMove a été supprimé

Bonjour ${userName},

Nous vous confirmons que votre compte ${userTypeText} TeamMove a été supprimé ${deletedByText} le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}.

Données supprimées :
- Informations personnelles et de contact
- Paramètres et préférences de compte
${eventsCount && eventsCount > 0 ? `- ${eventsCount} événement(s) créé(s) et leurs données associées\n` : ''}- Historique des participations aux événements
- Messages et communications
- Données de connexion et d'authentification

${deletedBy === 'admin' ? 
  'Votre compte a été supprimé par un administrateur TeamMove. Pour plus d\'informations, contactez support@teammove.fr' :
  'Votre demande de suppression de compte a été traitée conformément à vos souhaits.'
}

Conformément au RGPD, toutes vos données personnelles ont été définitivement supprimées.

Merci d'avoir fait confiance à TeamMove.

Support: support@teammove.fr
Site: ${process.env.APP_URL || 'https://teammove.fr'}
    `;

    return { subject, html, text };
  }



  // Méthodes utilitaires pour les emails d'abonnement
  private static formatPrice(priceInCents: number): string {
    return `${(priceInCents / 100).toFixed(2)}€`;
  }

  private static getIntervalSuffix(interval: string): string {
    switch (interval) {
      case 'monthly': return '/mois';
      case 'annual': return '/an';
      case 'pack_single': return '';
      case 'pack_10': return ' (pack 10)';
      default: return '';
    }
  }

  private static getSubscriptionName(subscriptionType: string): string {
    switch (subscriptionType) {
      case 'decouverte': return 'Découverte';
      case 'evenementielle': return 'Événementielle';
      case 'pro_club': return 'Clubs & Associations';
      case 'pro_pme': return 'PME';
      case 'pro_entreprise': return 'Grandes Entreprises';
      default: return 'Abonnement';
    }
  }

  private static calculateDaysLeft(organization: any): number {
    if (!organization.subscriptionEndDate && !organization.packageExpiryDate) return 0;
    
    const expiryDate = new Date(organization.subscriptionEndDate || organization.packageExpiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private static generateFeaturesList(plan: any): string {
    let features: string[] = [];
    
    switch (plan.type) {
      case 'evenementielle':
        features = [
          plan.id?.includes('pack10') ? '10 événements complets' : '1 événement complet',
          'Invitations illimitées',
          'Support prioritaire',
          'Messagerie intégrée'
        ];
        break;
      case 'pro_club':
        features = [
          'Événements illimités',
          'Invitations illimitées',
          'Branding personnalisé',
          'API d\'intégration'
        ];
        break;
      case 'pro_pme':
        features = [
          'Tout de Clubs & Associations',
          'Multi-utilisateurs (5 admins)',
          'Support téléphonique',
          'Formation personnalisée'
        ];
        break;
      case 'pro_entreprise':
        features = [
          'Tout de PME',
          'Multi-utilisateurs illimités',
          'Support 24/7',
          'Account Manager dédié'
        ];
        break;
      default:
        features = ['Fonctionnalités avancées'];
    }

    return `
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Vos fonctionnalités incluses :</h3>
        <ul>
          ${features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Vérifier la configuration email
  static async verifyConfiguration(): Promise<{ valid: boolean; issues?: string[] }> {
    const issues: string[] = [];

    if (!process.env.SENDGRID_API_KEY) {
      issues.push('SENDGRID_API_KEY manquante');
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      issues.push('SENDGRID_FROM_EMAIL manquante');
    }

    // Test basique de SendGrid
    try {
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // Pas de test d'envoi réel pour éviter les frais
      }
    } catch (error) {
      issues.push('Configuration SendGrid invalide');
    }

    return {
      valid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    };
  }
}

// Fonction utilitaire pour envoyer les emails d'abonnement (export pour compatibilité)
export async function sendSubscriptionEmail(organization: any, plan: any, type: 'activated' | 'cancelled' | 'expired' | 'renewal_reminder'): Promise<void> {
  return EmailService.sendSubscriptionEmail(organization, plan, type);
}