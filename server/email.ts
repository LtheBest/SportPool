import sgMail from '@sendgrid/mail';

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  fromEmail?: string;
  fromName?: string;
}

class EmailService {
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@covoitsports.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'CovoitSports';
    this.appUrl = process.env.APP_URL || 'https://sportpool.onrender.com';
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    try {
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

      await sgMail.send(msg);
      console.log('Email sent successfully to:', data.to);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Template pour reset de mot de passe
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
          <h1 style="color: #333; margin-bottom: 30px;">Réinitialisation de votre mot de passe</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            Bonjour ${name},<br><br>
            Vous avez demandé la réinitialisation de votre mot de passe. 
            Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-bottom: 20px;">
            Réinitialiser le mot de passe
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            ${resetUrl}
          </p>
        </div>
      </div>
    `;

    const text = `
      Réinitialisation de votre mot de passe
      
      Bonjour ${name},
      
      Vous avez demandé la réinitialisation de votre mot de passe.
      Cliquez sur ce lien pour créer un nouveau mot de passe :
      
      ${resetUrl}
      
      Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    `;

    return await this.sendEmail({
      to: email,
      toName: name,
      subject: 'Réinitialisation de votre mot de passe',
      html,
      text
    });
  }

  // Template pour invitation à un événement
  async sendEventInvitationEmail(
    email: string, 
    eventName: string, 
    organizationName: string, 
    eventDate: Date, 
    invitationToken: string,
    meetingPoint?: string,
    destination?: string,
    sport?: string,
    duration?: string
  ): Promise<boolean> {
    const invitationUrl = `${this.appUrl}/invitation/${invitationToken}`;
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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">
            🎯 Invitation à un événement
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
              Vous êtes invité(e) à participer à cet événement. Cliquez sur le bouton ci-dessous pour voir tous les détails et confirmer votre participation.
            </p>
            <div style="text-align: center;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Voir l'événement et participer
              </a>
            </div>
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">
            Si le bouton ne fonctionne pas, copiez ce lien :<br>
            <a href="${invitationUrl}" style="color: #007bff;">${invitationUrl}</a>
          </p>
        </div>
      </div>
    `;

    const text = `
      Invitation à un événement
      
      Événement : ${eventName}
      Organisé par : ${organizationName}
      ${sport ? `Sport : ${sport}` : ''}
      Date : ${formattedDate}
      Heure : ${formattedTime}
      ${duration ? `Durée : ${duration}` : ''}
      ${meetingPoint ? `RDV : ${meetingPoint}` : ''}
      ${destination ? `Destination : ${destination}` : ''}
      
      Vous êtes invité(e) à participer à cet événement.
      Cliquez sur ce lien pour voir tous les détails et confirmer votre participation :
      
      ${invitationUrl}
    `;

    return await this.sendEmail({
      to: email,
      subject: `Invitation à l'événement: ${eventName}`,
      html,
      text
    });
  }

