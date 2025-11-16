/**
 * Translation Helper Module
 * Handles language detection and translation using Google Translate API with Gemini fallback
 * 
 * Features:
 * 1. Detects input language automatically (including Hinglish)
 * 2. Translates non-English text to English for processing
 * 3. Translates English responses back to user's original language
 * 4. Fallback to Gemini 2.5 Flash if Google Translate fails
 * 5. Graceful error handling and logging
 */

import { translate } from '@vitalets/google-translate-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import { detectHinglish } from '../config/indianLanguages.js';

// Helper function to get Gemini model with API key fallback
const getGeminiModel = (modelName = 'gemini-2.0-flash-exp') => {
  const apiKey = config.gemini.apiKey1 || config.gemini.apiKey2 || config.gemini.apiKey;
  if (!apiKey) {
    throw new Error('No Gemini API key available');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Translate text to English if needed using Google Translate API
 * @param {string} text - Input text to translate
 * @returns {Promise<{translatedText: string, sourceLang: string, needsTranslation: boolean}>}
 */
export async function translateToEnglishIfNeeded(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  try {
    console.log(`🌐 Detecting language for: "${text.substring(0, 50)}..."`);
    
    // First check if text is Hinglish (romanized Hindi)
    const isHinglish = detectHinglish(text);
    if (isHinglish) {
      console.log(`✅ Hinglish detected! Using Gemini for translation...`);
      const hinglishResult = await geminiTranslateHinglish(text);
      return {
        translatedText: hinglishResult.translatedText,
        sourceLang: 'hi-Latn', // Hinglish language code
        needsTranslation: true,
        isHinglish: true
      };
    }
    
    // Attempt translation using Google Translate API
    const result = await translate(text, { to: 'en' });
    const sourceLang = result.raw?.src || 'unknown';
    const translatedText = result.text;
    
    console.log(`✅ Language detected: ${sourceLang}`);
    
    // Check if translation is needed (source language is not English)
    const needsTranslation = sourceLang !== 'en';
    
    if (needsTranslation) {
      console.log(`🔄 Translated from ${sourceLang} to English: "${translatedText}"`);
    } else {
      console.log(`✅ Text is already in English, no translation needed`);
    }
    
    return {
      translatedText,
      sourceLang,
      needsTranslation
    };
    
  } catch (error) {
    console.error('❌ Primary translation failed, using Gemini fallback:', error.message);
    
    // Fallback to Gemini for translation
    try {
      const fallbackResult = await geminiTranslateFallback(text);
      return {
        translatedText: fallbackResult.translatedText,
        sourceLang: fallbackResult.sourceLang || 'unknown',
        needsTranslation: true,
        usedFallback: true
      };
    } catch (fallbackError) {
      console.error('❌ Gemini fallback translation also failed:', fallbackError.message);
      
      // If both methods fail, return original text with warning
      console.warn('⚠️ All translation methods failed, proceeding with original text');
      return {
        translatedText: text,
        sourceLang: 'unknown',
        needsTranslation: false,
        translationFailed: true
      };
    }
  }
}

/**
 * Translate text back to user's original language
 * @param {string} text - English text to translate back
 * @param {string} targetLang - Target language code (e.g., 'hi', 'hi-Latn', 'es', 'fr')
 * @returns {Promise<string>} - Translated text
 */
export async function translateBackToUserLanguage(text, targetLang) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }
  
  if (!targetLang || targetLang === 'en' || targetLang === 'unknown') {
    console.log(`✅ No translation needed, target language is ${targetLang || 'unknown'}`);
    return text;
  }

  // Handle Hinglish (romanized Hindi)
  if (targetLang === 'hi-Latn') {
    console.log(`🔄 Translating response back to Hinglish using Gemini...`);
    try {
      return await geminiTranslateToHinglish(text);
    } catch (error) {
      console.error('❌ Hinglish translation failed:', error.message);
      console.warn('⚠️ Returning English response instead of Hinglish');
      return text;
    }
  }

  try {
    console.log(`🔄 Translating response back to ${targetLang}: "${text.substring(0, 50)}..."`);
    
    const result = await translate(text, { 
      from: 'en', 
      to: targetLang 
    });
    
    console.log(`✅ Response translated back to ${targetLang}`);
    return result.text;
    
  } catch (error) {
    console.error('❌ Primary back-translation failed, using Gemini fallback:', error.message);
    
    try {
      const fallbackResult = await geminiTranslateBack(text, targetLang);
      return fallbackResult;
    } catch (fallbackError) {
      console.error('❌ Gemini fallback back-translation also failed:', fallbackError.message);
      console.warn('⚠️ All back-translation methods failed, returning English response');
      return text;
    }
  }
}

/**
 * Gemini fallback translation to English
 * @param {string} text - Input text to translate
 * @returns {Promise<{translatedText: string, sourceLang: string}>}
 */
