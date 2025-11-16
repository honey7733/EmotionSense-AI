/**
 * Safety Detection Helper
 * Detects high-risk messages and triggers emergency alerts
 */

import config from '../config/index.js';

/**
 * Check if a message contains high-risk indicators
 * @param {string} message - User message text
 * @returns {Object} - { isHighRisk: boolean, riskLevel: 'high'|'medium'|null, matchedKeywords: string[] }
 */
export const detectRiskLevel = (message) => {
  if (!message || typeof message !== 'string') {
    return { isHighRisk: false, riskLevel: null, matchedKeywords: [] };
  }

  const lowerMessage = message.toLowerCase();
  const matchedKeywords = [];

  // Check high-risk keywords
  if (config.safety.highRiskKeywords && config.safety.highRiskKeywords.length > 0) {
    for (const keyword of config.safety.highRiskKeywords) {
      if (keyword && lowerMessage.includes(keyword.trim().toLowerCase())) {
        matchedKeywords.push(keyword.trim());
      }
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      isHighRisk: true,
      riskLevel: 'high',
      matchedKeywords
    };
  }

  // Check medium-risk keywords
  const mediumRiskMatched = [];
  if (config.safety.mediumRiskKeywords && config.safety.mediumRiskKeywords.length > 0) {
    for (const keyword of config.safety.mediumRiskKeywords) {
      if (keyword && lowerMessage.includes(keyword.trim().toLowerCase())) {
        mediumRiskMatched.push(keyword.trim());
      }
    }
  }

  if (mediumRiskMatched.length > 0) {
    return {
      isHighRisk: false,
      riskLevel: 'medium',
      matchedKeywords: mediumRiskMatched
    };
  }

  return {
    isHighRisk: false,
    riskLevel: null,
    matchedKeywords: []
  };
};

/**
 * Check if high-risk detection should trigger emergency alert
 * @param {string} detectedEmotion - Emotion detected by model (e.g., 'sad', 'angry')
 * @param {string} riskLevel - Risk level from detectRiskLevel
 * @returns {boolean} - Should send alert
 */
export const shouldTriggerEmergencyAlert = (detectedEmotion, riskLevel) => {
  if (!config.safety.enableEmergencyAlerts) {
    return false;
  }

  // High-risk always triggers alert
  if (riskLevel === 'high') {
    return true;
  }

  // Medium-risk + sad/negative emotion triggers alert
  if (riskLevel === 'medium' && detectedEmotion && (detectedEmotion.toLowerCase().includes('sad') || detectedEmotion.toLowerCase().includes('angry'))) {
    return true;
  }

  return false;
};

/**
 * Check if emotion indicates distress
 * @param {string} emotion - Detected emotion
 * @returns {boolean} - Is negative emotion
 */
export const isNegativeEmotion = (emotion) => {
  if (!emotion || typeof emotion !== 'string') {
    return false;
  }

  const negativeEmotions = ['sad', 'angry', 'fear', 'disgust', 'anxious', 'depressed', 'stressed'];
  return negativeEmotions.some(e => emotion.toLowerCase().includes(e));
};
