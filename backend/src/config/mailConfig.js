/**
 * Mail Configuration Module
 * Centralizes Nodemailer setup for emergency alert emails
 * Provides simple interface for sending alerts and test emails
 */

import nodemailer from 'nodemailer';
import config from './index.js';

let transporter = null;
let initialized = false;

/**
 * Initialize Nodemailer transporter based on configuration
 * Uses the existing nodemailerHelper initialization but provides simplified API
 * @returns {Promise<boolean>} - True if successfully initialized
 */
export const initializeMailConfig = async () => {
  try {
    const emailConfig = config.email.nodemailer;

    if (!emailConfig.enabled) {
      console.log('ℹ️ Email alerts are disabled in configuration');
      return false;
    }

    if (!emailConfig.provider) {
      console.warn('⚠️ No email provider configured - emergency alerts will be disabled');
      return false;
    }

    const provider = emailConfig.provider.toLowerCase();
    let transportConfig = null;

    if (provider === 'gmail') {
      if (!emailConfig.gmail.email || !emailConfig.gmail.appPassword) {
        console.warn('⚠️ Gmail credentials not configured (GMAIL_EMAIL or GMAIL_APP_PASSWORD)');
        return false;
      }
      transportConfig = {
        service: 'gmail',
        auth: {
          user: emailConfig.gmail.email,
          pass: emailConfig.gmail.appPassword
        }
      };
    } else if (provider === 'outlook') {
      if (!emailConfig.outlook.email || !emailConfig.outlook.password) {
        console.warn('⚠️ Outlook credentials not configured');
        return false;
      }
      transportConfig = {
        service: 'outlook',
        auth: {
          user: emailConfig.outlook.email,
          pass: emailConfig.outlook.password
        }
      };
    } else if (provider === 'smtp') {
      if (!emailConfig.smtp.host || !emailConfig.smtp.port || !emailConfig.smtp.email || !emailConfig.smtp.password) {
        console.warn('⚠️ SMTP credentials not fully configured');
        return false;
      }
      transportConfig = {
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.email,
          pass: emailConfig.smtp.password
        }
      };
    } else if (provider === 'sendgrid') {
      if (!emailConfig.sendgrid.apiKey || !emailConfig.sendgrid.fromEmail) {
        console.warn('⚠️ SendGrid credentials not fully configured');
        return false;
      }
      transportConfig = {
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: emailConfig.sendgrid.apiKey
        }
      };
    } else {
      console.warn(`⚠️ Unknown email provider: ${provider}`);
      return false;
    }

    transporter = nodemailer.createTransport(transportConfig);

    // Verify the connection
    try {
      await transporter.verify();
      console.log(`✅ Mail transporter initialized with ${provider} provider`);
      initialized = true;
      return true;
    } catch (verifyError) {
      console.error(`❌ Failed to verify ${provider} email connection:`, verifyError.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing mail config:', error.message);
    return false;
  }
};

/**
 * Get the from email address based on current configuration
 * @returns {string|null} - From email address or null
 */
const getFromEmail = () => {
  const emailConfig = config.email.nodemailer;
  return (
    emailConfig.gmail?.email ||
    emailConfig.outlook?.email ||
    emailConfig.smtp?.email ||
    emailConfig.sendgrid?.fromEmail ||
    null
  );
};

/**
 * Send emergency alert email to contact
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - User's name experiencing distress
 * @param {string} userEmail - User's email (for reference)
 * @param {string} detectedEmotion - Detected emotion (e.g., "sadness", "anger")
 * @param {string} messageText - User's message (will be truncated)
 * @param {string} riskLevel - Risk level: 'high', 'medium', or 'low'
 * @returns {Promise<boolean>} - True if email was sent successfully
 */
