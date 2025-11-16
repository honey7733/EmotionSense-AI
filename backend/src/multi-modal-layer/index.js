/**
 * Multi-Modal Emotion Layer Module
 * Combines text and voice emotion detection results
 * 
 * This module:
 * 1. Receives emotion results from text and voice services
 * 2. Applies fusion strategy (weighted average, voting, or ensemble)
 * 3. Returns dominant emotion with combined confidence
 * 4. Handles cases where only one modality is available
 */

import config from '../config/index.js';

/**
 * Normalize emotion labels
 * Maps different emotion labels to a standard set
 */
export const normalizeEmotionLabel = (emotion) => {
  const emotionMap = {
    // Standard emotions
    'happy': 'happy',
    'joy': 'happy',
    'excited': 'happy',
    
    'sad': 'sad',
    'sadness': 'sad',
    'depressed': 'sad',
    
    'angry': 'angry',
    'anger': 'angry',
    'frustrated': 'angry',
    
    'fear': 'fear',
    'fearful': 'fear',
    'anxious': 'fear',
    'anxiety': 'fear',
    
    'surprise': 'surprise',
    'surprised': 'surprise',
    
    'disgust': 'disgust',
    'disgusted': 'disgust',
    
    'neutral': 'neutral',
    'calm': 'neutral'
  };
  
  return emotionMap[emotion.toLowerCase()] || emotion.toLowerCase();
};

/**
 * Weighted fusion strategy
 * Combines emotions using weighted average based on confidence
 */
export const fusionWeighted = (textResult, voiceResult) => {
  const textWeight = config.multiModal.textEmotionWeight;
  const voiceWeight = config.multiModal.voiceEmotionWeight;
  
  // Get all unique emotion labels
  const allEmotions = new Set([
    ...Object.keys(textResult?.scores || {}),
    ...Object.keys(voiceResult?.scores || {})
  ]);
  
  // Calculate weighted scores for each emotion
  const fusedScores = {};
  allEmotions.forEach(emotion => {
    const normalizedEmotion = normalizeEmotionLabel(emotion);
    const textScore = (textResult?.scores?.[emotion] || 0) * textWeight;
    const voiceScore = (voiceResult?.scores?.[emotion] || 0) * voiceWeight;
    
    fusedScores[normalizedEmotion] = textScore + voiceScore;
  });
  
  // Find dominant emotion
  let dominantEmotion = 'neutral';
  let maxScore = 0;
  
  Object.entries(fusedScores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  });
  
  return {
    emotion: dominantEmotion,
    confidence: maxScore,
    scores: fusedScores,
    strategy: 'weighted'
  };
};

/**
 * Voting fusion strategy
 * Takes majority vote between modalities
 */
export const fusionVoting = (textResult, voiceResult) => {
  const textEmotion = normalizeEmotionLabel(textResult?.emotion || 'neutral');
  const voiceEmotion = normalizeEmotionLabel(voiceResult?.emotion || 'neutral');
  
  // If emotions match, high confidence
  if (textEmotion === voiceEmotion) {
    const avgConfidence = (
      (textResult?.confidence || 0) + 
      (voiceResult?.confidence || 0)
    ) / 2;
    
    return {
      emotion: textEmotion,
      confidence: Math.min(avgConfidence * 1.2, 1.0), // Boost confidence when modalities agree
      scores: {
        [textEmotion]: avgConfidence
      },
      strategy: 'voting',
      agreement: true
    };
  }
  
  // If emotions differ, choose the one with higher confidence
  const textConf = textResult?.confidence || 0;
  const voiceConf = voiceResult?.confidence || 0;
  
  if (textConf > voiceConf) {
    return {
      emotion: textEmotion,
      confidence: textConf * 0.8, // Reduce confidence due to disagreement
      scores: textResult?.scores || {},
      strategy: 'voting',
      agreement: false,
      reason: 'text_higher_confidence'
    };
  } else {
    return {
      emotion: voiceEmotion,
      confidence: voiceConf * 0.8,
      scores: voiceResult?.scores || {},
      strategy: 'voting',
      agreement: false,
      reason: 'voice_higher_confidence'
    };
  }
};

/**
 * Ensemble fusion strategy
 * Advanced fusion using multiple strategies and confidence thresholds
 */
export const fusionEnsemble = (textResult, voiceResult) => {
  // First try weighted fusion
  const weightedResult = fusionWeighted(textResult, voiceResult);
  
  // Check if confidence is above threshold
  if (weightedResult.confidence >= config.multiModal.confidenceThreshold) {
    return {
      ...weightedResult,
      strategy: 'ensemble',
      method: 'weighted'
    };
  }
  
  // If confidence is low, try voting
  const votingResult = fusionVoting(textResult, voiceResult);
  
  // If modalities agree in voting, trust it
  if (votingResult.agreement) {
    return {
      ...votingResult,
      strategy: 'ensemble',
      method: 'voting_agreement'
    };
  }
  
  // If still uncertain, return weighted result with low confidence flag
  return {
    ...weightedResult,
    strategy: 'ensemble',
    method: 'weighted_fallback',
    lowConfidence: true
  };
};

/**
 * Main function: Fuse emotions from multiple modalities
 * This is the primary export used by routes
 */
export const fuseEmotions = (textResult, voiceResult) => {
  console.log(`🎭 Fusing emotions from text and voice...`);
  
  // Handle case where only one modality is available
  if (!textResult && !voiceResult) {
    console.warn('⚠️  No emotion results provided for fusion');
    return {
      emotion: 'neutral',
      confidence: 0,
      scores: {},
      strategy: 'none',
      error: 'No input provided'
    };
  }
  
  if (!textResult) {
    console.log('ℹ️  Using voice-only emotion (no text result)');
    return {
      ...voiceResult,
      strategy: 'voice_only'
    };
  }
  
  if (!voiceResult) {
    console.log('ℹ️  Using text-only emotion (no voice result)');
    return {
      ...textResult,
      strategy: 'text_only'
    };
  }
  
  // Apply fusion strategy from config
  let fusedResult;
  const strategy = config.multiModal.fusionStrategy;
  
  switch (strategy) {
    case 'weighted':
      fusedResult = fusionWeighted(textResult, voiceResult);
      break;
    case 'voting':
      fusedResult = fusionVoting(textResult, voiceResult);
      break;
    case 'ensemble':
      fusedResult = fusionEnsemble(textResult, voiceResult);
      break;
    default:
      fusedResult = fusionWeighted(textResult, voiceResult);
  }
  
  console.log(`✅ Fused emotion: ${fusedResult.emotion} (confidence: ${fusedResult.confidence.toFixed(2)}, strategy: ${fusedResult.strategy})`);
  
  return {
    ...fusedResult,
    textEmotion: textResult.emotion,
    voiceEmotion: voiceResult.emotion,
    textConfidence: textResult.confidence,
    voiceConfidence: voiceResult.confidence
  };
};
