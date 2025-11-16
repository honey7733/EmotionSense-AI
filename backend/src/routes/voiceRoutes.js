/**
 * Voice Analysis Routes
 * Handles voice-based emotion detection requests with emergency contact support
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { upload, cleanupFile } from '../middleware/uploadMiddleware.js';
import { analyzeVoiceEmotion } from '../voice-service/index.js';
import { 
  saveAnalysisResult, 
  getEmergencyContact, 
  logSafetyAlert,
  getUserProfile 
} from '../storage-service/index.js';
import { sendEmergencyAlert } from '../utils/nodemailerHelper.js';
import { detectRiskLevel, shouldTriggerEmergencyAlert } from '../utils/safetyHelper.js';

const router = express.Router();

/**
 * POST /api/analyze/voice
 * Analyze emotion from audio file
 * 
 * Request: multipart/form-data
 * - audio: audio file (wav, mp3, ogg, webm)
 * - userId: user identifier (optional)
 */
router.post('/', upload.single('audio'), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const audioFile = req.file;

  // Validate input
  if (!audioFile) {
    return res.status(400).json({
      success: false,
      error: 'Audio file is required'
    });
  }

  console.log(`🎤 Processing voice emotion analysis for user: ${userId || 'anonymous'}`);
  console.log(`📁 Audio file: ${audioFile.filename} (${audioFile.size} bytes)`);

  try {
    // Step 1: Analyze voice emotion
    const emotionResult = await analyzeVoiceEmotion(audioFile.path);
    
    console.log(`✅ Voice emotion detected: ${emotionResult.emotion} (confidence: ${emotionResult.confidence})`);
    console.log(`📝 Transcript: ${emotionResult.transcript}`);

    // Step 2: Check transcript for high-risk keywords (if transcript available)
    if (emotionResult.transcript && userId) {
      const riskAnalysis = detectRiskLevel(emotionResult.transcript);
      console.log(`Risk level: ${riskAnalysis.riskLevel || 'none'}`);
      
      if (riskAnalysis.matchedKeywords.length > 0) {
        console.log(`⚠️ Detected keywords: ${riskAnalysis.matchedKeywords.join(', ')}`);
      }

      // Step 3: Handle emergency alert if high or medium risk detected
      if (riskAnalysis.riskLevel) {
        try {
          const emergencyContact = await getEmergencyContact(userId);
          let alertSent = false;
          
          if (emergencyContact && emergencyContact.notify_enabled) {
            console.log(`🚨 Emergency contact found for user, checking if alert should be sent...`);
            
            if (shouldTriggerEmergencyAlert(emotionResult.emotion, riskAnalysis.riskLevel)) {
              console.log(`📧 Attempting to send emergency alert via email (voice mode)...`);
              
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
                emotionResult.transcript,
                riskAnalysis.riskLevel
              );
              
              if (alertSent) {
                console.log(`✅ Emergency alert email sent successfully to ${emergencyContact.contact_email} (voice mode)`);
              } else {
                console.warn(`⚠️ Failed to send emergency alert email to ${emergencyContact.contact_email}`);
              }
            }
          }
          
          // Log the safety alert event
          await logSafetyAlert(
            userId,
            emotionResult.emotion,
            emotionResult.transcript,
            emergencyContact?.id || null,
            alertSent
          );
          
        } catch (alertError) {
          console.error(`⚠️ Error handling emergency alert (voice mode):`, alertError.message);
          // Don't fail the voice analysis request if alert handling fails
        }
      }
    }

    // Step 4: Save to database (if userId provided)
    let recordId = null;
    if (userId) {
      recordId = await saveAnalysisResult({
        userId,
        type: 'voice',
        input: audioFile.filename,
        transcript: emotionResult.transcript,
        emotion: emotionResult.emotion,
        confidence: emotionResult.confidence,
        scores: emotionResult.scores,
        audioFeatures: emotionResult.audioFeatures,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        transcript: emotionResult.transcript,
        emotion: emotionResult.emotion,
        confidence: emotionResult.confidence,
        scores: emotionResult.scores,
        audioFeatures: emotionResult.audioFeatures,
        recordId: recordId
      }
    });
  } finally {
    // Clean up temporary audio file
    cleanupFile(audioFile.path);
  }
}));

export default router;
