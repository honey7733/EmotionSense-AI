/**
 * Voice Helper Module
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS) operations
 * 
 * Features:
 * 1. Google STT API fallback (when Web Speech API is unavailable)
 * 2. Google TTS API for converting text to speech
 * 3. Audio URL generation and management
 * 4. Error handling and graceful fallbacks
 */

import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Speech-to-Text using Google Cloud Speech API
 * This is a fallback when Web Speech API is unavailable or fails
 * 
 * @param {Buffer} audioBuffer - Audio file buffer (WAV, MP3, OGG, WEBM)
 * @param {string} languageCode - Language code (e.g., 'en-US', 'es-ES', 'fr-FR')
 * @returns {Promise<{text: string, confidence: number, language: string}>}
 */
export async function googleSTT(audioBuffer, languageCode = 'en-US') {
  try {
    console.log(`🎤 Processing audio with Google STT (${languageCode})...`);

    // Note: Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or GOOGLE_STT_API_KEY set in .env
    const apiKey = config.googleCloud?.sttApiKey || process.env.GOOGLE_STT_API_KEY;

    if (!apiKey) {
      throw new Error('Google STT API key not configured. Set GOOGLE_STT_API_KEY in .env');
    }

    // Convert audio buffer to base64
    const audioBase64 = audioBuffer.toString('base64');

    // Call Google Speech-to-Text API
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        config: {
          encoding: 'LINEAR16',
          languageCode: languageCode,
          maxAlternatives: 1,
          enableAutomaticPunctuation: true,
          model: 'latest_long',
        },
        audio: {
          content: audioBase64,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('No transcription results from Google STT');
    }

    const firstResult = response.data.results[0];
    const firstAlternative = firstResult.alternatives[0];
    const transcript = firstAlternative.transcript;
    const confidence = firstAlternative.confidence || 0;

    console.log(`✅ STT transcription: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

    return {
      text: transcript,
      confidence: confidence,
      language: languageCode,
      provider: 'google',
    };
  } catch (error) {
    console.error('❌ Google STT failed:', error.message);
    throw error;
  }
}

/**
 * Text-to-Speech using Google Cloud TTS API
 * Converts text response to audio with natural voice
 * 
 * @param {string} text - Text to convert to speech
 * @param {string} languageCode - Language code (e.g., 'en-US', 'es-ES', 'fr-FR')
 * @param {string} voiceName - Voice name (e.g., 'en-US-Neural2-C', 'en-US-Neural2-A')
 * @returns {Promise<{audioUrl: string, audioData: Buffer, duration: number}>}
 */
export async function googleTTS(
  text,
  languageCode = 'en-US',
  voiceName = 'en-US-Neural2-C'
) {
  try {
    console.log(`🔊 Converting text to speech with Google TTS (${languageCode})...`);

    const apiKey = config.googleCloud?.ttsApiKey || process.env.GOOGLE_TTS_API_KEY;

    if (!apiKey) {
      throw new Error('Google TTS API key not configured. Set GOOGLE_TTS_API_KEY in .env');
    }

    // Call Google Text-to-Speech API
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: {
          text: text,
        },
        voice: {
          languageCode: languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data.audioContent) {
      throw new Error('No audio content in TTS response');
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(response.data.audioContent, 'base64');

    // Save audio to temporary file
    const audioFileName = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`;
    const audioPath = path.join(__dirname, '../../temp/audio', audioFileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(audioPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(audioPath, audioBuffer);

    // Generate public URL (you'll need to configure this based on your deployment)
    const audioUrl = `${process.env.API_BASE_URL || 'http://localhost:8080'}/audio/${audioFileName}`;

    console.log(`✅ TTS conversion complete: ${audioFileName}`);

    return {
      audioUrl: audioUrl,
      audioData: audioBuffer,
      duration: await getAudioDuration(audioPath),
      provider: 'google',
      fileName: audioFileName,
    };
  } catch (error) {
    console.error('❌ Google TTS failed:', error.message);
    throw error;
  }
}

/**
 * Text-to-Speech using Piper (Offline, Fast)
 * Fallback method when Google TTS is unavailable
 * 
 * @param {string} text - Text to convert to speech
 * @returns {Promise<{audioUrl: string, audioData: Buffer, duration: number}>}
 */
export async function piperTTS(text) {
  return new Promise((resolve, reject) => {
    console.log(`🔊 Converting text to speech using Piper TTS (offline)...`);

    const outputPath = path.join(
      __dirname,
      '../../temp/audio',
      `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.wav`
    );

    // Ensure temp directory exists
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Try to find piper executable
    let piperCmd = 'piper';
    const localPiperWindows = path.join(process.cwd(), 'piper.exe');
    const localPiperUnix = path.join(process.cwd(), 'piper', 'piper');

    if (fs.existsSync(localPiperWindows)) {
      piperCmd = localPiperWindows;
    } else if (fs.existsSync(localPiperUnix)) {
      piperCmd = localPiperUnix;
    }

    // Spawn Piper process
    const speakerId = config.tts?.piper?.speakerId || 0;
    const modelPath = config.tts?.piper?.modelPath || config.tts?.piperModelPath || './models/piper/en_US-lessac-medium.onnx';
    const configPath = config.tts?.piper?.configPath || config.tts?.piperConfigPath || './models/piper/en_US-lessac-medium.onnx.json';
    
    const piper = spawn(piperCmd, [
      '--model',
      modelPath,
      '--config',
      configPath,
      '--output_file',
      outputPath,
      '--speaker',
      String(speakerId),
    ]);

    // Send text to stdin
    piper.stdin.write(text);
    piper.stdin.end();

    let stderr = '';

    piper.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    piper.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Piper CLI exited with code ${code}: ${stderr}`
          )
        );
        return;
      }

      try {
        // Read generated audio file
        const audioBuffer = fs.readFileSync(outputPath);

        // Generate public URL
        const fileName = path.basename(outputPath);
        const audioUrl = `${process.env.API_BASE_URL || 'http://localhost:8080'}/audio/${fileName}`;

        console.log(`✅ Piper TTS conversion complete: ${fileName}`);

        // Clean up after sending response (async, don't wait)
        setTimeout(() => {
          try {
            fs.unlinkSync(outputPath);
          } catch (e) {
            console.warn(`⚠️ Failed to clean up temp file: ${outputPath}`);
          }
        }, 5000);

        resolve({
          audioUrl: audioUrl,
          audioData: audioBuffer,
          duration: 0, // Piper doesn't provide duration, we'd need ffprobe
          provider: 'piper',
          fileName: fileName,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get audio duration using FFmpeg
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    try {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1:noprint_wrappers=1',
        audioPath,
      ]);

      let output = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.warn(`⚠️ Failed to get audio duration, returning 0`);
          resolve(0);
          return;
        }

        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : Math.round(duration * 1000) / 1000);
      });
    } catch (error) {
      console.warn(`⚠️ FFprobe not available, skipping duration calculation`);
      resolve(0);
    }
  });
}

/**
 * Convert speech to text with fallback chain
 * Primary: Use backend Google STT
 * Fallback: Return error for frontend to use Web Speech API
 * 
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} language - Language code
 * @returns {Promise<{text: string, confidence: number}>}
 */
export async function speechToText(audioBuffer, language = 'en-US') {
  try {
    // Primary: Google STT
    return await googleSTT(audioBuffer, language);
  } catch (googleError) {
    console.warn('⚠️ Google STT failed, frontend should use Web Speech API:', googleError.message);
    throw {
      fallbackToWebSpeech: true,
      error: googleError.message,
      message:
        'Google STT unavailable. Please enable Web Speech API in browser or configure Google Cloud credentials.',
    };
  }
}

/**
 * Convert text to speech with fallback chain
 * Primary: Google TTS (natural, high-quality)
 * Fallback: Piper TTS (fast, offline)
 * 
 * @param {string} text - Text to convert
 * @param {string} language - Language code
 * @returns {Promise<{audioUrl: string, audioData: Buffer, duration: number}>}
 */
export async function textToSpeech(text, language = 'en-US') {
  try {
    // Import the updated TTS service
    const { generateSpeech } = await import('../tts-service/index.js');
    
    console.log(`🔊 Converting text to speech using TTS service (language: ${language})...`);
    // Pass language to TTS service for multi-language support
    const result = await generateSpeech(text, null, language);
    
    if (!result || !result.audioData) {
      throw new Error('TTS service returned no audio');
    }
    
    // Save audio to file and generate URL
    const audioBuffer = Buffer.from(result.audioData, 'base64');
    const fileName = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${result.format || 'mp3'}`;
    const outputPath = path.join(__dirname, '../../temp/audio', fileName);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write audio file
    fs.writeFileSync(outputPath, audioBuffer);
    
    // Generate public URL
    const audioUrl = `${process.env.API_BASE_URL || 'http://localhost:8080'}/audio/${fileName}`;
    
    console.log(`✅ TTS conversion complete: ${audioUrl} (${result.provider})`);
    
    return {
      audioUrl: audioUrl,
      audioData: audioBuffer,
      duration: result.duration,
      provider: result.provider,
      format: result.format
    };
  } catch (error) {
    console.error('❌ TTS service failed:', error.message);
    throw error;
  }
}

/**
 * Process voice message: STT -> Translation -> LLM -> TTS
 * This is the main entry point for voice chat
 * 
 * @param {Buffer} audioBuffer - Audio file buffer from frontend
 * @param {string} userId - User ID
 * @param {string} language - Detected language or user language preference
 * @returns {Promise<{transcript: string, response: string, audioUrl: string, emotion: string}>}
 */
export async function processVoiceMessage(audioBuffer, userId, language = 'en-US') {
  try {
    console.log(`🎙️ Processing voice message for user: ${userId}`);

    // Step 1: Convert speech to text (STT)
    console.log(`📝 Converting speech to text...`);
    const sttResult = await speechToText(audioBuffer, language);

    console.log(`✅ Transcribed: "${sttResult.text}"`);

    // Return both transcript and audio buffer for further processing
    return {
      transcript: sttResult.text,
      confidence: sttResult.confidence,
      language: sttResult.language,
      audioBuffer: audioBuffer,
    };
  } catch (error) {
    console.error('❌ Voice message processing failed:', error);
    throw error;
  }
}

/**
 * Stream audio response to frontend
 * Can be used for real-time audio streaming or batch download
 * 
 * @param {string} audioUrl - URL to audio file
 * @param {Buffer} audioData - Audio buffer (optional, for direct streaming)
 * @returns {object} Stream configuration for Express response
 */
export function streamAudioResponse(audioUrl, audioData = null) {
  return {
    audioUrl,
    audioData,
    mimeType: audioUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
  };
}

/**
 * List all temporary audio files (for cleanup)
 * @returns {Promise<string[]>} Array of audio file paths
 */
export async function listTempAudioFiles() {
  try {
    const tempAudioDir = path.join(__dirname, '../../temp/audio');
    if (!fs.existsSync(tempAudioDir)) {
      return [];
    }

    const files = fs.readdirSync(tempAudioDir);
    return files.map((file) => path.join(tempAudioDir, file));
  } catch (error) {
    console.error('❌ Failed to list audio files:', error.message);
    return [];
  }
}

/**
 * Clean up old temporary audio files (older than maxAgeHours)
 * @param {number} maxAgeHours - Delete files older than this many hours (default: 24)
 * @returns {Promise<number>} Number of files deleted
 */
export async function cleanupOldAudioFiles(maxAgeHours = 24) {
  try {
    const audioFiles = await listTempAudioFiles();
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const filePath of audioFiles) {
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ Deleted old audio file: ${path.basename(filePath)}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleanup complete: deleted ${deletedCount} files`);
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return 0;
  }
}

export default {
  googleSTT,
  googleTTS,
  piperTTS,
  speechToText,
  textToSpeech,
  processVoiceMessage,
  streamAudioResponse,
  listTempAudioFiles,
  cleanupOldAudioFiles,
};