export const sendEmergencyAlert = async (
  toEmail,
  userName,
  userEmail,
  detectedEmotion = 'unknown',
  messageText = '',
  riskLevel = 'high'
) => {
  try {
    if (!transporter) {
      console.error('❌ Mail transporter not initialized');
      return false;
    }

    const fromEmail = getFromEmail();
    if (!fromEmail) {
      console.error('❌ From email not configured');
      return false;
    }

    // Truncate message to first 150 characters
    const truncatedMessage = messageText.slice(0, 150) + (messageText.length > 150 ? '...' : '');

    // Determine email styling based on risk level
    const riskConfig = {
      high: {
        color: '#d9534f',
        bgColor: '#f8d7da',
        borderColor: '#f5c6cb',
        emoji: '🔴',
        title: 'HIGH RISK: Immediate Attention Required'
      },
      medium: {
        color: '#ff9800',
        bgColor: '#fff3cd',
        borderColor: '#ffeeba',
        emoji: '🟡',
        title: 'MEDIUM RISK: Please Check In'
      },
      low: {
        color: '#5cb85c',
        bgColor: '#d4edda',
        borderColor: '#c3e6cb',
        emoji: '🟢',
        title: 'LOW RISK: For Information'
      }
    };

    const risk = riskConfig[riskLevel] || riskConfig.high;

    const emailSubject = `${risk.emoji} [${riskLevel.toUpperCase()}] EmotionSense Alert - ${userName}`;

    const emailText = `
Emergency Alert from EmotionSense AI

Dear Emergency Contact,

You have been designated as an emergency contact for ${userName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${risk.title}

User: ${userName}
Email: ${userEmail}
Detected Emotion: ${detectedEmotion}
Risk Level: ${riskLevel.toUpperCase()} ${risk.emoji}

Message:
"${truncatedMessage}"

Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please reach out to them to ensure their wellbeing.

If this is a genuine emergency, please contact emergency services immediately.

Best regards,
EmotionSense AI Team
    `.trim();

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: white; padding: 20px; }
      .alert-box { background: ${risk.bgColor}; border: 2px solid ${risk.borderColor}; border-left: 5px solid ${risk.color}; padding: 15px; border-radius: 4px; margin: 20px 0; }
      .alert-title { color: ${risk.color}; font-size: 18px; font-weight: bold; margin: 0 0 10px 0; }
      .info-section { margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #667eea; border-radius: 4px; }
      .info-label { font-weight: bold; color: #333; }
      .message-box { background: #f0f0f0; padding: 15px; border-radius: 4px; font-style: italic; margin: 10px 0; border-left: 4px solid #999; }
      .footer { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ddd; }
      .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>${risk.emoji} EmotionSense AI - Emergency Alert</h2>
      </div>

      <div class="content">
        <p>Dear Emergency Contact,</p>

        <p>You have been designated as an emergency contact for <strong>${userName}</strong>.</p>

        <div class="alert-box">
          <div class="alert-title">${risk.title}</div>
          <p>We are notifying you of a concerning situation that requires your attention.</p>
        </div>

        <div class="info-section">
          <p><span class="info-label">👤 User:</span> ${userName}</p>
          <p><span class="info-label">📧 Email:</span> ${userEmail}</p>
          <p><span class="info-label">💭 Detected Emotion:</span> ${detectedEmotion}</p>
          <p><span class="info-label">⚠️ Risk Level:</span> <span style="color: ${risk.color}; font-weight: bold;">${riskLevel.toUpperCase()}</span></p>
        </div>

        <div class="info-section">
          <p><span class="info-label">💬 Message:</span></p>
          <div class="message-box">"${truncatedMessage}"</div>
        </div>

        <div class="info-section">
          <p><span class="info-label">⏰ Time:</span> ${new Date().toLocaleString()}</p>
        </div>

        <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ff9800; border-radius: 4px;">
          <strong>⚠️ Important:</strong> Please reach out to them to check on their wellbeing. If you believe this is a genuine emergency, please contact emergency services immediately.
        </p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

        <p style="font-size: 12px; color: #666;">
          This is an automated alert from EmotionSense AI. Please handle this information with confidentiality and care.
        </p>
      </div>

      <div class="footer">
        <p>&copy; 2024-2025 EmotionSense AI. All rights reserved.</p>
        <p>This alert was sent because you are listed as an emergency contact for ${userName}.</p>
      </div>
    </div>
  </body>
</html>
    `.trim();

    console.log(`📧 Sending emergency alert email to: ${toEmail}`);

    const response = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      replyTo: userEmail || undefined
    });

    if (response && response.messageId) {
      console.log(`✅ Emergency alert email sent successfully to ${toEmail}`);
      console.log(`   Message ID: ${response.messageId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error sending emergency alert email:', error.message);
    return false;
  }
};

/**
 * Send test email to verify configuration
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<boolean>} - True if test email was sent successfully
 */
export const sendTestEmail = async (testEmail) => {
  try {
    if (!transporter) {
      console.error('❌ Mail transporter not initialized');
      return false;
    }

    const fromEmail = getFromEmail();
    if (!fromEmail) {
      console.error('❌ From email not configured');
      return false;
    }

    console.log(`📧 Sending test email to ${testEmail}...`);

    const response = await transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: '✅ EmotionSense AI - Nodemailer Test Email',
      text: `This is a test email to verify that Nodemailer is configured correctly.\n\nSent at: ${new Date().toLocaleString()}\n\nIf you received this, your email configuration is working!`,
      html: `
<html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
    <div style="background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #667eea; text-align: center;">✅ EmotionSense AI - Nodemailer Test</h2>
      <p>This is a test email to verify that Nodemailer is configured correctly.</p>
      <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p style="color: #666; font-size: 12px; text-align: center;">
        If you received this email, your email configuration is working properly!
      </p>
    </div>
  </body>
</html>
      `
    });

    if (response && response.messageId) {
      console.log(`✅ Test email sent successfully!`);
      console.log(`   Message ID: ${response.messageId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    return false;
  }
};

/**
 * Check if mail transporter is initialized
 * @returns {boolean} - True if transporter is ready
 */
export const isMailConfigured = () => {
  return initialized && transporter !== null;
};

/**
 * Get mail configuration status
 * @returns {Object} - Configuration status details
 */
export const getMailConfigStatus = () => {
  const emailConfig = config.email.nodemailer;
  return {
    enabled: emailConfig.enabled,
    initialized,
    provider: emailConfig.provider,
    fromEmail: getFromEmail(),
    hasGmailConfig: !!(emailConfig.gmail?.email && emailConfig.gmail?.appPassword),
    hasOutlookConfig: !!(emailConfig.outlook?.email && emailConfig.outlook?.password),
    hasSmtpConfig: !!(emailConfig.smtp?.host && emailConfig.smtp?.email && emailConfig.smtp?.password),
    hasSendgridConfig: !!(emailConfig.sendgrid?.apiKey && emailConfig.sendgrid?.fromEmail)
  };
};

export default {
  initializeMailConfig,
  sendEmergencyAlert,
  sendTestEmail,
  isMailConfigured,
  getMailConfigStatus
};
