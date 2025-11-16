/**
 * Response Generation Routes
 * Handles empathetic response generation using LLM
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateResponse } from '../llm-service/index.js';
import { generateSpeech } from '../tts-service/index.js';
import { aggregateResponse } from '../aggregator/index.js';
import config from '../config/index.js';

const router = express.Router();

/**
 * POST /api/response/generate
 * Generate empathetic response based on detected emotion
 * 
 * Request body:
 * {
 *   "emotion": "happy",
 *   "confidence": 0.85,
 *   "context": "User expressed happiness about their day",
 *   "transcript": "I'm feeling really happy today!",
 *   "includeAudio": true (optional, default: false)
 * }
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { emotion, confidence, context, transcript, includeAudio = false } = req.body;

  // Validate input
  if (!emotion) {
    return res.status(400).json({
      success: false,
      error: 'Emotion is required'
    });
  }

  console.log(`🤖 Generating empathetic response for emotion: ${emotion} (confidence: ${confidence})`);

  // Generate text response using LLM
  const llmResponse = await generateResponse({
    emotion,
    confidence,
    context,
    transcript
  });

  // Generate audio response if requested and TTS is enabled
  let audioResponse = null;
  if (includeAudio && config.tts.enabled) {
    console.log(`🔊 Generating audio response...`);
    audioResponse = await generateSpeech(llmResponse.text);
  }

  // Aggregate final response
  const finalResponse = aggregateResponse({
    textResponse: llmResponse,
    audioResponse,
    emotion,
    confidence
  });

  res.json({
    success: true,
    data: finalResponse
  });
}));

/**
 * POST /api/response/chat
 * Generate conversational response (can be used for follow-up conversations)
 * 
 * Request body:
 * {
 *   "message": "Tell me more about managing stress",
 *   "emotion": "anxious" (optional),
 *   "conversationHistory": [] (optional)
 * }
 */
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, emotion, conversationHistory = [] } = req.body;

  // Validate input
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  console.log(`💬 Generating conversational response...`);

  // Generate response
  const llmResponse = await generateResponse({
    emotion: emotion || 'neutral',
    context: message,
    conversationHistory
  });

  res.json({
    success: true,
    data: {
      response: llmResponse.text,
      model: llmResponse.model,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;
