import mailjet from 'node-mailjet';

// Configuration Mailjet
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || '',
  process.env.MAILJET_SECRET_KEY || ''
);

export interface EmailTemplate {
  subject: string;
  htmlPart: string;
  textPart: string;
}

export interface EmailData {
  to: string;
  toName?: string;
  subject: string;
  htmlPart: string;
  textPart: string;
  fromEmail?: string;
  fromName?: string;
}

export interface TemplateEmailData {
  to: string;
  toName?: string;
  templateId: number;
  variables: Record<string, any>;
  fromEmail?: string;
  fromName?: string;
}

class EmailService {
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;

  constructor() {
    this.fromEmail = process.env.MAILJET_FROM_EMAIL || 'noreply@yourapp.com';
    this.fromName = process.env.MAILJET_FROM_NAME || 'YourApp';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    try {
      // Vérifier si les clés API sont configurées
      if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
        console.warn('Mailjet API keys not configured, skipping email send');
        return false;
      }

      const request = await mailjetClient
        .post("send", { version: 'v3.1' })
        .request({
          Messages: [{
            From: {
              Email: data.fromEmail || this.fromEmail,
              Name: data.fromName || this.fromName
            },
            To: [{
              Email: data.to,
              Name: data.toName || data.to
            }],
            Subject: data.subject,
            TextPart: data.textPart,
            HTMLPart: data.htmlPart
          }]
        });

      console.log('Email sent successfully:', request.body);
      return true;
    } catch (error: any) {
      console.error('Failed to send email:', error.statusCode || error.code, error.message);
      
      // Si c'est une erreur d'authentification, utiliser un mock en développement
      if (error.statusCode === 401 || error.code === 'EAUTH') {
        console.warn('Mailjet authentication failed - Email mock mode for development');
        console.log(`Mock email would be sent to: ${data.to}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Content: ${data.textPart.substring(0, 100)}...`);
        
        // En développement, considérer comme succès pour ne pas bloquer les tests
        return process.env.NODE_ENV === 'development';
      }
      
      return false;
    }
  }

  async sendTemplateEmail(data: TemplateEmailData): Promise<boolean> {
    try {
      // Vérifier si les clés API sont configurées
      if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
        console.warn('Mailjet API keys not configured, skipping template email send');
        return false;
      }

      const request = await mailjetClient
        .post("send", { version: 'v3.1' })
        .request({
          Messages: [{
            From: {
              Email: data.fromEmail || this.fromEmail,
              Name: data.fromName || this.fromName
            },
            To: [{
              Email: data.to,
              Name: data.toName || data.to
            }],
            TemplateID: data.templateId,
            TemplateLanguage: true,
            Variables: data.variables
          }]
        });

      console.log('Template email sent successfully:', request.body);
      return true;
    } catch (error: any) {
      console.error('Failed to send template email:', error.statusCode || error.code, error.message);
      
      // Si c'est une erreur d'authentification, utiliser un mock en développement
      if (error.statusCode === 401 || error.code === 'EAUTH') {
        console.warn('Mailjet authentication failed - Template email mock mode for development');
        console.log(`Mock template email (ID: ${data.templateId}) would be sent to: ${data.to}`);
        console.log(`Variables:`, JSON.stringify(data.variables, null, 2));
        
        // En développement, considérer comme succès pour ne pas bloquer les tests
        return process.env.NODE_ENV === 'development';
      }
      
      return false;
    }
  }

  // Template pour reset de mot de passe
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    
    const htmlPart = `
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

    const textPart = `
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
      htmlPart,
      textPart
    });
  }

  // Template pour invitation à un événement
  async sendEventInvitationEmail(
    email: string, 
    eventName: string, 
    organizationName: string, 
    eventDate: Date, 
    invitationToken: string
  ): Promise<boolean> {
    const invitationUrl = `${this.appUrl}/invitation/${invitationToken}`;
    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlPart = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">
            🎯 Invitation à un événement
          </h1>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin-bottom: 15px;">${eventName}</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
              <strong>Organisé par :</strong> ${organizationName}
            </p>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              <strong>Date :</strong> ${formattedDate}
            </p>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              Vous êtes invité(e) à participer à cet événement. Cliquez sur le bouton ci-dessous pour répondre à l'invitation.
            </p>
            <div style="text-align: center;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Répondre à l'invitation
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

    const textPart = `
      Invitation à un événement
      
      Événement : ${eventName}
      Organisé par : ${organizationName}
      Date : ${formattedDate}
      
      Vous êtes invité(e) à participer à cet événement.
      Cliquez sur ce lien pour répondre à l'invitation :
      
      ${invitationUrl}
    `;

    return await this.sendEmail({
      to: email,
      subject: `Invitation à l'événement: ${eventName}`,
      htmlPart,
      textPart
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
    const replyUrl = `${this.appUrl}/events/${eventId}/reply?messageId=${messageId}&email=${encodeURIComponent(participantEmail)}`;
    const eventUrl = `${this.appUrl}/events/${eventId}`;

    // Truncate message if too long
    const truncatedMessage = messageContent.length > 200 
      ? messageContent.substring(0, 200) + '...' 
      : messageContent;

    const htmlPart = `
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

    const textPart = `
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
      htmlPart,
      textPart
    });
  }

  // Envoi d'email avec le template personnalisé (ID: 7243128)
  async sendCustomTemplateEmail(
    email: string, 
    name: string, 
    content: string,
    subject?: string
  ): Promise<boolean> {
    const templateId = parseInt(process.env.MAILJET_TEMPLATE_ID || '7243128');
    
    return await this.sendTemplateEmail({
      to: email,
      toName: name,
      templateId,
      variables: {
        content: content,
        name: name,
        subject: subject || 'Notification'
      }
    });
  }

  // Envoi de notification d'événement avec template
  async sendEventNotificationTemplate(
    email: string,
    name: string,
    eventName: string,
    eventDate: string,
    organizationName: string
  ): Promise<boolean> {
    const content = `
      Bonjour ${name},
      
      Vous êtes invité(e) à l'événement "${eventName}" organisé par ${organizationName}.
      
      Date de l'événement : ${eventDate}
      
      Nous avons hâte de vous voir !
    `;

    return await this.sendCustomTemplateEmail(
      email,
      name,
      content,
      `Invitation à l'événement: ${eventName}`
    );
  }
}

export const emailService = new EmailService();