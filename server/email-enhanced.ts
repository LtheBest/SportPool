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
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@TeamMoves.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'TeamMoves';
    this.appUrl = process.env.APP_URL || 'https://teammove.fr';
    
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

  // Send message to participants with reply functionality
  async sendMessageToParticipant(
    participantEmail: string,
    participantName: string,
    messageContent: string,
    eventName: string,
    organizationName: string,
    organizerName: string,
    replyToken: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const replyUrl = `${this.appUrl}/api/messages/reply/${replyToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💬 Nouveau Message</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 18px; margin-bottom: 20px;">
            Bonjour ${participantName},
          </p>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Vous avez reçu un nouveau message de <strong>${organizerName}</strong> concernant l'événement <strong>${eventName}</strong> :
          </p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
              ${messageContent.replace(/\n/g, '<br>')}
            </p>
          </div>
          
          <div style="background-color: #e8f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #0056b3; font-size: 16px; margin-bottom: 15px; font-weight: bold;">
              💡 Vous pouvez répondre directement par email !
            </p>
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
              Répondez simplement à cet email et votre message sera automatiquement transmis à l'organisateur.
            </p>
            <p style="color: #666; font-size: 12px; font-style: italic;">
              Organisé par ${organizationName}
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Ce message concerne l'événement "${eventName}"<br>
            Organisé par ${organizationName}
          </p>
        </div>
      </div>
    `;

    const text = `
      Nouveau Message - ${eventName}
      
      Bonjour ${participantName},
      
      Vous avez reçu un nouveau message de ${organizerName} concernant l'événement "${eventName}" :
      
      "${messageContent}"
      
      Vous pouvez répondre directement à cet email et votre message sera automatiquement transmis à l'organisateur.
      
      Organisé par ${organizationName}
    `;

    return await this.sendEmail({
      to: participantEmail,
      subject: `Message de ${organizerName} - ${eventName}`,
      html,
      text,
      replyTo: `${this.fromEmail}+${replyToken}@reply.TeamMove.com`
    });
  }

  // Send reply notification to organizer
  async sendReplyNotificationToOrganizer(
    organizerEmail: string,
    organizerName: string,
    participantName: string,
    replyContent: string,
    eventName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💬 Nouvelle Réponse</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 18px; margin-bottom: 20px;">
            Bonjour ${organizerName},
          </p>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            <strong>${participantName}</strong> a répondu à votre message concernant l'événement <strong>${eventName}</strong> :
          </p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
              ${replyContent.replace(/\n/g, '<br>')}
            </p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #155724; font-size: 14px; margin: 0;">
              <strong>De :</strong> ${participantName}<br>
              <strong>Événement :</strong> ${eventName}
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Vous pouvez répondre directement à ce participant en répondant à cet email.
          </p>
        </div>
      </div>
    `;

    const text = `
      Nouvelle Réponse - ${eventName}
      
      Bonjour ${organizerName},
      
      ${participantName} a répondu à votre message concernant l'événement "${eventName}" :
      
      "${replyContent}"
      
      Vous pouvez répondre directement à ce participant en répondant à cet email.
    `;

    return await this.sendEmail({
      to: organizerEmail,
      subject: `Réponse de ${participantName} - ${eventName}`,
      html,
      text
    });
  }

  // Send reminder email to participants
  async sendReminderEmail(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    eventDate: Date,
    meetingPoint: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #333; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⏰ Rappel d'Événement</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 18px; margin-bottom: 20px;">
            Bonjour ${participantName},
          </p>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Nous vous rappelons que l'événement <strong>${eventName}</strong> approche !
          </p>
          
          <div style="background-color: #fff8e1; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📅 Détails de l'événement</h3>
            <p style="color: #666; margin: 8px 0;"><strong>Événement :</strong> ${eventName}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Date :</strong> ${formattedDate}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Heure :</strong> ${formattedTime}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Rendez-vous :</strong> ${meetingPoint}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Organisé par :</strong> ${organizationName}</p>
          </div>
          
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            N'oubliez pas de vous présenter à l'heure au point de rendez-vous. À bientôt !
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Ceci est un rappel automatique pour l'événement "${eventName}"
          </p>
        </div>
      </div>
    `;

    const text = `
      Rappel d'Événement - ${eventName}
      
      Bonjour ${participantName},
      
      Nous vous rappelons que l'événement "${eventName}" approche !
      
      Détails :
      - Événement : ${eventName}
      - Date : ${formattedDate}
      - Heure : ${formattedTime}
      - Rendez-vous : ${meetingPoint}
      - Organisé par : ${organizationName}
      
      N'oubliez pas de vous présenter à l'heure au point de rendez-vous. À bientôt !
    `;

    return await this.sendEmail({
      to: participantEmail,
      subject: `Rappel : ${eventName} - ${formattedDate}`,
      html,
      text
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const resetLink = `${this.appUrl}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔒 Réinitialisation du mot de passe</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 18px; margin-bottom: 20px;">
            Bonjour ${name},
          </p>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Vous avez demandé une réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <div style="background-color: #fff5f5; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #b91c1c; font-size: 14px; margin: 0;">
              <strong>⚠️ Important :</strong> Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Si le bouton ne fonctionne pas, copiez ce lien :<br>
            <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
          </p>
        </div>
      </div>
    `;

    const text = `
      Réinitialisation du mot de passe
      
      Bonjour ${name},
      
      Vous avez demandé une réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
      
      ${resetLink}
      
      IMPORTANT : Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe - TeamMove',
      html,
      text
    });
  }

  // Send custom email with organization branding
  async sendCustomEmail(
    to: string,
    subject: string,
    content: string,
    organization?: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    const organizationName = organization?.name || 'TeamMove';
    const organizerName = organization ? `${organization.contactFirstName} ${organization.contactLastName}` : 'TeamMove';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📧 ${organizationName}</h1>
        </div>
        <div style="padding: 30px;">
          <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; line-height: 1.6;">
            ${content.replace(/\n/g, '<br>')}
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Message envoyé par ${organizerName} via TeamMove
          </p>
        </div>
      </div>
    `;

    const text = `
      ${subject}
      
      ${content}
      
      ---
      Message envoyé par ${organizerName} via TeamMove
    `;

    return await this.sendEmail({
      to,
      subject,
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

  // Broadcast message to all participants
  async sendBroadcastMessage(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    messageContent: string,
    organizerName: string,
    eventId: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('❌ EmailService not configured for broadcast message');
      return false;
    }

    try {
      const replyUrl = `${this.appUrl}/events/${eventId}#reply`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Message de l'organisateur - ${eventName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .event-info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 Message de l'organisateur</h1>
              <p>Nouveau message concernant votre événement</p>
            </div>
            
            <div class="content">
              <p>Bonjour <strong>${participantName}</strong>,</p>
              
              <p>Vous avez reçu un nouveau message de <strong>${organizerName}</strong> concernant l'événement :</p>
              
              <div class="event-info">
                <h3>🏃 ${eventName}</h3>
                <p><strong>Organisation:</strong> ${organizationName}</p>
              </div>

              <div class="message-box">
                <h4>💬 Message :</h4>
                <p>${messageContent.replace(/\n/g, '<br>')}</p>
                <p><em>— ${organizerName}, ${organizationName}</em></p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${replyUrl}" class="cta-button">
                  ↩️ Répondre au message
                </a>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>💡 Comment répondre :</strong></p>
                <p>Cliquez sur le bouton "Répondre au message" ci-dessus pour accéder à l'interface de réponse. Votre réponse sera directement transmise à l'organisateur.</p>
              </div>

              <p>Si vous avez des questions, n'hésitez pas à contacter l'organisateur.</p>
              
              <p>Sportivement,<br><strong>L'équipe TeamMove</strong></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par ${organizationName} via TeamMove</p>
              <p>Pour plus d'informations : <a href="${this.appUrl}">${this.appUrl}</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Message de l'organisateur - ${eventName}

Bonjour ${participantName},

Vous avez reçu un nouveau message de ${organizerName} concernant l'événement "${eventName}" (${organizationName}).

Message :
${messageContent}

— ${organizerName}, ${organizationName}

Pour répondre à ce message, visitez : ${replyUrl}

Sportivement,
L'équipe TeamMove

${this.appUrl}
      `;

      const msg = {
        to: participantEmail,
        from: { email: this.fromEmail, name: this.fromName },
        replyTo: { email: this.fromEmail, name: organizationName },
        subject: `📢 Message de ${organizationName} - ${eventName}`,
        text: textContent.trim(),
        html: htmlContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        categories: ['broadcast_message', 'event_communication'],
      };

      await sgMail.send(msg);
      console.log(`✅ Broadcast message sent to ${participantEmail} for event ${eventName}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to send broadcast message to ${participantEmail}:`, error);
      return false;
    }
  }

  // Broadcast message with reply button for external replies
  async sendBroadcastMessageWithReplyButton(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    messageContent: string,
    organizerName: string,
    eventId: string,
    replyToken: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('❌ EmailService not configured for broadcast message');
      return false;
    }

    try {
      const replyUrl = `${this.appUrl}/reply-message?replyToken=${replyToken}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Message de l'organisateur - ${eventName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .event-info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; }
            .cta-button:hover { background: #218838; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .reply-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 Message de l'organisateur</h1>
              <p>Nouveau message concernant votre événement</p>
            </div>
            
            <div class="content">
              <p>Bonjour <strong>${participantName}</strong>,</p>
              
              <p>Vous avez reçu un nouveau message de <strong>${organizerName}</strong> concernant l'événement :</p>
              
              <div class="event-info">
                <h3>🏃 ${eventName}</h3>
                <p><strong>Organisation:</strong> ${organizationName}</p>
              </div>

              <div class="message-box">
                <h4>💬 Message :</h4>
                <p style="font-size: 16px; line-height: 1.5;">${messageContent.replace(/\n/g, '<br>')}</p>
                <p><em>— ${organizerName}, ${organizationName}</em></p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${replyUrl}" class="cta-button">
                  ↩️ Répondre au message
                </a>
              </div>

              <div class="reply-info">
                <p><strong>💡 Comment répondre :</strong></p>
                <p>Cliquez sur le bouton "Répondre au message" ci-dessus pour accéder à l'interface de réponse. Votre réponse sera directement transmise à l'organisateur dans sa messagerie.</p>
                <p><strong>Note :</strong> Ce lien de réponse est valide pendant 7 jours.</p>
              </div>

              <p>Si vous avez des questions urgentes, vous pouvez également contacter l'organisateur à l'adresse : <a href="mailto:${this.fromEmail}">${this.fromEmail}</a></p>
              
              <p>Sportivement,<br><strong>L'équipe TeamMove</strong></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par ${organizationName} via TeamMove</p>
              <p>Pour plus d'informations : <a href="${this.appUrl}">${this.appUrl}</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Message de l'organisateur - ${eventName}

Bonjour ${participantName},

Vous avez reçu un nouveau message de ${organizerName} concernant l'événement "${eventName}" (${organizationName}).

Message :
${messageContent}

— ${organizerName}, ${organizationName}

Pour répondre à ce message, cliquez sur ce lien : ${replyUrl}

Ce lien de réponse est valide pendant 7 jours.

Si vous avez des questions urgentes, contactez : ${this.fromEmail}

Sportivement,
L'équipe TeamMove

${this.appUrl}
      `;

      const msg = {
        to: participantEmail,
        from: { email: this.fromEmail, name: this.fromName },
        replyTo: { email: this.fromEmail, name: organizationName },
        subject: `📢 Message de ${organizationName} - ${eventName}`,
        text: textContent.trim(),
        html: htmlContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        categories: ['broadcast_message_with_reply', 'event_communication'],
      };

      await sgMail.send(msg);
      console.log(`✅ Broadcast message with reply button sent to ${participantEmail} for event ${eventName}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to send broadcast message with reply button to ${participantEmail}:`, error);
      return false;
    }
  }

  // Email de bienvenue pour nouveaux utilisateurs/organisateurs
  async sendWelcomeEmail(
    email: string,
    organizationName: string,
    contactFirstName: string,
    contactLastName: string,
    organizationType: 'club' | 'association' | 'company'
  ): Promise<boolean> {
    const organizationTypeLabel = {
      club: 'club sportif',
      association: 'association',
      company: 'entreprise'
    }[organizationType];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue sur TeamMove - ${organizationName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
            .header p { margin: 10px 0 0; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .welcome-section { text-align: center; margin-bottom: 40px; }
            .welcome-section h2 { color: #667eea; font-size: 28px; margin-bottom: 15px; }
            .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin: 30px 0; }
            .feature-card { background: #f8f9fa; padding: 25px; border-radius: 10px; text-align: center; border-left: 4px solid #667eea; }
            .feature-card .icon { font-size: 48px; margin-bottom: 15px; }
            .feature-card h3 { color: #333; margin: 15px 0 10px; font-size: 20px; }
            .feature-card p { color: #666; font-size: 14px; line-height: 1.5; }
            .cta-section { text-align: center; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; margin: 30px 0; }
            .cta-button { display: inline-block; background: white; color: #28a745; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; margin: 15px 0; transition: transform 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .tips-section { background: #e3f2fd; padding: 25px; border-radius: 10px; margin: 25px 0; }
            .tips-section h3 { color: #1976d2; margin-bottom: 20px; }
            .tip { display: flex; align-items: flex-start; margin-bottom: 15px; }
            .tip-number { background: #1976d2; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; font-size: 14px; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
            .social-links { margin: 20px 0; }
            .social-links a { color: #667eea; text-decoration: none; margin: 0 15px; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue sur TeamMove !</h1>
              <p>Votre plateforme de covoiturage sportif est prête</p>
            </div>
            
            <div class="content">
              <div class="welcome-section">
                <h2>Bonjour ${contactFirstName} ${contactLastName} !</h2>
                <p style="font-size: 18px; color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Félicitations ! Votre ${organizationTypeLabel} <strong>"${organizationName}"</strong> 
                  vient d'être inscrite sur TeamMove. Vous pouvez maintenant organiser et gérer 
                  le covoiturage pour tous vos événements sportifs en toute simplicité.
                </p>
              </div>

              <div class="feature-grid">
                <div class="feature-card">
                  <div class="icon">🗓️</div>
                  <h3>Créez vos événements</h3>
                  <p>Organisez facilement vos compétitions, entraînements et sorties sportives avec toutes les informations nécessaires.</p>
                </div>
                <div class="feature-card">
                  <div class="icon">🚗</div>
                  <h3>Gérez le covoiturage</h3>
                  <p>Optimisez les trajets en connectant conducteurs et passagers automatiquement selon leurs préférences.</p>
                </div>
                <div class="feature-card">
                  <div class="icon">📧</div>
                  <h3>Communiquez facilement</h3>
                  <p>Envoyez des invitations, des rappels et communiquez avec vos participants en un clic.</p>
                </div>
                <div class="feature-card">
                  <div class="icon">📊</div>
                  <h3>Suivez vos statistiques</h3>
                  <p>Analysez la participation, l'efficacité du covoiturage et optimisez vos événements.</p>
                </div>
              </div>

              <div class="cta-section">
                <h3 style="margin: 0 0 15px; font-size: 24px;">Prêt à commencer ?</h3>
                <p style="margin: 0 0 20px; font-size: 16px; opacity: 0.9;">
                  Connectez-vous à votre tableau de bord et créez votre premier événement
                </p>
                <a href="${this.appUrl}/dashboard" class="cta-button">
                  🚀 Accéder à mon tableau de bord
                </a>
              </div>

              <div class="tips-section">
                <h3>💡 Conseils pour bien commencer</h3>
                <div class="tip">
                  <div class="tip-number">1</div>
                  <div>
                    <strong>Complétez votre profil</strong><br>
                    Ajoutez le logo de votre organisation, vos sports pratiqués et vos informations de contact.
                  </div>
                </div>
                <div class="tip">
                  <div class="tip-number">2</div>
                  <div>
                    <strong>Créez votre premier événement</strong><br>
                    Testez la plateforme avec un petit événement pour vous familiariser avec toutes les fonctionnalités.
                  </div>
                </div>
                <div class="tip">
                  <div class="tip-number">3</div>
                  <div>
                    <strong>Invitez vos membres</strong><br>
                    Utilisez la fonction d'invitation automatique pour que vos participants rejoignent facilement vos événements.
                  </div>
                </div>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="color: #856404; margin: 0 0 10px;">🎁 Offre de lancement</h4>
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  Profitez de toutes les fonctionnalités avancées gratuitement pendant vos premiers événements. 
                  Découvrez tout le potentiel de TeamMove sans engagement !
                </p>
              </div>

              <p style="text-align: center; margin: 30px 0; color: #666;">
                Besoin d'aide ? Notre équipe est là pour vous accompagner :<br>
                📧 <a href="mailto:${this.fromEmail}" style="color: #667eea;">${this.fromEmail}</a> | 
                🌐 <a href="${this.appUrl}/support" style="color: #667eea;">Centre d'aide</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Bienvenue dans la communauté TeamMove !</strong></p>
              <p>Ensemble, rendons le sport plus accessible et plus convivial.</p>
              <div class="social-links">
                <a href="${this.appUrl}">🌐</a>
                <a href="mailto:${this.fromEmail}">📧</a>
              </div>
              <p style="font-size: 12px; color: #999;">
                TeamMove - Plateforme de covoiturage sportif<br>
                <a href="${this.appUrl}" style="color: #667eea;">${this.appUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
🎉 Bienvenue sur TeamMove !

Bonjour ${contactFirstName} ${contactLastName} !

Félicitations ! Votre ${organizationTypeLabel} "${organizationName}" vient d'être inscrite sur TeamMove.

Vous pouvez maintenant :
🗓️ Créer et gérer vos événements sportifs
🚗 Organiser le covoiturage automatiquement
📧 Communiquer facilement avec vos participants
📊 Suivre vos statistiques et optimiser vos événements

🚀 ACCÉDEZ À VOTRE TABLEAU DE BORD :
${this.appUrl}/dashboard

💡 CONSEILS POUR BIEN COMMENCER :
1. Complétez votre profil avec le logo et les informations de votre organisation
2. Créez votre premier événement pour tester la plateforme
3. Invitez vos membres à rejoindre vos événements

🎁 OFFRE DE LANCEMENT :
Profitez gratuitement de toutes les fonctionnalités avancées pour vos premiers événements !

Besoin d'aide ?
📧 ${this.fromEmail}
🌐 ${this.appUrl}/support

Bienvenue dans la communauté TeamMove !
L'équipe TeamMove
${this.appUrl}
    `;

    return await this.sendEmail({
      to: email,
      toName: `${contactFirstName} ${contactLastName}`,
      subject: `🎉 Bienvenue sur TeamMove - ${organizationName}`,
      html,
      text
    });
  }

  // Email de confirmation de création d'événement
  async sendEventCreationConfirmation(
    organizerEmail: string,
    organizerName: string,
    eventName: string,
    organizationName: string,
    eventDate: Date,
    eventId: string,
    meetingPoint?: string,
    destination?: string,
    sport?: string,
    description?: string
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

    const eventUrl = `${this.appUrl}/events/${eventId}/public`;
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Événement créé avec succès - ${eventName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .event-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #28a745; }
            .event-title { color: #28a745; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; }
            .event-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .detail-item { background: white; padding: 15px; border-radius: 8px; text-align: center; }
            .detail-item .icon { font-size: 24px; margin-bottom: 8px; }
            .detail-item .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-item .value { color: #333; font-size: 16px; margin-top: 5px; }
            .action-section { background: #e3f2fd; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center; }
            .cta-button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 10px; transition: transform 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .cta-button.primary { background: #28a745; }
            .cta-button.secondary { background: #6c757d; }
            .next-steps { background: #fff3cd; border: 1px solid #ffeaa7; padding: 25px; border-radius: 10px; margin: 25px 0; }
            .next-steps h3 { color: #856404; margin: 0 0 15px; }
            .step { display: flex; align-items: flex-start; margin-bottom: 15px; }
            .step-number { background: #ffc107; color: #333; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Événement créé avec succès !</h1>
              <p>Votre événement est maintenant en ligne et prêt à accueillir des participants</p>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; text-align: center; margin-bottom: 30px;">
                Bonjour <strong>${organizerName}</strong>,<br>
                Félicitations ! Votre événement a été créé avec succès sur TeamMove.
              </p>

              <div class="event-card">
                <div class="event-title">🏃 ${eventName}</div>
                <div class="event-details">
                  <div class="detail-item">
                    <div class="icon">🏢</div>
                    <div class="label">Organisation</div>
                    <div class="value">${organizationName}</div>
                  </div>
                  ${sport ? `
                  <div class="detail-item">
                    <div class="icon">⚽</div>
                    <div class="label">Sport</div>
                    <div class="value">${sport}</div>
                  </div>
                  ` : ''}
                  <div class="detail-item">
                    <div class="icon">📅</div>
                    <div class="label">Date</div>
                    <div class="value">${formattedDate}</div>
                  </div>
                  <div class="detail-item">
                    <div class="icon">🕒</div>
                    <div class="label">Heure</div>
                    <div class="value">${formattedTime}</div>
                  </div>
                  ${meetingPoint ? `
                  <div class="detail-item">
                    <div class="icon">📍</div>
                    <div class="label">Rendez-vous</div>
                    <div class="value">${meetingPoint}</div>
                  </div>
                  ` : ''}
                  ${destination ? `
                  <div class="detail-item">
                    <div class="icon">🎯</div>
                    <div class="label">Destination</div>
                    <div class="value">${destination}</div>
                  </div>
                  ` : ''}
                </div>
                ${description ? `
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
                  <div class="label">📝 DESCRIPTION</div>
                  <div style="margin-top: 10px; color: #333; line-height: 1.5;">${description.replace(/\n/g, '<br>')}</div>
                </div>
                ` : ''}
              </div>

              <div class="action-section">
                <h3 style="margin: 0 0 20px; color: #1976d2;">🚀 Actions rapides</h3>
                <a href="${eventUrl}" class="cta-button primary">
                  👀 Voir l'événement public
                </a>
                <a href="${dashboardUrl}" class="cta-button secondary">
                  📊 Gérer depuis le tableau de bord
                </a>
              </div>

              <div class="next-steps">
                <h3>📋 Prochaines étapes recommandées</h3>
                <div class="step">
                  <div class="step-number">1</div>
                  <div>
                    <strong>Partagez l'événement</strong><br>
                    Copiez le lien public de votre événement et partagez-le avec vos participants par email, SMS ou sur vos réseaux sociaux.
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div>
                    <strong>Invitez des participants</strong><br>
                    Utilisez la fonction d'invitation automatique depuis votre tableau de bord pour envoyer des emails personnalisés.
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div>
                    <strong>Surveillez les inscriptions</strong><br>
                    Suivez en temps réel qui s'inscrit comme conducteur ou passager depuis votre tableau de bord.
                  </div>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div>
                    <strong>Communiquez avec vos participants</strong><br>
                    Envoyez des messages, des rappels ou des mises à jour directement depuis la plateforme.
                  </div>
                </div>
              </div>

              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <h4 style="color: #155724; margin: 0 0 10px;">🔗 Lien de partage de votre événement</h4>
                <p style="margin: 10px 0; font-family: monospace; background: white; padding: 10px; border-radius: 4px; word-break: break-all;">
                  ${eventUrl}
                </p>
                <p style="color: #155724; margin: 0; font-size: 14px;">
                  Partagez ce lien pour que vos participants puissent s'inscrire facilement !
                </p>
              </div>

              <p style="text-align: center; margin: 30px 0; color: #666;">
                Besoin d'aide ? Notre équipe est disponible :<br>
                📧 <a href="mailto:${this.fromEmail}" style="color: #28a745;">${this.fromEmail}</a> | 
                🌐 <a href="${this.appUrl}/support" style="color: #28a745;">Centre d'aide</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Merci d'utiliser TeamMove !</strong></p>
              <p>Votre événement contribue à rendre le sport plus accessible et plus convivial.</p>
              <p style="font-size: 12px; color: #999; margin-top: 20px;">
                TeamMove - Plateforme de covoiturage sportif<br>
                <a href="${this.appUrl}" style="color: #28a745;">${this.appUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
✅ Événement créé avec succès !

Bonjour ${organizerName},

Félicitations ! Votre événement "${eventName}" a été créé avec succès sur TeamMove.

📝 DÉTAILS DE L'ÉVÉNEMENT :
• Organisation : ${organizationName}
${sport ? `• Sport : ${sport}` : ''}
• Date : ${formattedDate}
• Heure : ${formattedTime}
${meetingPoint ? `• Rendez-vous : ${meetingPoint}` : ''}
${destination ? `• Destination : ${destination}` : ''}
${description ? `• Description : ${description}` : ''}

🔗 LIEN DE PARTAGE :
${eventUrl}

🚀 ACTIONS RAPIDES :
• Voir l'événement public : ${eventUrl}
• Gérer depuis le tableau de bord : ${dashboardUrl}

📋 PROCHAINES ÉTAPES RECOMMANDÉES :
1. Partagez le lien de votre événement avec vos participants
2. Invitez des participants depuis votre tableau de bord
3. Surveillez les inscriptions en temps réel
4. Communiquez avec vos participants via la plateforme

Besoin d'aide ?
📧 ${this.fromEmail}
🌐 ${this.appUrl}/support

Merci d'utiliser TeamMove !
L'équipe TeamMove
${this.appUrl}
    `;

    return await this.sendEmail({
      to: organizerEmail,
      toName: organizerName,
      subject: `✅ Événement créé : ${eventName} - ${organizationName}`,
      html,
      text
    });
  }

  // Email pour l'organisateur lors d'une nouvelle inscription
  async sendParticipantRegistrationNotification(
    organizerEmail: string,
    organizerName: string,
    participantName: string,
    participantRole: 'driver' | 'passenger',
    eventName: string,
    organizationName: string,
    eventId: string,
    availableSeats?: number,
    participantComment?: string
  ): Promise<boolean> {
    const roleLabel = participantRole === 'driver' ? 'Conducteur' : 'Passager';
    const roleIcon = participantRole === 'driver' ? '🚗' : '👤';
    const eventUrl = `${this.appUrl}/events/${eventId}/public`;
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nouvelle inscription - ${eventName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #007bff 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .notification-card { background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #28a745; text-align: center; }
            .participant-info { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0; }
            .participant-info h3 { color: #007bff; margin: 0 0 15px; text-align: center; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
            .info-item { text-align: center; padding: 15px; background: white; border-radius: 8px; }
            .info-item .icon { font-size: 24px; margin-bottom: 8px; }
            .info-item .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
            .info-item .value { color: #333; font-size: 16px; margin-top: 5px; }
            .comment-section { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .comment-section h4 { color: #856404; margin: 0 0 10px; }
            .action-buttons { text-align: center; margin: 30px 0; }
            .cta-button { display: inline-block; background: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 10px; transition: transform 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .cta-button.primary { background: #28a745; }
            .stats-section { background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Nouvelle inscription !</h1>
              <p>Un participant vient de s'inscrire à votre événement</p>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; text-align: center; margin-bottom: 30px;">
                Bonjour <strong>${organizerName}</strong>,<br>
                Excellente nouvelle ! Une nouvelle personne vient de s'inscrire à votre événement.
              </p>

              <div class="notification-card">
                <div style="font-size: 48px; margin-bottom: 15px;">${roleIcon}</div>
                <h2 style="margin: 0; color: #28a745;">${participantName}</h2>
                <p style="margin: 10px 0; font-size: 18px;">s'est inscrit comme <strong>${roleLabel}</strong></p>
                <p style="margin: 0; color: #666;">pour l'événement "${eventName}"</p>
              </div>

              <div class="participant-info">
                <h3>${roleIcon} Informations sur la participation</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="icon">👤</div>
                    <div class="label">Participant</div>
                    <div class="value">${participantName}</div>
                  </div>
                  <div class="info-item">
                    <div class="icon">${roleIcon}</div>
                    <div class="label">Rôle</div>
                    <div class="value">${roleLabel}</div>
                  </div>
                  ${participantRole === 'driver' && availableSeats ? `
                  <div class="info-item">
                    <div class="icon">💺</div>
                    <div class="label">Places offertes</div>
                    <div class="value">${availableSeats} place${availableSeats > 1 ? 's' : ''}</div>
                  </div>
                  ` : ''}
                  <div class="info-item">
                    <div class="icon">🏃</div>
                    <div class="label">Événement</div>
                    <div class="value">${eventName}</div>
                  </div>
                </div>
                ${participantComment ? `
                <div class="comment-section">
                  <h4>💬 Commentaire du participant :</h4>
                  <p style="margin: 0; font-style: italic; color: #856404;">"${participantComment}"</p>
                </div>
                ` : ''}
              </div>

              <div class="stats-section">
                <h3 style="color: #1976d2; margin: 0 0 15px;">📊 Conseil de gestion</h3>
                <p style="margin: 0; color: #1976d2;">
                  ${participantRole === 'driver' 
                    ? `🚗 Excellent ! Plus vous avez de conducteurs, plus il sera facile d'organiser le covoiturage. N'hésitez pas à encourager d'autres membres à se proposer comme conducteurs.`
                    : `👤 Parfait ! Assurez-vous qu'il y a suffisamment de conducteurs pour accueillir tous les passagers. Vous pouvez inviter des membres qui ont une voiture à se proposer comme conducteurs.`
                  }
                </p>
              </div>

              <div class="action-buttons">
                <a href="${eventUrl}" class="cta-button primary">
                  👀 Voir tous les participants
                </a>
                <a href="${dashboardUrl}" class="cta-button">
                  📊 Tableau de bord
                </a>
              </div>

              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="color: #0c5460; margin: 0 0 10px;">💡 Astuce de gestion</h4>
                <p style="color: #0c5460; margin: 0; font-size: 14px;">
                  Vous pouvez envoyer un message personnalisé à tous vos participants depuis votre tableau de bord. 
                  C'est idéal pour donner des informations complémentaires ou des consignes de dernière minute !
                </p>
              </div>

              <p style="text-align: center; margin: 30px 0; color: #666;">
                Besoin d'aide pour gérer votre événement ?<br>
                📧 <a href="mailto:${this.fromEmail}" style="color: #007bff;">${this.fromEmail}</a> | 
                🌐 <a href="${this.appUrl}/support" style="color: #007bff;">Centre d'aide</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Merci d'utiliser TeamMove !</strong></p>
              <p>Votre événement rassemble la communauté sportive.</p>
              <p style="font-size: 12px; color: #999; margin-top: 20px;">
                TeamMove - Plateforme de covoiturage sportif<br>
                <a href="${this.appUrl}" style="color: #007bff;">${this.appUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
🎉 Nouvelle inscription à votre événement !

Bonjour ${organizerName},

Excellente nouvelle ! ${participantName} vient de s'inscrire comme ${roleLabel} à votre événement "${eventName}".

👤 INFORMATIONS SUR LA PARTICIPATION :
• Participant : ${participantName}
• Rôle : ${roleLabel}
${participantRole === 'driver' && availableSeats ? `• Places offertes : ${availableSeats} place${availableSeats > 1 ? 's' : ''}` : ''}
${participantComment ? `• Commentaire : "${participantComment}"` : ''}

🚀 ACTIONS :
• Voir tous les participants : ${eventUrl}
• Tableau de bord : ${dashboardUrl}

💡 CONSEIL :
${participantRole === 'driver' 
  ? `Excellent ! Plus vous avez de conducteurs, plus il sera facile d'organiser le covoiturage.`
  : `Assurez-vous qu'il y a suffisamment de conducteurs pour tous les passagers.`
}

Vous pouvez envoyer un message à tous vos participants depuis votre tableau de bord.

Besoin d'aide ?
📧 ${this.fromEmail}
🌐 ${this.appUrl}/support

Merci d'utiliser TeamMove !
L'équipe TeamMove
${this.appUrl}
    `;

    return await this.sendEmail({
      to: organizerEmail,
      toName: organizerName,
      subject: `🎉 Nouvelle inscription : ${participantName} - ${eventName}`,
      html,
      text
    });
  }


  // Email de confirmation d'abonnement Stripe
  async sendSubscriptionConfirmationEmail(organizationId: string, planId: string): Promise<boolean> {
    console.log('📧 Sending subscription confirmation email');

    try {
      // Importer dynamiquement pour éviter les imports circulaires
      const { getOrganizationById } = await import('./storage.js');
      const { SUBSCRIPTION_PLANS } = await import('./subscription-config.js');

      const organization = await getOrganizationById(organizationId);
      if (!organization) {
        console.error('❌ Organization not found for subscription confirmation');
        return false;
      }

      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        console.error('❌ Plan not found for subscription confirmation');
        return false;
      }

      const dashboardUrl = `${this.appUrl}/dashboard`;
      const supportUrl = `${this.appUrl}/support`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abonnement Confirmé - TeamMove</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">🎉 Abonnement Confirmé !</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Bienvenue dans ${plan.name} chez TeamMove</p>
  </div>

  <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Bonjour ${organization.contactFirstName || organization.name} !</h2>
    <p>Félicitations ! Votre abonnement <strong>${plan.name}</strong> a été activé avec succès.</p>
  </div>

  <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #495057; margin-top: 0;">📋 Récapitulatif de votre abonnement</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Formule :</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${plan.name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Prix :</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(plan.price / 100).toFixed(2)}€</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Facturation :</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
          ${plan.billingInterval === 'monthly' ? 'Mensuelle' : 
            plan.billingInterval === 'annual' ? 'Annuelle' : 
            plan.billingInterval === 'pack_single' ? 'Paiement unique' : 
            'Pack de 10 événements'}
        </td>
      </tr>
    </table>
  </div>

  <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #155724; margin-top: 0;">✨ Vos avantages</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">🚀 Accéder à mon tableau de bord</a>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 30px;">
    <h4 style="margin-top: 0; color: #495057;">Besoin d'aide ?</h4>
    <p style="margin-bottom: 0;">Notre équipe support est là pour vous accompagner :</p>
    <p style="margin: 5px 0 0 0;">
      📧 <a href="mailto:${this.fromEmail}" style="color: #007bff;">${this.fromEmail}</a><br>
      🌐 <a href="${supportUrl}" style="color: #007bff;">Centre d'aide</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 14px;">
    <p>Merci de faire confiance à TeamMove !</p>
    <p><a href="${this.appUrl}" style="color: #007bff;">TeamMove</a> - Simplifiez vos événements sportifs</p>
  </div>
</body>
</html>
      `;

      const text = `
🎉 Abonnement Confirmé !

Bonjour ${organization.contactFirstName || organization.name} !

Félicitations ! Votre abonnement ${plan.name} a été activé avec succès.

📋 RÉCAPITULATIF :
• Formule : ${plan.name}
• Prix : ${(plan.price / 100).toFixed(2)}€
• Facturation : ${plan.billingInterval === 'monthly' ? 'Mensuelle' : 
    plan.billingInterval === 'annual' ? 'Annuelle' : 
    plan.billingInterval === 'pack_single' ? 'Paiement unique' : 
    'Pack de 10 événements'}

✨ VOS AVANTAGES :
${plan.features.map(feature => `• ${feature}`).join('\n')}

🚀 PROCHAINES ÉTAPES :
• Accédez à votre tableau de bord : ${dashboardUrl}
• Commencez à créer vos événements
• Profitez de toutes les fonctionnalités

Besoin d'aide ?
📧 ${this.fromEmail}
🌐 ${supportUrl}

Merci de faire confiance à TeamMove !
L'équipe TeamMove
${this.appUrl}
      `;

      return await this.sendEmail({
        to: organization.email,
        toName: organization.name,
        subject: `🎉 Abonnement ${plan.name} confirmé - Bienvenue !`,
        html,
        text
      });
    } catch (error) {
      console.error('❌ Error sending subscription confirmation email:', error);
      return false;
    }
  }

  // Email d'échec de paiement
  async sendPaymentFailedEmail(organizationId: string): Promise<boolean> {
    console.log('📧 Sending payment failed email');

    try {
      const { getOrganizationById } = await import('./storage.js');

      const organization = await getOrganizationById(organizationId);
      if (!organization) {
        console.error('❌ Organization not found for payment failed email');
        return false;
      }

      const dashboardUrl = `${this.appUrl}/dashboard`;
      const supportUrl = `${this.appUrl}/support`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Problème de Paiement - TeamMove</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">⚠️ Problème de Paiement</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Action requise pour votre abonnement</p>
  </div>

  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h2 style="color: #856404; margin-top: 0;">Bonjour ${organization.contactFirstName || organization.name},</h2>
    <p style="color: #856404;">Nous n'avons pas pu traiter le paiement de votre abonnement TeamMove.</p>
  </div>

  <div style="background: white; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #495057; margin-top: 0;">🔧 Que faire maintenant ?</h3>
    <ol style="color: #495057;">
      <li><strong>Vérifiez vos informations de paiement</strong> dans votre tableau de bord</li>
      <li><strong>Assurez-vous</strong> que votre carte bancaire n'est pas expirée</li>
      <li><strong>Contactez votre banque</strong> si nécessaire</li>
      <li><strong>Renouvelez le paiement</strong> depuis votre tableau de bord</li>
    </ol>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">🔧 Mettre à jour mes informations</a>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 6px;">
    <h4 style="margin-top: 0; color: #495057;">Besoin d'aide ?</h4>
    <p style="margin-bottom: 0;">Notre équipe support est là pour vous aider :</p>
    <p style="margin: 5px 0 0 0;">
      📧 <a href="mailto:${this.fromEmail}" style="color: #007bff;">${this.fromEmail}</a><br>
      🌐 <a href="${supportUrl}" style="color: #007bff;">Contacter le support</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 14px;">
    <p><a href="${this.appUrl}" style="color: #007bff;">TeamMove</a> - Simplifiez vos événements sportifs</p>
  </div>
</body>
</html>
      `;

      const text = `
⚠️ Problème de Paiement

Bonjour ${organization.contactFirstName || organization.name},

Nous n'avons pas pu traiter le paiement de votre abonnement TeamMove.

🔧 QUE FAIRE MAINTENANT ?
1. Vérifiez vos informations de paiement dans votre tableau de bord
2. Assurez-vous que votre carte bancaire n'est pas expirée
3. Contactez votre banque si nécessaire
4. Renouvelez le paiement depuis votre tableau de bord

🔧 Mettre à jour mes informations : ${dashboardUrl}

Besoin d'aide ?
📧 ${this.fromEmail}
🌐 ${supportUrl}

L'équipe TeamMove
${this.appUrl}
      `;

      return await this.sendEmail({
        to: organization.email,
        toName: organization.name,
        subject: '⚠️ Problème de paiement - Action requise',
        html,
        text
      });
    } catch (error) {
      console.error('❌ Error sending payment failed email:', error);
      return false;
    }
  }

  // Email d'annulation d'abonnement
  async sendSubscriptionCancelledEmail(organizationId: string): Promise<boolean> {
    console.log('📧 Sending subscription cancelled email');

    try {
      const { getOrganizationById } = await import('./storage.js');

      const organization = await getOrganizationById(organizationId);
      if (!organization) {
        console.error('❌ Organization not found for cancellation email');
        return false;
      }

      const dashboardUrl = `${this.appUrl}/dashboard`;
      const subscriptionUrl = `${this.appUrl}/subscription`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abonnement Annulé - TeamMove</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">📋 Abonnement Annulé</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Nous sommes désolés de vous voir partir</p>
  </div>

  <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Bonjour ${organization.contactFirstName || organization.name},</h2>
    <p>Votre abonnement TeamMove a été annulé comme demandé.</p>
    <p>Vous avez maintenant accès à l'<strong>offre Découverte</strong> qui vous permet de créer 1 événement avec jusqu'à 20 invitations.</p>
  </div>

  <div style="background: #e8f4fd; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #004085; margin-top: 0;">💡 L'offre Découverte inclut :</h3>
    <ul style="margin: 0; padding-left: 20px; color: #004085;">
      <li>1 événement maximum</li>
      <li>Jusqu'à 20 invitations</li>
      <li>Gestion du covoiturage</li>
      <li>Support par email</li>
    </ul>
  </div>

  <div style="background: white; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #495057; margin-top: 0;">🔄 Envie de revenir ?</h3>
    <p>Vous pouvez à tout moment souscrire à nouveau à une formule payante pour retrouver tous les avantages de TeamMove.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${subscriptionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">🔄 Voir nos formules</a>
    <a href="${dashboardUrl}" style="background: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">📊 Mon tableau de bord</a>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 6px;">
    <h4 style="margin-top: 0; color: #495057;">Vos retours nous intéressent</h4>
    <p style="margin-bottom: 0;">N'hésitez pas à nous faire part de vos commentaires pour nous aider à améliorer TeamMove :</p>
    <p style="margin: 5px 0 0 0;">
      📧 <a href="mailto:${this.fromEmail}" style="color: #007bff;">${this.fromEmail}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 14px;">
    <p>Merci d'avoir utilisé TeamMove !</p>
    <p><a href="${this.appUrl}" style="color: #007bff;">TeamMove</a> - Simplifiez vos événements sportifs</p>
  </div>
</body>
</html>
      `;

      const text = `
📋 Abonnement Annulé

Bonjour ${organization.contactFirstName || organization.name},

Votre abonnement TeamMove a été annulé comme demandé.

Vous avez maintenant accès à l'offre Découverte qui vous permet de créer 1 événement avec jusqu'à 20 invitations.

💡 L'OFFRE DÉCOUVERTE INCLUT :
• 1 événement maximum
• Jusqu'à 20 invitations  
• Gestion du covoiturage
• Support par email

🔄 ENVIE DE REVENIR ?
Vous pouvez à tout moment souscrire à nouveau à une formule payante pour retrouver tous les avantages de TeamMove.

🔄 Voir nos formules : ${subscriptionUrl}
📊 Mon tableau de bord : ${dashboardUrl}

VOS RETOURS NOUS INTÉRESSENT :
📧 ${this.fromEmail}

Merci d'avoir utilisé TeamMove !
L'équipe TeamMove
${this.appUrl}
      `;

      return await this.sendEmail({
        to: organization.email,
        toName: organization.name,
        subject: '📋 Confirmation d\'annulation de votre abonnement',
        html,
        text
      });
    } catch (error) {
      console.error('❌ Error sending cancellation email:', error);
      return false;
    }
  }

}

// Fonctions exportées pour utilisation directe
export async function sendSubscriptionConfirmationEmail(organizationId: string, planId: string): Promise<boolean> {
  return await emailServiceEnhanced.sendSubscriptionConfirmationEmail(organizationId, planId);
}

export async function sendPaymentFailedEmail(organizationId: string): Promise<boolean> {
  return await emailServiceEnhanced.sendPaymentFailedEmail(organizationId);
}

export async function sendSubscriptionCancelledEmail(organizationId: string): Promise<boolean> {
  return await emailServiceEnhanced.sendSubscriptionCancelledEmail(organizationId);
}

// Email de suppression de compte
export async function sendAccountDeletionEmail(userEmail: string, userName: string): Promise<boolean> {
  console.log('📧 Sending account deletion confirmation email');

  const appUrl = process.env.APP_URL || 'https://teammove.fr';
  const supportEmail = process.env.SENDGRID_FROM_EMAIL || 'support@teammove.fr';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compte Supprimé - TeamMove</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">👋 Au Revoir</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Votre compte a été supprimé</p>
  </div>

  <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Bonjour ${userName},</h2>
    <p>Votre compte TeamMove a été définitivement supprimé comme demandé.</p>
    <p><strong>Cette action est irréversible.</strong> Toutes vos données ont été supprimées de nos serveurs.</p>
  </div>

  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #856404; margin-top: 0;">🗑️ Données supprimées :</h3>
    <ul style="color: #856404; margin: 0; padding-left: 20px;">
      <li>Informations du compte et organisation</li>
      <li>Tous les événements créés</li>
      <li>Historique des participants</li>
      <li>Messages et communications</li>
      <li>Données de facturation (si applicable)</li>
    </ul>
  </div>

  <div style="background: #e8f4fd; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 25px;">
    <h3 style="color: #004085; margin-top: 0;">🔄 Vous nous manquerez !</h3>
    <p style="color: #004085; margin-bottom: 0;">Si vous changez d'avis, vous pouvez créer un nouveau compte à tout moment sur <a href="${appUrl}" style="color: #007bff;">${appUrl}</a></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 6px;">
    <h4 style="margin-top: 0; color: #495057;">Vos retours nous intéressent</h4>
    <p style="margin-bottom: 0;">N'hésitez pas à nous faire part de vos commentaires pour nous aider à améliorer TeamMove :</p>
    <p style="margin: 5px 0 0 0;">
      📧 <a href="mailto:${supportEmail}" style="color: #007bff;">${supportEmail}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 14px;">
    <p>Merci d'avoir utilisé TeamMove !</p>
    <p><a href="${appUrl}" style="color: #007bff;">TeamMove</a> - Simplifiez vos événements sportifs</p>
  </div>
</body>
</html>
  `;

  const text = `
👋 Au Revoir

Bonjour ${userName},

Votre compte TeamMove a été définitivement supprimé comme demandé.

Cette action est irréversible. Toutes vos données ont été supprimées de nos serveurs.

🗑️ DONNÉES SUPPRIMÉES :
• Informations du compte et organisation
• Tous les événements créés
• Historique des participants
• Messages et communications
• Données de facturation (si applicable)

🔄 VOUS NOUS MANQUEREZ !
Si vous changez d'avis, vous pouvez créer un nouveau compte à tout moment sur ${appUrl}

VOS RETOURS NOUS INTÉRESSENT :
📧 ${supportEmail}

Merci d'avoir utilisé TeamMove !
L'équipe TeamMove
${appUrl}
  `;

  return await emailServiceEnhanced.sendEmail({
    to: userEmail,
    toName: userName,
    subject: '👋 Confirmation de suppression de votre compte TeamMove',
    html,
    text
  });
}

export const emailServiceEnhanced = new EmailServiceEnhanced();
export { EmailServiceEnhanced };