/**
 * Emergency Notifier Utility
 * Coordinates emergency alert triggering when high-risk messages are detected
 * Handles email sending, Supabase logging, and error handling
 */

import { sendEmergencyAlert, isMailConfigured } from '../config/mailConfig.js';
import { logSafetyAlert, getEmergencyContact } from '../storage-service/index.js';
import config from '../config/index.js';

/**
 * Check if a message contains high-risk keywords indicating self-harm or suicide intent
 * @param {string} messageText - The message to check
 * @returns {Object} - { isHighRisk: boolean, riskLevel: 'high'|'medium'|'low', matchedKeywords: string[] }
 */
export const detectRiskLevel = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return { isHighRisk: false, riskLevel: 'low', matchedKeywords: [] };
  }

  const text = messageText.toLowerCase();
  const highRiskKeywords = config.safety.highRiskKeywords || [];
  const mediumRiskKeywords = config.safety.mediumRiskKeywords || [];

  const highRiskMatches = highRiskKeywords.filter(keyword =>
    text.includes(keyword.toLowerCase())
  );

  const mediumRiskMatches = mediumRiskKeywords.filter(keyword =>
    text.includes(keyword.toLowerCase())
  );

  if (highRiskMatches.length > 0) {
    return {
      isHighRisk: true,
      riskLevel: 'high',
      matchedKeywords: highRiskMatches
    };
  }

  if (mediumRiskMatches.length > 0) {
    return {
      isHighRisk: true,
      riskLevel: 'medium',
      matchedKeywords: mediumRiskMatches
    };
  }

  return { isHighRisk: false, riskLevel: 'low', matchedKeywords: [] };
};

/**
 * Trigger emergency notification workflow
 * 1. Verify emergency alerts are enabled
 * 2. Fetch emergency contact from Supabase
 * 3. Send alert email via Nodemailer
 * 4. Log the alert event to Supabase
 *
 * @param {string} userId - User ID (UUID)
 * @param {string} userName - User's full name
 * @param {string} userEmail - User's email address
 * @param {string} messageText - The user's message that triggered alert
 * @param {string} detectedEmotion - Detected emotion (e.g., 'sadness', 'anger')
 * @param {string} riskLevel - Risk level: 'high', 'medium', or 'low'
 * @returns {Promise<Object>} - { success: boolean, alerted: boolean, logged: boolean, error?: string }
 */
export const triggerEmergencyNotification = async (
  userId,
  userName,
  userEmail,
  messageText,
  detectedEmotion = 'unknown',
  riskLevel = 'high'
) => {
  const result = {
    success: false,
    alerted: false,
    logged: false,
    error: null
  };

  try {
    // Step 1: Check if emergency alerts are enabled globally
    if (!config.safety.enableEmergencyAlerts) {
      console.log('ℹ️ Emergency alerts are disabled in configuration');
      result.error = 'Emergency alerts disabled';
      return result;
    }

    // Step 2: Check if email is configured
    if (!isMailConfigured()) {
      console.warn('⚠️ Email/Nodemailer not configured - cannot send alert');
      result.error = 'Email not configured';
    }

    // Step 3: Fetch emergency contact
    console.log(`🔍 Fetching emergency contact for user: ${userId}`);
    const contact = await getEmergencyContact(userId);

    if (!contact || !contact.contact_email) {
      console.log(`ℹ️ No emergency contact configured for user: ${userId}`);
      result.logged = true; // Still log the incident
    } else {
      // Step 4: Send emergency alert email
      try {
        console.log(`⚠️ High-risk message detected - sending alert to: ${contact.contact_email}`);

        const emailSent = await sendEmergencyAlert(
          contact.contact_email,
          userName,
          userEmail,
          detectedEmotion,
          messageText,
          riskLevel
        );

        if (emailSent) {
          result.alerted = true;
          console.log(`✅ Emergency alert successfully sent to: ${contact.contact_email}`);
        } else {
          console.warn(`⚠️ Failed to send alert email but continuing...`);
        }
      } catch (emailError) {
        console.error('❌ Error sending alert email:', emailError.message);
        result.error = `Email send failed: ${emailError.message}`;
      }
    }

    // Step 5: Log the incident to Supabase for audit trail
    try {
      console.log(`📝 Logging safety alert for user: ${userId}`);

      const loggedAlert = await logSafetyAlert(
        userId,
        detectedEmotion,
        messageText,
        contact?.id || null,
        result.alerted // true if email was sent
      );

      if (loggedAlert) {
        result.logged = true;
        console.log(`✅ Safety alert logged to Supabase`);
      } else {
        console.warn('⚠️ Failed to log alert to Supabase');
      }
    } catch (logError) {
      console.error('❌ Error logging safety alert:', logError.message);
      result.error = `Logging failed: ${logError.message}`;
    }

    // Step 6: Mark as success if at least alert was logged
    result.success = result.logged || result.alerted;

    if (result.success) {
      console.log(`✅ Emergency notification workflow completed for user: ${userId}`);
    } else {
      console.error(`❌ Emergency notification workflow failed for user: ${userId}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Unexpected error in emergency notification:', error.message);
    result.error = error.message;
    return result;
  }
};

/**
 * Analyze message and send emergency notification if needed
 * Combines risk detection + notification triggering
 *
 * @param {string} userId - User ID (UUID)
 * @param {string} userName - User's full name
 * @param {string} userEmail - User's email address
 * @param {string} messageText - The user's message
 * @param {string} detectedEmotion - Detected emotion
 * @returns {Promise<Object>} - { shouldAlert: boolean, riskLevel: string, result: Object }
 */
export const analyzeAndNotifyIfNeeded = async (
  userId,
  userName,
  userEmail,
  messageText,
  detectedEmotion = 'unknown'
) => {
  try {
    // Detect risk level
    const riskDetection = detectRiskLevel(messageText);

    if (!riskDetection.isHighRisk) {
      console.log('✅ Message analyzed - no high-risk keywords detected');
      return {
        shouldAlert: false,
        riskLevel: 'low',
        result: { success: true, alerted: false, logged: false }
      };
    }

    console.warn(`⚠️ High-risk message detected (Risk: ${riskDetection.riskLevel})`);
    console.warn(`   Keywords: ${riskDetection.matchedKeywords.join(', ')}`);

    // Trigger emergency notification
    const notificationResult = await triggerEmergencyNotification(
      userId,
      userName,
      userEmail,
      messageText,
      detectedEmotion,
      riskDetection.riskLevel
    );

    return {
      shouldAlert: true,
      riskLevel: riskDetection.riskLevel,
      matchedKeywords: riskDetection.matchedKeywords,
      result: notificationResult
    };
  } catch (error) {
    console.error('❌ Error in analyze and notify workflow:', error.message);
    return {
      shouldAlert: false,
      riskLevel: 'unknown',
      error: error.message,
      result: { success: false, alerted: false, logged: false }
    };
  }
};

export default {
  detectRiskLevel,
  triggerEmergencyNotification,
  analyzeAndNotifyIfNeeded
};
