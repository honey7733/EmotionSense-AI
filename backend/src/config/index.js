/**
 * Configuration Module
 * Centralizes all environment variables and configuration settings
 */

import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // Gemini API Configuration (Primary LLM)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY1 || process.env.GEMINI_API_KEY2, // Default to first key for backward compatibility
    apiKey1: process.env.GEMINI_API_KEY1,
    apiKey2: process.env.GEMINI_API_KEY2,
    models: [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ],
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 1024,
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
    topK: parseInt(process.env.GEMINI_TOP_K) || 40,
    topP: parseFloat(process.env.GEMINI_TOP_P) || 0.95
  },

  // LLaMA Configuration (Fallback LLM via Groq)
  llama: {
    provider: process.env.LLAMA_PROVIDER || 'groq',
    model: process.env.LLAMA_MODEL || 'llama-3.3-70b-versatile',
    enabled: process.env.LLAMA_ENABLED === 'true',
    maxTokens: parseInt(process.env.LLAMA_MAX_TOKENS) || 1024,
    temperature: parseFloat(process.env.LLAMA_TEMPERATURE) || 0.7,
    apiKey: process.env.GROQ_API_KEY // Reuse Groq API key
  },

  // Speech-to-Text Configuration (Groq - Cloud API)
  stt: {
    provider: process.env.STT_PROVIDER || 'groq',
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'whisper-large-v3-turbo' || 'whisper-large-v3',
      language: process.env.STT_LANGUAGE || undefined, // Set to undefined for auto-detect, or specify 'en', 'hi', etc.
      temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.0,
      responseFormat: process.env.GROQ_RESPONSE_FORMAT || 'verbose_json'
    }
  },

  // Text-to-Speech Configuration
  tts: {
    enabled: process.env.TTS_ENABLED !== 'false', // Enabled by default
    provider: process.env.TTS_PROVIDER || 'google', // Primary: Google (multilingual), Fallback: Piper
    google: {
      apiKey: process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY, // Google TTS API key
      voice: process.env.GOOGLE_TTS_VOICE || 'en-US-Neural2-C', // Neural2 voices for better quality
      languageCode: process.env.GOOGLE_TTS_LANGUAGE || 'en-US',
      audioEncoding: process.env.GOOGLE_TTS_AUDIO_ENCODING || 'MP3', // MP3, LINEAR16, OGG_OPUS
      speakingRate: parseFloat(process.env.GOOGLE_TTS_SPEED) || 1.0, // 0.25 to 4.0
      pitch: parseFloat(process.env.GOOGLE_TTS_PITCH) || 0.0 // -20.0 to 20.0
    },
    sarvam: {
      apiKey: process.env.SARVAM_API_KEY
    },
    murf: {
      apiKey: process.env.MURF_API_KEY,
      voiceId: process.env.MURF_VOICE_ID || 'Matthew',
      model: process.env.MURF_MODEL || 'FALCON',
      locale: process.env.MURF_LOCALE || 'en-US'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY, // OpenAI API key (if needed as fallback)
      model: process.env.TTS_MODEL || 'tts-1', // tts-1 (faster) or tts-1-hd (higher quality)
      voice: process.env.TTS_VOICE || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      speed: parseFloat(process.env.TTS_SPEED) || 1.0 // 0.25 to 4.0
    }
  },

  // HuggingFace API Configuration
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    textEmotionModel: process.env.TEXT_EMOTION_MODEL || 'michellejieli/emotion_text_classifier',
    voiceEmotionModel: process.env.VOICE_EMOTION_MODEL || 'superb/wav2vec2-base-superb-er',
    apiUrl: 'https://router.huggingface.co/hf-inference/models' // Updated to new endpoint
  },

  // BiLSTM ONNX Text Emotion Model Configuration
  // This is the PRIMARY emotion detection model using ONNX format for better performance
  bilstmTextModel: {
    enabled: process.env.BILSTM_TEXT_ENABLED !== 'false', // Enabled by default
    modelPath: process.env.BILSTM_MODEL_PATH || './src/models/emotion_bilstm_final.onnx',
    scriptPath: './src/text-service/bilstm_onnx_inference.py',
    emotionLabels: (process.env.BILSTM_LABELS || 'angry,disgust,fear,happy,neutral,sad').split(','), // 6 emotions (no surprise)
    confidenceThreshold: parseFloat(process.env.BILSTM_THRESHOLD) || 0.5,
    maxLength: parseInt(process.env.BILSTM_MAX_LENGTH) || 80
  },

  // Database Configuration
  database: {
    type: process.env.DATABASE_TYPE || 'supabase',
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    sqlite: {
      dbPath: process.env.SQLITE_DB_PATH || './data/emotions.db'
    }
  },

  // Storage Configuration
  storage: {
    tempAudioPath: process.env.TEMP_AUDIO_PATH || './temp/audio',
    maxAudioFileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE) || 10485760, // 10MB
    allowedAudioFormats: (process.env.ALLOWED_AUDIO_FORMATS || 'wav,mp3,ogg,webm').split(',')
  },

  // Multi-Modal Configuration
  multiModal: {
    fusionStrategy: process.env.EMOTION_FUSION_STRATEGY || 'weighted',
    textEmotionWeight: parseFloat(process.env.TEXT_EMOTION_WEIGHT) || 0.5,
    voiceEmotionWeight: parseFloat(process.env.VOICE_EMOTION_WEIGHT) || 0.5,
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.6
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production'
  },

  // Safety and Emergency Contact Settings
  safety: {
    enableEmergencyAlerts: process.env.ENABLE_EMERGENCY_ALERTS !== 'false', // Enabled by default
    highRiskKeywords: (process.env.HIGH_RISK_KEYWORDS || 'suicide,self-harm,harm myself,kill myself,end my life,hurt myself,suicidal').split(','),
    mediumRiskKeywords: (process.env.MEDIUM_RISK_KEYWORDS || 'worthless,burden,give up,no point,hopeless').split(',')
  },

  // Email Configuration (Nodemailer)
  email: {
    nodemailer: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: process.env.EMAIL_PROVIDER || null, // gmail, outlook, smtp, sendgrid
      gmail: {
        email: process.env.GMAIL_EMAIL,
        appPassword: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
      },
      outlook: {
        email: process.env.OUTLOOK_EMAIL,
        password: process.env.OUTLOOK_PASSWORD
      },
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        email: process.env.SMTP_EMAIL,
        password: process.env.SMTP_PASSWORD
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL
      }
    }
  },

  // Dashboard and analytics configuration
  dashboard: {
    dayStartHour: parseInt(process.env.DASHBOARD_DAY_START_HOUR || '5', 10),
    defaultWeekStart: process.env.DASHBOARD_WEEK_START || 'monday',
    maxTimelineDays: parseInt(process.env.DASHBOARD_MAX_TIMELINE_DAYS || '45', 10),
    generateStories: process.env.DASHBOARD_GENERATE_STORIES !== 'false',
    defaultLookbackDays: parseInt(process.env.DASHBOARD_LOOKBACK_DAYS || '3650', 10)
  }
};

/**
 * Validate required configuration
 */
export const validateConfig = () => {
  const requiredFields = [
    { key: 'gemini.apiKey', value: config.gemini.apiKey, name: 'GEMINI_API_KEY' }
  ];

  const missing = requiredFields.filter(field => !field.value);

  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing configuration values:');
    missing.forEach(field => {
      console.warn(`   - ${field.name}`);
    });
    console.warn('   Some features may not work correctly.');
  }
};

// Validate on import
validateConfig();

export default config;
