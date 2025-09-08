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
      replyTo: `${this.fromEmail}+${replyToken}@reply.sportpool.com`
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
      subject: 'Réinitialisation de votre mot de passe - SportPool',
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

    const organizationName = organization?.name || 'SportPool';
    const organizerName = organization ? `${organization.contactFirstName} ${organization.contactLastName}` : 'SportPool';

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
            Message envoyé par ${organizerName} via SportPool
          </p>
        </div>
      </div>
    `;

    const text = `
      ${subject}
      
      ${content}
      
      ---
      Message envoyé par ${organizerName} via SportPool
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
              
              <p>Sportivement,<br><strong>L'équipe SportPool</strong></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé par ${organizationName} via SportPool</p>
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
L'équipe SportPool

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

  // Send custom email (for contact form, etc.)
  async sendCustomEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('❌ EmailService not configured for custom email');
      return false;
    }

    try {
      const msg = {
        to,
        from: { email: this.fromEmail, name: this.fromName },
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
      };

      await sgMail.send(msg);
      console.log(`✅ Custom email sent to ${to}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to send custom email to ${to}:`, error);
      return false;
    }
  }
}

export const emailServiceEnhanced = new EmailServiceEnhanced();
export { EmailServiceEnhanced };