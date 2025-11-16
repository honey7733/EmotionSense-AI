/**
 * Text-to-Speech (TTS) Service Module
 * Converts text responses to audio using Google TTS (primary), Sarvam AI (fallback), or Murf AI (third fallback)
 * 
 * This module:
 * 1. Receives text response from LLM
 * 2. Tries Google TTS API first (cloud, high-quality, neural)
 * 3. Falls back to Sarvam AI TTS if Google fails
 * 4. Falls back to Murf AI TTS if both Google and Sarvam fail
 * 5. Returns audio data (base64 or Buffer)
 */

import axios from 'axios';
import config from '../config/index.js';
import { SarvamAIClient } from 'sarvamai';

/**
 * Convert language code to Google TTS format (Indian languages focus)
 */
const convertToGoogleTTSLanguageCode = (languageCode) => {
  // If already in full format (en-IN), return as-is
  if (languageCode && languageCode.includes('-')) {
    return languageCode;
  }
  
  // Map short codes to Indian locale codes (prioritize Indian English)
  const indianLanguageMap = {
    'en': 'en-IN',      // Indian English
    'hi': 'hi-IN',      // Hindi
    'bn': 'bn-IN',      // Bengali
    'ta': 'ta-IN',      // Tamil
    'te': 'te-IN',      // Telugu
    'mr': 'mr-IN',      // Marathi
    'gu': 'gu-IN',      // Gujarati
    'kn': 'kn-IN',      // Kannada
    'ml': 'ml-IN',      // Malayalam
    'or': 'or-IN',      // Odia
    'pa': 'pa-IN',      // Punjabi
    'mai': 'hi-IN'      // Maithili (use Hindi voice)
  };
  
  return indianLanguageMap[languageCode] || 'en-IN';
};

/**
 * Get best Google TTS voice for Indian languages
 */
const getGoogleVoiceForLanguage = (languageCode) => {
  const indianVoiceMap = {
    // Indian English - Neural voice
    'en-IN': 'en-IN-Neural2-C',
    'en-US': 'en-IN-Neural2-C',  // Redirect to Indian English
    
    // Hindi - Neural voice (best quality)
    'hi-IN': 'hi-IN-Neural2-D',
    
    // Bengali - Wavenet voice
    'bn-IN': 'bn-IN-Wavenet-A',
    
    // Tamil - Wavenet voice
    'ta-IN': 'ta-IN-Wavenet-A',
    
    // Telugu - Standard voice
    'te-IN': 'te-IN-Standard-A',
    
    // Marathi - Wavenet voice
    'mr-IN': 'mr-IN-Wavenet-A',
    
    // Gujarati - Wavenet voice
    'gu-IN': 'gu-IN-Wavenet-A',
    
    // Kannada - Wavenet voice
    'kn-IN': 'kn-IN-Wavenet-A',
    
    // Malayalam - Wavenet voice
    'ml-IN': 'ml-IN-Wavenet-A',
    
    // Odia - Wavenet voice (if available, else fallback)
    'or-IN': 'en-IN-Neural2-C',  // Fallback to Indian English
    
    // Punjabi - Wavenet voice
    'pa-IN': 'pa-IN-Wavenet-A'
  };
  
  return indianVoiceMap[languageCode] || 'en-IN-Neural2-C';
};

/**
 * Generate speech using Google Cloud TTS API
 * Supports Neural2 voices and high-quality output
 * Docs: https://cloud.google.com/text-to-speech/docs/reference/rest
 */
export const generateSpeechGoogle = async (text, languageCode = 'en-US', voice = null) => {
  // Convert short language codes to full locale codes for Google TTS
  const fullLanguageCode = convertToGoogleTTSLanguageCode(languageCode);
  const selectedVoice = voice || getGoogleVoiceForLanguage(fullLanguageCode);
  console.log(`🔊 Generating speech using Google TTS (language: ${fullLanguageCode}, voice: ${selectedVoice})...`);

  if (!config.tts.google.apiKey) {
    throw new Error('Google TTS API key not configured');
  }

  try {
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.tts.google.apiKey}`,
      {
        input: { text: text },
        voice: {
          languageCode: fullLanguageCode,
          name: selectedVoice,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: config.tts.google.audioEncoding, // MP3, LINEAR16, OGG_OPUS
          speakingRate: config.tts.google.speakingRate || 1.0,
          pitch: config.tts.google.pitch || 0.0
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    // Google TTS returns base64 encoded audio in the response
    const audioContent = response.data.audioContent;
    const audioBuffer = Buffer.from(audioContent, 'base64');
    
    console.log(`✅ Google TTS synthesis complete (${audioBuffer.length} bytes)`);

    return {
      audio: audioContent, // Already base64 encoded
      format: config.tts.google.audioEncoding.toLowerCase(),
      duration: estimateDuration(text),
      provider: 'google',
      voice: selectedVoice,
      language: fullLanguageCode,
      sampleRate: 24000 // Google TTS typically uses 24kHz
    };
  } catch (error) {
    console.error('❌ Google TTS Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      throw new Error(`Google TTS API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Google TTS API request failed - no response received');
    } else {
      throw new Error(`OpenAI TTS error: ${error.message}`);
    }
  }
};