  // Template pour notification de nouveau message
  async sendMessageNotificationEmail(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    senderName: string,
    messageContent: string,
    eventId: string,
    messageId: string
  ): Promise<boolean> {
    const replyUrl = `${this.appUrl}/reply/${eventId}/${messageId}`;
    const eventUrl = `${this.appUrl}/events/${eventId}`;

    // Truncate message if too long
    const truncatedMessage = messageContent.length > 200 
      ? messageContent.substring(0, 200) + '...' 
      : messageContent;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">
            💬 Nouveau message de ${organizationName}
          </h1>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin-bottom: 15px;">${eventName}</h2>
            <p style="color: #666; margin-bottom: 10px;">
              <strong>Message de :</strong> ${senderName}
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <p style="color: #333; margin: 0; font-style: italic;">
                "${truncatedMessage}"
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${replyUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                Répondre au message
              </a>
              <a href="${eventUrl}" style="display: inline-block; background-color: #6c757d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Voir l'événement
              </a>
            </div>
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">
            Bonjour ${participantName}, vous recevez cet email car vous participez à l'événement "${eventName}".
          </p>
        </div>
      </div>
    `;

    const text = `
      Nouveau message de ${organizationName}
      
      Événement : ${eventName}
      Message de : ${senderName}
      
      "${truncatedMessage}"
      
      Répondre au message : ${replyUrl}
      Voir l'événement : ${eventUrl}
      
      Bonjour ${participantName}, vous recevez cet email car vous participez à l'événement "${eventName}".
    `;

    return await this.sendEmail({
      to: participantEmail,
      toName: participantName,
      subject: `${eventName} - Nouveau message de ${organizationName}`,
      html,
      text
    });
  }

  // Envoi d'invitation automatique avec liens personnalisés
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

  // Envoi groupé d'invitations
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
    const results = {
      success: 0,
      failed: [] as string[]
    };

    for (const email of emails) {
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
        console.error(`Failed to send invitation to ${email}:`, error);
        results.failed.push(email);
      }
    }

    return results;
  }

  // Envoi de rappel avant événement
  async sendEventReminderEmail(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    eventDate: Date,
    meetingPoint: string,
    destination: string,
    eventLink: string,
    hoursBeforeEvent: number = 24
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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">
            ⏰ Rappel - Événement dans ${hoursBeforeEvent}h !
          </h1>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin-bottom: 15px;">${eventName}</h2>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0; font-weight: bold;">
                📅 C'est demain ! N'oubliez pas votre participation à cet événement.
              </p>
            </div>
            <div style="margin-bottom: 20px;">
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Organisé par :</strong> ${organizationName}
              </p>
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Date :</strong> ${formattedDate}
              </p>
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Heure :</strong> ${formattedTime}
              </p>
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>RDV :</strong> ${meetingPoint}
              </p>
              <p style="color: #666; font-size: 16px; margin-bottom: 8px;">
                <strong>Destination :</strong> ${destination}
              </p>
            </div>
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${eventLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Voir les détails de l'événement
              </a>
            </div>
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px;">
              <p style="color: #0c5460; margin: 0; font-size: 14px;">
                💡 <strong>Rappel :</strong> Pensez à vérifier les dernières informations sur la page de l'événement, 
                notamment les éventuels changements de dernière minute concernant le covoiturage.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
      Rappel - Événement dans ${hoursBeforeEvent}h !
      
      Événement : ${eventName}
      Organisé par : ${organizationName}
      Date : ${formattedDate}
      Heure : ${formattedTime}
      RDV : ${meetingPoint}
      Destination : ${destination}
      
      C'est demain ! N'oubliez pas votre participation à cet événement.
      
      Voir les détails : ${eventLink}
      
      Pensez à vérifier les dernières informations sur la page de l'événement.
    `;

    return await this.sendEmail({
      to: participantEmail,
      toName: participantName,
      subject: `🔔 Rappel: ${eventName} - Demain !`,
      html,
      text
    });
  }

  // Génération d'un fichier iCalendar pour l'événement
  generateICalendar(
    eventName: string,
    eventDate: Date,
    duration: string,
    meetingPoint: string,
    destination: string,
    description: string,
    organizationName: string
  ): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatDate(eventDate);
    // Estimate end date (default 2 hours if no duration specified)
    const durationHours = duration?.includes('h') ? parseInt(duration) || 2 : 2;
    const endDate = formatDate(new Date(eventDate.getTime() + durationHours * 60 * 60 * 1000));
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CovoitSport//FR
BEGIN:VEVENT
UID:${Date.now()}@covoitsport.fr
DTSTAMP:${formatDate(new Date())}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${eventName}
DESCRIPTION:Événement organisé par ${organizationName}\\n\\nRDV: ${meetingPoint}\\nDestination: ${destination}\\n\\n${description}
LOCATION:${meetingPoint}
ORGANIZER:CN=${organizationName}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
  }

  // Envoyer une notification de nouveau message aux participants
  async sendMessageNotificationEmail(
    participantEmail: string,
    participantName: string,
    eventName: string,
    organizationName: string,
    senderName: string,
    messageContent: string,
    eventId: string,
    messageId: string
  ): Promise<boolean> {
    try {
      const eventLink = `${this.appUrl}/events/${eventId}`;
      const replyLink = `${this.appUrl}/events/${eventId}/message/${messageId}/reply`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nouveau message - ${eventName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .btn:hover { background: #5a67d8; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .sport-icon { font-size: 2em; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="sport-icon">📧</div>
              <h1>Nouveau message</h1>
              <p>Vous avez reçu un message concernant l'événement</p>
            </div>
            
            <div class="content">
              <h2>🏆 ${eventName}</h2>
              <p><strong>Organisateur:</strong> ${organizationName}</p>
              <p><strong>De:</strong> ${senderName}</p>
              
              <div class="message-box">
                <h3>💬 Message:</h3>
                <p>${messageContent.replace(/\n/g, '<br>')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${eventLink}" class="btn">👀 Voir l'événement</a>
                <a href="${replyLink}" class="btn">✉️ Répondre</a>
              </div>
              
              
              <div class="footer">
                <p>🚗 <strong>CovoitSport</strong> - Plateforme de covoiturage sportif</p>
                <p>Pour vous désabonner de ces notifications, <a href="${eventLink}/unsubscribe?email=${encodeURIComponent(participantEmail)}">cliquez ici</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
      Nouveau message - ${eventName}
      ========================================
      
      Bonjour ${participantName},
      
      Vous avez reçu un nouveau message concernant l'événement "${eventName}" organisé par ${organizationName}.
      
      De: ${senderName}
      
      Message:
      ${messageContent}
      
      Consultez l'événement complet et répondez en ligne :
      ${eventLink}
      
      ---
      CovoitSport - Plateforme de covoiturage sportif
      `;

      const success = await this.sendEmail({
        to: participantEmail,
        subject: `📧 Nouveau message: ${eventName} - ${organizationName}`,
        html,
        text
      });

      if (success) {
        console.log(`✅ Message notification sent to ${participantEmail}`);
      } else {
        console.error(`❌ Failed to send message notification to ${participantEmail}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Error sending message notification to ${participantEmail}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();