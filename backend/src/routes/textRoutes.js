/**
 * Text Analysis Routes
 * Handles text-based emotion detection requests with multi-language support and emergency contact alerts
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyzeTextEmotion } from '../text-service/index.js';
import { 
  saveAnalysisResult, 
  getEmergencyContact, 
  logSafetyAlert,
  getUserProfile 
} from '../storage-service/index.js';
import { 
  translateToEnglishIfNeeded, 
  getLanguageName 
} from '../utils/translationHelper.js';
import { sendEmergencyAlert } from '../utils/nodemailerHelper.js';
import { detectRiskLevel, shouldTriggerEmergencyAlert } from '../utils/safetyHelper.js';

const router = express.Router();

/**
 * POST /api/analyze/text
 * Analyze emotion from text input
 * 
 * Request body:
 * {
 *   "text": "I'm feeling really happy today!",
 *   "userId": "user123" (optional)
 * }
 */
router.post('/', asyncHandler(async (req, res) => {
  const { text, userId } = req.body;

  // Validate input
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Text is required and must be a string'
    });
  }

  if (text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Text cannot be empty'
    });
  }

  console.log(`🔤 Processing text emotion analysis for user: ${userId || 'anonymous'}`);

  // Language detection and translation
  console.log(`🌐 Detecting language and translating if needed...`);
  const translationResult = await translateToEnglishIfNeeded(text);
  
  const {
    translatedText: englishText,
    sourceLang: detectedLanguage,
    needsTranslation,
    usedFallback: usedTranslationFallback,
    translationFailed
  } = translationResult;

  console.log(`✅ Language detection: ${detectedLanguage} (${getLanguageName(detectedLanguage)})`);
  
  if (needsTranslation) {
    console.log(`🔄 Text translated for processing: "${englishText}"`);
  }

  if (usedTranslationFallback) {
    console.log(`⚠️ Used Gemini fallback for translation`);
  }

  if (translationFailed) {
    console.log(`⚠️ Translation failed, proceeding with original text`);
  }

  // Analyze text emotion using English text
  const emotionResult = await analyzeTextEmotion(englishText);

  // Check for high-risk keywords (if userId provided)
  if (userId && englishText && englishText.trim().length > 0) {
    const riskAnalysis = detectRiskLevel(englishText);
    console.log(`Risk level: ${riskAnalysis.riskLevel || 'none'}`);
    
    if (riskAnalysis.matchedKeywords.length > 0) {
      console.log(`⚠️ Detected keywords: ${riskAnalysis.matchedKeywords.join(', ')}`);
    }

    // Handle emergency alert if high or medium risk detected
    if (riskAnalysis.riskLevel) {
      try {
        const emergencyContact = await getEmergencyContact(userId);
        let alertSent = false;
        
        if (emergencyContact && emergencyContact.notify_enabled) {
          console.log(`🚨 Emergency contact found for user, checking if alert should be sent...`);
          
          if (shouldTriggerEmergencyAlert(emotionResult.emotion, riskAnalysis.riskLevel)) {
            console.log(`📧 Attempting to send emergency alert via email (text mode)...`);
            
            // Fetch user profile from Supabase to get accurate user information
            const userProfile = await getUserProfile(userId);
            
            // Prepare user data for emergency alert
            let userData = {
              id: userId,
              full_name: userProfile?.full_name || userProfile?.name || 'User',
              email: userProfile?.email || userProfile?.user_email || userProfile?.auth_email || 'Not available'
            };
            
            console.log(`👤 User data for alert: ${userData.full_name} (${userData.email})`);
            console.log(`🔍 User profile debug:`, { 
              profile_exists: !!userProfile,
              available_fields: userProfile ? Object.keys(userProfile) : 'none',
              email_field: userProfile?.email,
              user_email_field: userProfile?.user_email,
              auth_email_field: userProfile?.auth_email
            });
            console.log(`📮 Sending alert to emergency contact: ${emergencyContact.contact_email}`);
            
            // Send email alert via Nodemailer to the emergency contact's email
            alertSent = await sendEmergencyAlert(
              userData,
              emergencyContact,
              emotionResult.emotion,
              englishText,
              riskAnalysis.riskLevel
            );
            
            if (alertSent) {
              console.log(`✅ Emergency alert email sent successfully to ${emergencyContact.contact_email} (text mode)`);
            } else {
              console.warn(`⚠️ Failed to send emergency alert email to ${emergencyContact.contact_email}`);
            }
          }
        }
        
        // Log the safety alert event
        await logSafetyAlert(
          userId,
          emotionResult.emotion,
          englishText,
          emergencyContact?.id || null,
          alertSent
        );
        
      } catch (alertError) {
        console.error(`⚠️ Error handling emergency alert (text mode):`, alertError.message);
        // Don't fail the text analysis request if alert handling fails
      }
    }
  }

  // Save to database (if userId provided)
  let recordId = null;
  if (userId) {
    recordId = await saveAnalysisResult({
      userId,
      type: 'text',
      input: text, // Save original text
      translatedInput: needsTranslation ? englishText : null,
      emotion: emotionResult.emotion,
      confidence: emotionResult.confidence,
      scores: emotionResult.scores,
      language: {
        detected: detectedLanguage,
        name: getLanguageName(detectedLanguage),
        wasTranslated: needsTranslation,
        translationMethod: usedTranslationFallback ? 'gemini_fallback' : 'google_translate',
        translationFailed: translationFailed
      },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      emotion: emotionResult.emotion,
      confidence: emotionResult.confidence,
      scores: emotionResult.scores,
      language: {
        detected: detectedLanguage,
        name: getLanguageName(detectedLanguage),
        wasTranslated: needsTranslation,
        originalText: text,
        translatedText: needsTranslation ? englishText : null,
        translationMethod: usedTranslationFallback ? 'gemini_fallback' : 'google_translate',
        translationFailed: translationFailed
      },
      recordId: recordId
    }
  });
}));

export default router;