/**
 * Convert language code to Sarvam AI format
 * Sarvam AI supports Indian languages with specific codes
 */
const convertToSarvamLanguageCode = (languageCode) => {
  // If already in full format (en-IN), extract base code
  let baseCode = languageCode;
  if (languageCode && languageCode.includes('-')) {
    baseCode = languageCode.split('-')[0];
  }
  
  // Sarvam AI language codes (Indian language focus)
  const sarvamLanguageMap = {
    'en': 'en-IN',      // English (Indian)
    'hi': 'hi-IN',      // Hindi
    'bn': 'bn-IN',      // Bengali
    'ta': 'ta-IN',      // Tamil
    'te': 'te-IN',      // Telugu
    'mr': 'mr-IN',      // Marathi
    'gu': 'gu-IN',      // Gujarati
    'kn': 'kn-IN',      // Kannada
    'ml': 'ml-IN',      // Malayalam
    'or': 'od-IN',      // Odia (Sarvam uses 'od' instead of 'or')
    'pa': 'pa-IN',      // Punjabi
    'mai': 'hi-IN'      // Maithili (fallback to Hindi)
  };
  
  return sarvamLanguageMap[baseCode] || 'en-IN';
};

/**
 * Generate speech using Sarvam AI TTS (Bulbul v1)
 * Indian language-focused TTS with neural voice quality
 * Docs: https://docs.sarvam.ai/api-reference-docs/endpoints/text-to-speech
 */
export const generateSpeechSarvam = async (text, languageCode = 'en-IN') => {
  const sarvamLanguage = convertToSarvamLanguageCode(languageCode);
  console.log(`🔊 Generating speech using Sarvam AI TTS (language: ${sarvamLanguage})...`);

  const apiKey = process.env.SARVAM_API_KEY;
  
  if (!apiKey || apiKey === 'your_sarvam_api_key_here') {
    throw new Error('Sarvam AI API key not configured. Set SARVAM_API_KEY in .env file.');
  }

  try {
    // Initialize Sarvam AI client
    const client = new SarvamAIClient({
      apiSubscriptionKey: apiKey,
    });

    // Call Sarvam TTS API - using the correct method 'convert'
    const response = await client.textToSpeech.convert({
      text: text,
      target_language_code: sarvamLanguage
    });

    // Response contains base64 encoded audio in 'audios' array
    if (!response || !response.audios || response.audios.length === 0) {
      throw new Error('Sarvam AI returned no audio content');
    }

    // Sarvam AI returns base64 encoded audio
    const audioBase64 = response.audios[0];
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    console.log(`✅ Sarvam AI TTS synthesis complete (${audioBuffer.length} bytes)`);

    return {
      audio: audioBase64, // Already base64 encoded
      format: 'wav',      // Sarvam AI returns WAV format
      duration: estimateDuration(text),
      provider: 'sarvam',
      language: sarvamLanguage,
      sampleRate: 8000    // Sarvam AI default sample rate
    };
  } catch (error) {
    console.error('❌ Sarvam AI TTS Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      throw new Error(`Sarvam AI TTS API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Sarvam AI TTS API request failed - no response received');
    } else {
      throw new Error(`Sarvam AI TTS error: ${error.message}`);
    }
  }
};

/**
 * Convert language code to Murf AI format
 * Murf AI supports multiple languages with locale codes
 */
