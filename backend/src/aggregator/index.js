/**
 * Response Aggregator Module
 * Combines and formats final responses
 * 
 * This module:
 * 1. Receives text response from LLM
 * 2. Receives audio response from TTS (if available)
 * 3. Combines emotion data
 * 4. Formats final response for client
 */

/**
 * Format timestamp
 */
const formatTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Calculate total processing time
 */
const calculateProcessingTime = (startTime) => {
  const endTime = Date.now();
  return Math.round(endTime - startTime);
};

/**
 * Aggregate text and audio responses
 */
export const aggregateResponse = ({ textResponse, audioResponse, emotion, confidence, startTime }) => {
  console.log('📦 Aggregating final response...');

  const response = {
    success: true,
    timestamp: formatTimestamp(),
    emotion: {
      detected: emotion,
      confidence: confidence
    },
    response: {
      text: textResponse?.text || '',
      model: textResponse?.model || 'unknown',
      isFallback: textResponse?.isFallback || false
    }
  };

  // Add audio if available
  if (audioResponse && audioResponse.audioData) {
    response.response.audio = {
      data: audioResponse.audioData,
      format: audioResponse.format,
      duration: audioResponse.duration,
      provider: audioResponse.provider
    };
    response.response.hasAudio = true;
  } else {
    response.response.hasAudio = false;
  }

  // Add processing time if startTime provided
  if (startTime) {
    response.processingTime = calculateProcessingTime(startTime);
  }

  console.log(`✅ Response aggregated (hasAudio: ${response.response.hasAudio})`);

  return response;
};

/**
 * Aggregate multi-modal analysis response
 */
export const aggregateMultiModalResponse = ({ textEmotion, voiceEmotion, fusedEmotion, transcript, startTime }) => {
  console.log('📦 Aggregating multi-modal analysis response...');

  const response = {
    success: true,
    timestamp: formatTimestamp(),
    transcript: transcript || '',
    emotions: {
      text: textEmotion ? {
        emotion: textEmotion.emotion,
        confidence: textEmotion.confidence,
        scores: textEmotion.scores
      } : null,
      voice: voiceEmotion ? {
        emotion: voiceEmotion.emotion,
        confidence: voiceEmotion.confidence,
        scores: voiceEmotion.scores
      } : null,
      fused: fusedEmotion ? {
        emotion: fusedEmotion.emotion,
        confidence: fusedEmotion.confidence,
        strategy: fusedEmotion.strategy,
        scores: fusedEmotion.scores
      } : null
    },
    dominantEmotion: fusedEmotion?.emotion || 'neutral',
    confidence: fusedEmotion?.confidence || 0
  };

  // Add processing time if startTime provided
  if (startTime) {
    response.processingTime = calculateProcessingTime(startTime);
  }

  console.log(`✅ Multi-modal response aggregated`);

  return response;
};

/**
 * Aggregate error response
 */
export const aggregateErrorResponse = (error, statusCode = 500) => {
  console.log('❌ Aggregating error response...');

  return {
    success: false,
    timestamp: formatTimestamp(),
    error: {
      message: error.message || 'An error occurred',
      code: statusCode,
      type: error.name || 'Error'
    }
  };
};

/**
 * Format emotion scores for display
 */
export const formatEmotionScores = (scores) => {
  if (!scores || typeof scores !== 'object') {
    return [];
  }

  return Object.entries(scores)
    .map(([emotion, score]) => ({
      emotion,
      score: Math.round(score * 100) / 100, // Round to 2 decimals
      percentage: `${Math.round(score * 100)}%`
    }))
    .sort((a, b) => b.score - a.score); // Sort by score descending
};

/**
 * Create response summary (for logging or analytics)
 */
export const createResponseSummary = (response) => {
  return {
    timestamp: response.timestamp,
    emotion: response.emotion?.detected || response.dominantEmotion || 'unknown',
    confidence: response.emotion?.confidence || response.confidence || 0,
    hasAudio: response.response?.hasAudio || false,
    model: response.response?.model || 'unknown',
    processingTime: response.processingTime || 0
  };
};

/**
 * Sanitize response (remove sensitive data before sending to client)
 */
export const sanitizeResponse = (response, includeSensitive = false) => {
  const sanitized = { ...response };

  // Remove internal fields if not requested
  if (!includeSensitive) {
    delete sanitized.isFallback;
    delete sanitized.audioFeatures;
  }

  return sanitized;
};
