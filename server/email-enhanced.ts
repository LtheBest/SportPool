import sgMail from '@sendgrid/mail';

// Configuration SendGrid améliorée avec validation
class EmailServiceEnhanced {
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;
  private isConfigured: boolean = false;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@covoitsports.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'CovoitSports';
    this.appUrl = process.env.APP_URL || 'https://sportpool.onrender.com';
    
    this.initializeService();
  }

  private initializeService() {
    if (!this.apiKey) {
      console.error('❌ SENDGRID_API_KEY is not configured');
      return;
    }

    if (!this.apiKey.startsWith('SG.')) {
      console.error('❌ Invalid SendGrid API key format');
      return;
    }

    try {
      sgMail.setApiKey(this.apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
      this.isConfigured = false;
    }
  }

  // Validation de l'API key SendGrid
  async validateApiKey(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // Test avec un petit appel à l'API SendGrid
      const testMsg = {
        to: this.fromEmail,
        from: this.fromEmail,
        subject: 'API Key Validation Test',
        text: 'This is a test to validate the API key',
        html: '<p>This is a test to validate the API key</p>',
        mail_settings: {
          sandbox_mode: { enable: true } // Mode sandbox pour ne pas envoyer réellement
        }
      };

      await sgMail.send(testMsg);
      console.log('✅ SendGrid API key is valid');
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid API key validation failed:', error?.response?.body || error.message);
      
      if (error.code === 401) {
        console.error('🔑 API Key is invalid or expired. Please check your SendGrid configuration.');
      } else if (error.code === 403) {
        console.error('🔑 API Key does not have sufficient permissions.');
      }
      
      return false;
    }
  }

  // Envoi d'email sécurisé avec retry
  async sendEmail(data: {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text: string;
    fromEmail?: string;
    fromName?: string;
  }, retries: number = 2): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('❌ SendGrid not configured properly');
      return false;
    }

    // Validation des données
    if (!data.to || !data.subject || (!data.html && !data.text)) {
      console.error('❌ Missing required email data');
      return false;
    }

    const msg = {
      to: {
        email: data.to,
        name: data.toName || data.to
      },
      from: {
        email: data.fromEmail || this.fromEmail,
        name: data.fromName || this.fromName
      },
      subject: data.subject,
      text: data.text,
      html: data.html,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await sgMail.send(msg);
        console.log(`✅ Email sent successfully to: ${data.to}`);
        return true;
      } catch (error: any) {
        const errorInfo = error?.response?.body?.errors?.[0] || error;
        
        console.error(`❌ Attempt ${attempt + 1} failed to send email to ${data.to}:`, {
          code: error.code,
          message: errorInfo.message || error.message,
          field: errorInfo.field || 'unknown'
        });

        // Si c'est une erreur d'authentification, ne pas retry
        if (error.code === 401 || error.code === 403) {
          console.error('🔑 Authentication error - stopping retries');
          break;
        }

        // Si c'est le dernier essai, arrêter
        if (attempt === retries) {
          break;
        }

        // Attendre avant retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  // Version améliorée de l'envoi groupé d'invitations
  async sendBulkEventInvitations(
    emails: string[],
    eventName: string,
    organizationName: string,
    eventDate: Date,
    eventLink: string,
    meetingPoint?: string,
    destination?: string,
    sport?: string,
    duration?: string,
    organizerContactName?: string,
    organizerEmail?: string
  ): Promise<{ success: number; failed: string[] }> {
    console.log(`📧 Starting bulk email sending for ${emails.length} recipients`);
    
    // Vérifier d'abord la configuration
    if (!this.isConfigured) {
      console.error('❌ SendGrid not configured - all emails will fail');
      return { success: 0, failed: emails };
    }

    // Valider l'API key avant d'essayer d'envoyer
    const isValid = await this.validateApiKey();
    if (!isValid) {
      console.error('❌ SendGrid API key is invalid - all emails will fail');
      return { success: 0, failed: emails };
    }

    const results = {
      success: 0,
      failed: [] as string[]
    };

    // Traitement par lots pour éviter le rate limiting
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 seconde entre les lots

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      
      console.log(`📨 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails)`);

      const batchPromises = batch.map(async (email) => {
        try {
          const sent = await this.sendEventInvitationWithLink(
            email,
            eventName,
            organizationName,
            eventDate,
            eventLink,
            meetingPoint,
            destination,
            sport,
            duration,
            organizerContactName,
            organizerEmail
          );
          
          if (sent) {
            results.success++;
          } else {
            results.failed.push(email);
          }
        } catch (error) {
          console.error(`❌ Failed to send invitation to ${email}:`, error);
          results.failed.push(email);
        }
      });

      // Attendre que tous les emails du lot soient traités
      await Promise.all(batchPromises);

      // Délai entre les lots (sauf pour le dernier)
      if (i + BATCH_SIZE < emails.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`📊 Email sending completed: ${results.success} successful, ${results.failed.length} failed`);
    if (results.failed.length > 0) {
      console.log('📝 Failed to send invitations to:', results.failed);
    }

    return results;
  }

  // Méthode pour tester la configuration
  async testConfiguration(): Promise<{
    isConfigured: boolean;
    apiKeyValid: boolean;
    fromEmailValid: boolean;
    canSendEmails: boolean;
  }> {
    const result = {
      isConfigured: this.isConfigured,
      apiKeyValid: false,
      fromEmailValid: false,
      canSendEmails: false
    };

    if (!this.isConfigured) {
      return result;
    }

    // Test API key
    result.apiKeyValid = await this.validateApiKey();

    // Test from email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    result.fromEmailValid = emailRegex.test(this.fromEmail);

    result.canSendEmails = result.apiKeyValid && result.fromEmailValid;

    return result;
  }

  // Réutilisation des méthodes existantes mais avec la nouvelle logique d'envoi
  async sendEventInvitationWithLink(
    email: string,
    eventName: string,
    organizationName: string,
    eventDate: Date,
    eventLink: string,
    meetingPoint?: string,
    destination?: string,
    sport?: string,
    duration?: string,
    organizerContactName?: string,
    organizerEmail?: string
  ): Promise<boolean> {
    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const contactOrganizerUrl = organizerEmail 
      ? `mailto:${organizerEmail}?subject=Question%20à%20propos%20de%20l'événement%20"${encodeURIComponent(eventName)}"` 
      : null;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">
            🎯 Vous êtes invité à un événement !
          </h1>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin-bottom: 15px;">${eventName}</h2>
            <div style="margin-bottom: 20px;">
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Organisé par :</strong> ${organizationName}
              </p>
              ${sport ? `<p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Sport :</strong> ${sport}
              </p>` : ''}
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Date :</strong> ${formattedDate}
              </p>
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Heure :</strong> ${formattedTime}
              </p>
              ${duration ? `<p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Durée :</strong> ${duration}
              </p>` : ''}
              ${meetingPoint ? `<p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>RDV :</strong> ${meetingPoint}
              </p>` : ''}
              ${destination ? `<p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Destination :</strong> ${destination}
              </p>` : ''}
            </div>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              Un nouvel événement vient d'être créé et vous êtes automatiquement invité ! 
              Cliquez sur le lien ci-dessous pour voir tous les détails et confirmer votre participation.
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${eventLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-bottom: 10px;">
                Voir l'événement et participer
              </a>
            </div>
            ${contactOrganizerUrl ? `
              <div style="text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                  Une question ? Contactez l'organisateur
                </p>
                <a href="${contactOrganizerUrl}" style="display: inline-block; background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                  ✉️ Contacter ${organizerContactName || organizationName}
                </a>
              </div>
            ` : ''}
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">
            Si le bouton ne fonctionne pas, copiez ce lien :<br>
            <a href="${eventLink}" style="color: #007bff;">${eventLink}</a>
          </p>
        </div>
      </div>
    `;

    const text = `
      Vous êtes invité à un événement !
      
      Événement : ${eventName}
      Organisé par : ${organizationName}
      ${sport ? `Sport : ${sport}` : ''}
      Date : ${formattedDate}
      Heure : ${formattedTime}
      ${duration ? `Durée : ${duration}` : ''}
      ${meetingPoint ? `RDV : ${meetingPoint}` : ''}
      ${destination ? `Destination : ${destination}` : ''}
      
      Un nouvel événement vient d'être créé et vous êtes automatiquement invité !
      Cliquez sur ce lien pour voir tous les détails et confirmer votre participation :
      
      ${eventLink}
      
      ${organizerEmail ? `Pour toute question, contactez l'organisateur : ${organizerEmail}` : ''}
    `;

    return await this.sendEmail({
      to: email,
      subject: `Nouvel événement: ${eventName} - ${organizationName}`,
      html,
      text
    });
  }

  // Diagnostic complet du service email
  async diagnoseService(): Promise<string> {
    const config = await this.testConfiguration();
    
    let report = '📧 SendGrid Service Diagnostic Report\n';
    report += '=====================================\n\n';
    
    report += `🔧 Configuration Status: ${config.isConfigured ? '✅ OK' : '❌ NOT CONFIGURED'}\n`;
    report += `🔑 API Key Status: ${config.apiKeyValid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `📬 From Email Status: ${config.fromEmailValid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `📤 Can Send Emails: ${config.canSendEmails ? '✅ YES' : '❌ NO'}\n\n`;
    
    if (!config.isConfigured) {
      report += '❗ Issues Found:\n';
      report += `   - SENDGRID_API_KEY: ${this.apiKey ? 'SET' : 'MISSING'}\n`;
      report += `   - SENDGRID_FROM_EMAIL: ${this.fromEmail}\n`;
      report += `   - SENDGRID_FROM_NAME: ${this.fromName}\n\n`;
    }
    
    if (!config.apiKeyValid) {
      report += '🔧 Recommended Actions:\n';
      report += '   1. Check your SendGrid API key in environment variables\n';
      report += '   2. Ensure the API key starts with "SG."\n';
      report += '   3. Verify the API key has "Mail Send" permissions in SendGrid dashboard\n';
      report += '   4. Check if the API key is not expired\n\n';
    }
    
    return report;
  }
}

export const emailServiceEnhanced = new EmailServiceEnhanced();
export { EmailServiceEnhanced };