const convertToMurfLanguageCode = (languageCode) => {
  // If already in full format (en-US), return as-is
  if (languageCode && languageCode.includes('-')) {
    return languageCode;
  }
  
  // Map short codes to Murf AI locale codes
  const murfLanguageMap = {
    'en': 'en-US',      // English (US)
    'hi': 'hi-IN',      // Hindi
    'bn': 'bn-IN',      // Bengali
    'ta': 'ta-IN',      // Tamil
    'te': 'te-IN',      // Telugu
    'mr': 'mr-IN',      // Marathi
    'gu': 'gu-IN',      // Gujarati
    'kn': 'kn-IN',      // Kannada
    'ml': 'ml-IN',      // Malayalam
    'pa': 'pa-IN',      // Punjabi
    'es': 'es-ES',      // Spanish
    'fr': 'fr-FR',      // French
    'de': 'de-DE',      // German
    'pt': 'pt-BR',      // Portuguese
    'ja': 'ja-JP',      // Japanese
    'ko': 'ko-KR',      // Korean
    'zh': 'zh-CN'       // Chinese
  };
  
  return murfLanguageMap[languageCode] || 'en-US';
};

/**
 * Get appropriate Murf AI voice and locale combination
 * Note: Voice availability varies by Murf AI plan and region
 * Each voice only supports specific locales
 */
const getMurfVoiceAndLocale = (requestedLocale) => {
  const configuredVoice = config.tts.murf.voiceId;
  
  // Matthew voice only supports en-US
  // For non-English languages, fallback to en-US locale with Matthew
  // This allows Murf AI to still generate speech, even if in English accent
  
  if (requestedLocale.startsWith('en-')) {
    return {
      voiceId: configuredVoice || 'Matthew',
      locale: 'en-US'
    };
  }
  
  // For non-English languages, use en-US locale with Matthew voice
  // This is a fallback - ideally you would have language-specific voices
  console.log(`⚠️  No native voice for ${requestedLocale}, using Matthew (en-US) voice`);
  return {
    voiceId: configuredVoice || 'Matthew',
    locale: 'en-US'  // Fallback to supported locale
  };
};

/**
 * Generate speech using Murf AI TTS (Stream Speech API)
 * High-quality AI voice synthesis with FALCON model
 * Docs: https://global.api.murf.ai/docs
 */