async function geminiTranslateFallback(text) {
  try {
    const model = getGeminiModel('gemini-2.0-flash-exp');
    
    const prompt = `You are a language detection and translation expert. 

Please analyze the following text and:
1. Detect the language of the text
2. If the text is NOT in English, translate it to English
3. If the text is already in English, return it as-is

Respond in this exact JSON format:
{
  "detectedLanguage": "language_code",
  "isEnglish": true/false,
  "translatedText": "the English translation or original text"
}

Text to analyze: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Parse JSON response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      console.log(`🤖 Gemini fallback translation successful - Language: ${parsed.detectedLanguage}, English: ${parsed.isEnglish}`);
      
      return {
        translatedText: parsed.translatedText,
        sourceLang: parsed.detectedLanguage
      };
      
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response JSON:', parseError.message);
      
      // Fallback: Try to extract translation directly
      const simplePrompt = `Translate the following text to English if it's not already in English. If it's already in English, return it unchanged: "${text}"`;
      const simpleResult = await model.generateContent(simplePrompt);
      const simpleResponse = simpleResult.response.text();
      
      return {
        translatedText: simpleResponse.trim(),
        sourceLang: 'unknown'
      };
    }
    
  } catch (error) {
    console.error('❌ Gemini translation fallback failed:', error.message);
    throw error;
  }
}

/**
 * Gemini fallback translation back to user language
 * @param {string} text - English text to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<string>}
 */
async function geminiTranslateBack(text, targetLang) {
  try {
    const model = getGeminiModel('gemini-2.0-flash-exp');
    
    const prompt = `Translate the following English text to ${targetLang}. Maintain the tone, emotion, and meaning as accurately as possible:

"${text}"

Respond with ONLY the translated text, no additional comments or formatting.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim();
    
    console.log(`🤖 Gemini back-translation successful to ${targetLang}`);
    return translatedText;
    
  } catch (error) {
    console.error('❌ Gemini back-translation failed:', error.message);
    throw error;
  }
}

/**
 * Translate Hinglish (romanized Hindi) to English using Gemini
 * @param {string} text - Hinglish text to translate
 * @returns {Promise<{translatedText: string}>}
 */
async function geminiTranslateHinglish(text) {
  try {
    const model = getGeminiModel('gemini-2.0-flash-exp');
    
    const prompt = `You are a Hinglish (Romanized Hindi + English mix) to English translator.

The following text is in Hinglish - a mix of Hindi words written in Roman script and English. Please translate it to proper English while preserving the meaning, tone, and emotion.

Hinglish text: "${text}"

Respond with ONLY the English translation, no additional comments.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim();
    
    console.log(`🤖 Gemini Hinglish→English translation: "${translatedText}"`);
    return { translatedText };
    
  } catch (error) {
    console.error('❌ Gemini Hinglish translation failed:', error.message);
    throw error;
  }
}

/**
 * Translate English to Hinglish (romanized Hindi) using Gemini
 * @param {string} text - English text to translate
 * @returns {Promise<string>}
 */
async function geminiTranslateToHinglish(text) {
  try {
    const model = getGeminiModel('gemini-2.0-flash-exp');
    
    const prompt = `You are an English to Hinglish translator. Hinglish is a natural mix of Hindi and English where Hindi words are written in Roman script (Latin alphabet).

Translate the following English text to Hinglish. Use a conversational, natural style that Indians commonly use in daily chat:
- Mix Hindi and English words naturally
- Write Hindi words in Roman script (like "kaise ho", "theek hai", "main", "kya")
- Keep some English words as-is when commonly used in Hinglish
- Maintain the emotion and tone

English text: "${text}"

Respond with ONLY the Hinglish translation in Roman script, no additional comments.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const hinglishText = response.text().trim();
    
    console.log(`🤖 Gemini English→Hinglish translation: "${hinglishText}"`);
    return hinglishText;
    
  } catch (error) {
    console.error('❌ Gemini Hinglish translation failed:', error.message);
    throw error;
  }
}

/**
 * Get language name from language code for user-friendly display
 * @param {string} langCode - Language code (e.g., 'hi', 'es', 'fr')
 * @returns {string} - Human-readable language name
 */
export function getLanguageName(langCode) {
  const languageNames = {
    'hi': 'Hindi',
    'hi-Latn': 'Hinglish',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'en': 'English',
    'unknown': 'Unknown'
  };
  
  return languageNames[langCode] || langCode || 'Unknown';
}

/**
 * Check if a language is supported for translation
 * @param {string} langCode - Language code to check
 * @returns {boolean} - Whether the language is supported
 */
export function isLanguageSupported(langCode) {
  // Google Translate supports 100+ languages, but we'll list common ones
  const supportedLanguages = [
    'hi', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar',
    'bn', 'te', 'ta', 'mr', 'gu', 'ur', 'kn', 'ml', 'pa', 'or',
    'nl', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro',
    'bg', 'hr', 'sl', 'et', 'lv', 'lt', 'mt', 'ga', 'cy', 'is',
    'th', 'vi', 'id', 'ms', 'tl', 'tr', 'he', 'fa', 'sw', 'am'
  ];
  
  return supportedLanguages.includes(langCode);
}