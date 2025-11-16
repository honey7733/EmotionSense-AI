/**
 * Enhanced Email Templates for EmotionSense AI
 */

import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter = null;

// Color scheme based on risk level
const getRiskColors = (riskLevel) => {
  const colors = {
    high: { primary: '#DC2626', bg: '#FEE2E2', emoji: '🔴' },
    medium: { primary: '#F59E0B', bg: '#FEF3C7', emoji: '🟡' },
    low: { primary: '#10B981', bg: '#D1FAE5', emoji: '🟢' }
  };
  return colors[riskLevel] || colors.medium;
};

// Generate enhanced HTML email
export const generateEmergencyAlertHTML = (user, contact, emotion, messageText, riskLevel = 'medium') => {
  const colors = getRiskColors(riskLevel);
  const truncatedMessage = messageText && messageText.length > 500 
    ? messageText.substring(0, 500) + '...' 
    : messageText || 'N/A';
  
  const timestamp = new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short' 
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6; line-height: 1.1;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Risk Level Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%); padding: 30px 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">${colors.emoji}</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">Emergency Alert</h1>
              <p style="margin: 8px 0 0 0; color: #FFFFFF; font-size: 14px; opacity: 0.95; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${riskLevel} Risk Level</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #111827;">Dear <strong>${contact?.contact_name || 'Contact'}</strong>,</p>
              <p style="margin: 16px 0 0 0; font-size: 15px; color: #4B5563;">You've been designated as an emergency contact for <strong>${user?.full_name || 'a user'}</strong>. We're reaching out regarding a concerning situation that requires attention.</p>
            </td>
          </tr>

          <!-- User Information Card -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${colors.bg}; border-radius: 8px; border-left: 4px solid ${colors.primary};">
                <tr>
                  <td style="padding: 20px 24px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 600;">👤 User Details</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6B7280; width: 100px;">Name:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${user?.full_name || 'Unknown User'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6B7280;">Email:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111827;">${user?.email && user.email !== 'Not available' ? user.email : '<span style="color: #DC2626;">Email not available</span>'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6B7280;">Emotion:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${emotion || 'Unknown'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6B7280;">Time:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111827;">${timestamp}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Content -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">💬 User Message</h2>
              <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; border: 1px solid #E5E7EB;">
                <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic; line-height: 1.7;">"${truncatedMessage}"</p>
              </div>
            </td>
          </tr>

          <!-- Action Required Section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="font-size: 24px; margin-right: 12px;">⚠️</div>
                      <div>
                        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #92400E; font-weight: 600;">Action Required</h3>
                        <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.6;">Please reach out to ${user?.full_name || 'them'} to ensure their wellbeing. If you believe this is an emergency, <strong>contact emergency services immediately</strong>.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              ${user?.email && user.email !== 'Not available' 
                ? `<a href="mailto:${user.email}${contact?.contact_email ? ',' + contact.contact_email : ''}" style="display: inline-block; background-color: ${colors.primary}; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; transition: background-color 0.3s;">📧 Email ${user?.full_name || 'User'}</a>`
                : `<div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                     <p style="margin: 0; font-size: 14px; color: #4B5563; text-align: center;">⚠️ User's email is not available. Please contact them through other means:</p>
                     <ul style="margin: 8px 0 0 0; font-size: 14px; color: #4B5563; list-style: none; padding: 0;">
                       <li style="margin: 4px 0;">📞 Phone call</li>
                       <li style="margin: 4px 0;">💬 Text message</li>
                       <li style="margin: 4px 0;">🏠 In-person visit</li>
                     </ul>
                   </div>
                   <a href="#" onclick="alert('Please contact ${user?.full_name || 'this person'} through phone, text, or visit them in person since their email is not available.')" style="display: inline-block; background-color: ${colors.primary}; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600;">📞 Contact ${user?.full_name || 'User'}</a>`
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 40px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280; text-align: center;">This is an automated alert from EmotionSense AI</p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">© ${new Date().getFullYear()} EmotionSense AI. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Generate plain text version
export const generateEmergencyAlertText = (user, contact, emotion, messageText, riskLevel = 'medium') => {
  const colors = getRiskColors(riskLevel);
  const truncatedMessage = messageText && messageText.length > 500 
    ? messageText.substring(0, 500) + '...' 
    : messageText || 'N/A';
  
  const timestamp = new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short' 
  });

  return `
${colors.emoji} EMERGENCY ALERT - ${riskLevel.toUpperCase()} RISK LEVEL

Dear ${contact?.contact_name || 'Contact'},

You have been designated as an emergency contact for ${user?.full_name || 'a user'}.
We are reaching out regarding a concerning situation that requires attention.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 USER DETAILS
Name: ${user?.full_name || 'Unknown User'}
Email: ${user?.email || 'N/A'}
Detected Emotion: ${emotion || 'Unknown'}
Time: ${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 USER MESSAGE
"${truncatedMessage}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ACTION REQUIRED
Please reach out to ${user?.full_name || 'them'} to ensure their wellbeing.
If you believe this is an emergency, contact emergency services immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated alert from EmotionSense AI
© ${new Date().getFullYear()} EmotionSense AI. All rights reserved.
  `.trim();
};