export const generateSpeechMurf = async (text, languageCode = 'en-US') => {
  const requestedLocale = convertToMurfLanguageCode(languageCode);
  const { voiceId, locale } = getMurfVoiceAndLocale(requestedLocale);
  console.log(`🔊 Generating speech using Murf AI TTS (requested: ${requestedLocale}, using locale: ${locale}, voice: ${voiceId})...`);

  const apiKey = config.tts.murf.apiKey;
  
  if (!apiKey || apiKey === 'your_murf_api_key_here') {
    throw new Error('Murf AI API key not configured. Set MURF_API_KEY in .env file.');
  }

  try {
    // Call Murf AI Stream Speech API
    const response = await axios.post(
      'https://global.api.murf.ai/v1/speech/stream',
      {
        text: text,
        voiceId: voiceId,
        model: config.tts.murf.model || 'FALCON',
        multiNativeLocale: locale  // Use the validated locale
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey  // Murf AI uses 'api-key' header, not Authorization
        },
        responseType: 'arraybuffer', // Get binary audio data
        timeout: 30000 // 30 seconds timeout
      }
    );

    // Murf AI returns audio in binary format
    const audioBuffer = Buffer.from(response.data);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log(`✅ Murf AI TTS synthesis complete (${audioBuffer.length} bytes)`);

    return {
      audio: audioBase64, // Base64 encoded audio
      format: 'mp3',      // Murf AI typically returns MP3
      duration: estimateDuration(text),
      provider: 'murf',
      voice: voiceId,
      language: locale,  // Return the actual locale used
      sampleRate: 44100   // Murf AI high-quality sample rate
    };
  } catch (error) {
    console.error('❌ Murf AI TTS Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data ? error.response.data.toString() : null
    });
    
    if (error.response) {
      throw new Error(`Murf AI TTS API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Murf AI TTS API request failed - no response received');
    } else {
      throw new Error(`Murf AI TTS error: ${error.message}`);
    }
  }
};

/**
 * Estimate audio duration based on text length
 * Rough estimation: ~150 words per minute average speaking rate
 */
const estimateDuration = (text) => {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  const durationMinutes = words / wordsPerMinute;
  const durationSeconds = durationMinutes * 60;
  return Math.round(durationSeconds * 10) / 10; // Round to 1 decimal place
};

/**
 * Main function: Generate speech from text
 * This is the primary export used by routes
 * Strategy: Use Google TTS -> Sarvam AI -> Murf AI fallback chain
 */
export const generateSpeech = async (text, voice = null, languageCode = null) => {
  console.log(`🎙️ Converting text to speech...`);

  if (!config.tts.enabled) {
    console.log('ℹ️  TTS is disabled in configuration');
    return null;
  }

  if (!text || text.trim().length === 0) {
    console.warn('⚠️  No text provided for TTS');
    return null;
  }

  // Only use Google TTS, Sarvam AI, and Murf AI
  if (config.tts.provider !== 'google') {
    throw new Error(`TTS provider '${config.tts.provider}' is not supported. Only 'google' is supported.`);
  }

  // Validate Google API key
  const hasValidGoogleKey = config.tts.google.apiKey && 
                             config.tts.google.apiKey.trim() !== '' &&
                             config.tts.google.apiKey !== 'your_google_tts_api_key_here';
  
  if (!hasValidGoogleKey) {
    console.warn('⚠️ Google TTS API key is not configured. Will attempt Sarvam AI fallback...');
  }

  // Selected language for TTS
  const selectedLanguage = languageCode || config.tts.google.languageCode || 'en-US';
  
  // Try Google TTS first (if API key is valid)
  if (hasValidGoogleKey) {
    try {
      console.log(`🌐 Using Google TTS with multilingual support...`);
      const selectedVoice = voice || null; // Let auto-selection pick best voice
      console.log(`   Language: ${selectedLanguage}`);
      console.log(`   API Key: ${config.tts.google.apiKey.substring(0, 10)}...${config.tts.google.apiKey.slice(-4)}`);
      
      const speechResult = await generateSpeechGoogle(
        text, 
        selectedLanguage,
        selectedVoice
      );
      
      console.log(`✅ Speech generated successfully (${speechResult.duration}s, ${speechResult.provider})`);
      
      return {
        audioData: speechResult.audio,
        format: speechResult.format,
        duration: speechResult.duration,
        provider: speechResult.provider,
        voice: speechResult.voice,
        text: text
      };
    } catch (googleError) {
      console.error(`❌ Google TTS failed:`, {
        message: googleError.message,
        status: googleError.response?.status,
        statusText: googleError.response?.statusText,
        error: googleError.response?.data?.error
      });
      
      console.warn('⚠️ Google TTS failed, switching to Sarvam AI fallback...');
    }
  }

  // Fallback to Sarvam AI TTS
  try {
    console.log(`🌐 Using Sarvam AI TTS as fallback...`);
    console.log(`   Language: ${selectedLanguage}`);
    
    const speechResult = await generateSpeechSarvam(text, selectedLanguage);
    
    console.log(`✅ Speech generated successfully (${speechResult.duration}s, ${speechResult.provider})`);
    
    return {
      audioData: speechResult.audio,
      format: speechResult.format,
      duration: speechResult.duration,
      provider: speechResult.provider,
      voice: 'sarvam-meera',
      text: text
    };
  } catch (sarvamError) {
    console.error(`❌ Sarvam AI TTS failed:`, {
      message: sarvamError.message,
      status: sarvamError.response?.status,
      statusText: sarvamError.response?.statusText,
      error: sarvamError.response?.data?.error
    });
    
    console.warn('⚠️ Sarvam AI TTS failed, switching to Murf AI fallback...');
  }

  // Third fallback to Murf AI TTS
  try {
    console.log(`🌐 Using Murf AI TTS as third fallback...`);
    console.log(`   Language: ${selectedLanguage}`);
    
    const speechResult = await generateSpeechMurf(text, selectedLanguage);
    
    console.log(`✅ Speech generated successfully (${speechResult.duration}s, ${speechResult.provider})`);
    
    return {
      audioData: speechResult.audio,
      format: speechResult.format,
      duration: speechResult.duration,
      provider: speechResult.provider,
      voice: speechResult.voice,
      text: text
    };
  } catch (murfError) {
    console.error(`❌ Murf AI TTS failed:`, {
      message: murfError.message,
      status: murfError.response?.status,
      statusText: murfError.response?.statusText,
      error: murfError.response?.data?.error
    });
    
    // All TTS systems failed
    throw new Error(`All TTS systems failed. Google: ${hasValidGoogleKey ? 'failed' : 'not configured'}. Sarvam AI: failed. Murf AI: ${murfError.message}`);
  }
};

/**
 * Convert audio format if needed
 * TODO: Implement audio format conversion
 */
export const convertAudioFormat = async (audioData, fromFormat, toFormat) => {
  // TODO: Implement audio format conversion using ffmpeg or similar
  console.log(`🔄 Converting audio from ${fromFormat} to ${toFormat}...`);
  
  // Placeholder - return original data
  return audioData;
};