// Update the sendEmergencyAlert function to use new templates
export const sendEmergencyAlert = async (user, contact, emotion, messageText, riskLevel = 'medium') => {
  try {
    if (!transporter) {
      console.warn('⚠️ Nodemailer transporter not initialized - skipping email alert');
      return false;
    }

    if (!contact || !contact.contact_email) {
      console.warn('⚠️ Emergency contact email not provided - skipping email alert');
      return false;
    }

    const emailConfig = config.email.nodemailer;
    let fromEmail = emailConfig.gmail?.email || 
                    emailConfig.outlook?.email || 
                    emailConfig.smtp?.email || 
                    emailConfig.sendgrid?.fromEmail;

    if (!fromEmail) {
      console.warn('⚠️ From email not configured - skipping email alert');
      return false;
    }

    const colors = getRiskColors(riskLevel);
    const emailSubject = `${colors.emoji} [${riskLevel.toUpperCase()} ALERT] ${user?.full_name || 'User'} - EmotionSense AI`;
    const emailHtml = generateEmergencyAlertHTML(user, contact, emotion, messageText, riskLevel);
    const emailText = generateEmergencyAlertText(user, contact, emotion, messageText, riskLevel);

    console.log(`📧 Sending emergency alert to ${contact.contact_email} for user ${user?.id}`);

    const response = await transporter.sendMail({
      from: `"EmotionSense AI Alerts" <${fromEmail}>`,
      to: contact.contact_email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      replyTo: user?.email || undefined,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });

    if (response && response.messageId) {
      console.log(`✅ Emergency alert email sent successfully to ${contact.contact_email}`);
      console.log(`   Message ID: ${response.messageId}`);
      return true;
    } else {
      console.error('❌ Email sent but no message ID received');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending emergency alert email:', error.message);
    console.log('⚠️ Emergency alert email failed but system continues - user message still processed');
    return false;
  }
};

/**
 * Initialize Nodemailer transporter based on configuration
 * @returns {Promise<boolean>} - Success status
 */
export const initializeNodemailer = async () => {
  try {
    const emailConfig = config.email.nodemailer;

    if (!emailConfig.enabled) {
      console.log('⚠️ Nodemailer is disabled in configuration');
      return false;
    }

    if (!emailConfig.provider) {
      console.warn('⚠️ Email provider not configured - email alerts will be disabled');
      return false;
    }

    const provider = emailConfig.provider.toLowerCase();

    switch (provider) {
      case 'gmail':
        transporter = await createGmailTransporter(emailConfig);
        break;
      case 'outlook':
        transporter = await createOutlookTransporter(emailConfig);
        break;
      case 'smtp':
        transporter = await createSmtpTransporter(emailConfig);
        break;
      case 'sendgrid':
        transporter = await createSendgridTransporter(emailConfig);
        break;
      default:
        console.warn(`⚠️ Unknown email provider: ${provider}`);
        return false;
    }

    if (!transporter) {
      return false;
    }

    // Verify connection
    try {
      await transporter.verify();
      console.log(`✅ Nodemailer initialized with ${provider} provider`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to verify ${provider} connection:`, error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing Nodemailer:', error.message);
    return false;
  }
};

/**
 * Create Gmail transporter
 */
const createGmailTransporter = async (emailConfig) => {
  try {
    if (!emailConfig.gmail.email || !emailConfig.gmail.appPassword) {
      console.warn('⚠️ Gmail credentials not provided (email, appPassword)');
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.gmail.email,
        pass: emailConfig.gmail.appPassword
      }
    });
  } catch (error) {
    console.error('Error creating Gmail transporter:', error.message);
    return null;
  }
};

/**
 * Create Outlook transporter
 */
const createOutlookTransporter = async (emailConfig) => {
  try {
    if (!emailConfig.outlook.email || !emailConfig.outlook.password) {
      console.warn('⚠️ Outlook credentials not provided (email, password)');
      return null;
    }

    return nodemailer.createTransport({
      service: 'outlook',
      auth: {
        user: emailConfig.outlook.email,
        pass: emailConfig.outlook.password
      }
    });
  } catch (error) {
    console.error('Error creating Outlook transporter:', error.message);
    return null;
  }
};

/**
 * Create generic SMTP transporter
 */
const createSmtpTransporter = async (emailConfig) => {
  try {
    if (!emailConfig.smtp.host || !emailConfig.smtp.port || !emailConfig.smtp.email) {
      console.warn('⚠️ SMTP credentials not provided (host, port, email, password)');
      return null;
    }

    return nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure || false,
      auth: {
        user: emailConfig.smtp.email,
        pass: emailConfig.smtp.password
      }
    });
  } catch (error) {
    console.error('Error creating SMTP transporter:', error.message);
    return null;
  }
};

/**
 * Create SendGrid transporter
 */
const createSendgridTransporter = async (emailConfig) => {
  try {
    if (!emailConfig.sendgrid.apiKey || !emailConfig.sendgrid.fromEmail) {
      console.warn('⚠️ SendGrid credentials not provided (apiKey, fromEmail)');
      return null;
    }

    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: emailConfig.sendgrid.apiKey
      }
    });
  } catch (error) {
    console.error('Error creating SendGrid transporter:', error.message);
    return null;
  }
};

/**
 * Check if email alerts are enabled and configured
 * @returns {boolean}
 */
export const isEmailAlertsEnabled = () => {
  try {
    const emailConfig = config.email.nodemailer;
    return emailConfig.enabled && transporter !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Get email configuration status
 * @returns {Object} - Configuration status
 */
export const getEmailConfigStatus = () => {
  try {
    const emailConfig = config.email.nodemailer;

    return {
      enabled: emailConfig.enabled,
      provider: emailConfig.provider,
      initialized: transporter !== null,
      hasGmailConfig: !!(emailConfig.gmail?.email && emailConfig.gmail?.appPassword),
      hasOutlookConfig: !!(emailConfig.outlook?.email && emailConfig.outlook?.password),
      hasSmtpConfig: !!(emailConfig.smtp?.host && emailConfig.smtp?.port && emailConfig.smtp?.email),
      hasSendgridConfig: !!(emailConfig.sendgrid?.apiKey && emailConfig.sendgrid?.fromEmail)
    };
  } catch (error) {
    return {
      enabled: false,
      provider: null,
      initialized: false,
      error: error.message
    };
  }
};
