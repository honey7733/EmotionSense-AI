/**
 * Voice Service Module
 * Handles speech-to-text, audio feature extraction, and voice emotion detection
 * 
 * This module:
 * 1. Converts speech to text using Groq Whisper API (cloud)
 * 2. Extracts audio features (MFCC, pitch, energy)
 * 3. Detects emotions from voice using Wav2Vec2 model
 * 4. Returns emotion labels with confidence scores
 */

import axios from 'axios';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import config from '../config/index.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Initialize Groq client
const groq = new Groq({
  apiKey: config.stt.groq.apiKey
});

/**
 * Convert audio file to WAV format for better compatibility with Groq
 * Converts WebM, MP3, OGG, etc. to WAV
 */
const convertToWav = async (inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.wav');
    
    console.log(`🎵 Converting audio to WAV format...`);
    console.log(`   Input: ${inputPath}`);
    console.log(`   Output: ${outputPath}`);
    
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioFrequency(16000) // Standard sample rate for speech recognition
      .audioChannels(1) // Mono
      .on('end', () => {
        console.log(`✅ Audio converted to WAV successfully`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`❌ FFmpeg conversion error:`, err.message);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Speech-to-Text using Groq Whisper API
 * Supports multiple languages including English and Hindi
 */
export const speechToTextGroq = async (audioPath) => {
  console.log(`🎙️ Converting speech to text using Groq Whisper...`);
  
  let wavPath = audioPath;
  let tempWavFile = null;
  
  try {
    // Check if API key is configured
    if (!config.stt.groq.apiKey || config.stt.groq.apiKey === 'your_groq_api_key_here') {
      throw new Error('Groq API key not configured. Please set GROQ_API_KEY in .env file');
    }

    // Validate that audio file exists and has content
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    
    const fileStats = fs.statSync(audioPath);
    if (fileStats.size === 0) {
      throw new Error(`Audio file is empty (0 bytes): ${audioPath}`);
    }
    console.log(`📁 Audio file size: ${fileStats.size} bytes`);

    // Convert WebM or other formats to WAV for better Groq compatibility
    if (audioPath.toLowerCase().endsWith('.webm') || 
        audioPath.toLowerCase().endsWith('.mp3') ||
        audioPath.toLowerCase().endsWith('.ogg')) {
      console.log(`🔄 Converting audio format to WAV for Groq compatibility...`);
      tempWavFile = audioPath.replace(/\.[^.]+$/, '_converted.wav');
      wavPath = await convertToWav(audioPath);
      
      // Verify conversion result
      if (!fs.existsSync(wavPath)) {
        throw new Error(`WAV conversion failed: output file not created`);
      }
      const wavStats = fs.statSync(wavPath);
      console.log(`✅ WAV file created: ${wavStats.size} bytes`);
    }

    // Create transcription with auto language detection
    console.log(`🌐 Calling Groq API with model: ${config.stt.groq.model}`);
    console.log(`🌐 Language detection: ${config.stt.groq.language ? config.stt.groq.language : 'AUTO-DETECT (All languages)'}`);
    
    // Build transcription options - only include language if explicitly set
    const transcriptionOptions = {
      file: fs.createReadStream(wavPath),
      model: config.stt.groq.model,
      temperature: config.stt.groq.temperature,
      response_format: config.stt.groq.responseFormat,
      timestamp_granularities: ["word", "segment"]
    };
    
    // Only add language parameter if explicitly configured (otherwise Whisper auto-detects)
    if (config.stt.groq.language) {
      transcriptionOptions.language = config.stt.groq.language;
    }
    
    const transcription = await groq.audio.transcriptions.create(transcriptionOptions);

    // Extract transcript text
    const transcript = transcription.text || '';
    
    // Calculate confidence (Groq doesn't provide confidence directly, use segment data if available)
    let confidence = 0.9; // Default high confidence for Groq Whisper
    if (transcription.segments && transcription.segments.length > 0) {
      // Average the confidence from segments if available
      const avgConfidence = transcription.segments.reduce((sum, seg) => {
        return sum + (seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.9);
      }, 0) / transcription.segments.length;
      confidence = avgConfidence;
    }

    // Get detected language from Whisper response
    const detectedLanguage = transcription.language || config.stt.groq.language || 'en';
    
    console.log(`✅ Groq transcription: "${transcript}"`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`   Detected Language: ${detectedLanguage} (auto-detected by Whisper)`);

    return {
      transcript: transcript.trim(),
      confidence: confidence,
      provider: 'groq',
      model: config.stt.groq.model,
      language: detectedLanguage, // Language auto-detected by Whisper
      duration: transcription.duration,
      segments: transcription.segments || [],
      words: transcription.words || []
    };

  } catch (error) {
    console.error('❌ Groq STT Error:', error.message);
    console.error('   Stack:', error.stack);
    
    // Return empty transcript on error
    return {
      transcript: "",
      confidence: 0,
      provider: 'groq',
      error: error.message
    };
  } finally {
    // Clean up temporary WAV file if it was created
    if (tempWavFile && fs.existsSync(tempWavFile)) {
      try {
        fs.unlinkSync(tempWavFile);
        console.log(`🧹 Cleaned up temporary WAV file`);
      } catch (err) {
        console.warn(`⚠️ Failed to clean up temp file: ${err.message}`);
      }
    }
  }
};

// Legacy Vosk function - removed
const tryVoskModelWithPython_REMOVED = async (modelConfig, audioPath) => {
  // This function has been removed - now using Groq API
  return null;
};

// Legacy Vosk conversion - removed
const convertToWav_REMOVED = async (inputPath) => {
  // This function has been removed - Groq accepts various formats
  return inputPath;
};

/**
 * Extract audio features (MFCC, pitch, energy)
 * TODO: Implement actual audio feature extraction
 * This would typically use Librosa (Python) or meyda/web-audio-api (JS)
 */
export const extractAudioFeatures = async (audioPath) => {
  console.log(`🎵 Extracting audio features...`);
  
  // TODO: Implement actual feature extraction
  // Options:
  // 1. Call Python microservice running Librosa
  // 2. Use Node.js audio libraries like meyda, node-pitch, etc.
  
  // Placeholder return with typical features
  return {
    mfcc: [0.1, 0.2, 0.3, 0.4, 0.5], // Mel-frequency cepstral coefficients
    pitch: {
      mean: 150.5,
      std: 25.3,
      min: 100,
      max: 200
    },
    energy: {
      mean: 0.65,
      std: 0.15
    },
    zeroCrossingRate: 0.08,
    spectralCentroid: 2500.0,
    duration: 3.5 // seconds
  };
};

/**
 * Detect emotion from voice using HuggingFace prithivMLmods model
 * Runs locally via Python with transformers library
 */
export const detectEmotionFromVoice = async (audioPath) => {
  return new Promise((resolve) => {
    try {
      const model = config.huggingface.voiceEmotionModel;
      const scriptPath = path.resolve('./src/voice-service/huggingface_emotion.py');

      if (!fs.existsSync(scriptPath)) {
        console.warn(`⚠️  HuggingFace Python script not found at: ${scriptPath}`);
        resolve({ emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, useFallback: true });
        return;
      }

      console.log(`🧠 Running HuggingFace local model inference...`);
      console.log(`   Model: ${model}`);

      // Use full Python path to ensure correct environment
      const pythonPath = process.platform === 'win32' 
        ? 'C:\\Users\\ayush\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
        : 'python3';
      
      const python = spawn(pythonPath, [scriptPath, model, audioPath], {
        cwd: path.resolve('./'),
        env: { ...process.env }
      });
      
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        try {
          if (code === 0 && output) {
            const result = JSON.parse(output.trim());
            if (result.success) {
              console.log(`✅ HuggingFace detected: ${result.emotion} (${(result.confidence * 100).toFixed(1)}%)`);
              resolve({
                emotion: result.emotion,
                confidence: result.confidence,
                scores: result.scores,
                model: 'huggingface'
              });
              return;
            } else {
              console.warn(`⚠️  HuggingFace model error: ${result.error}`);
            }
          }
          
          // Failed - return fallback marker
          console.warn(`⚠️  HuggingFace model failed, will use fallback`);
          if (errorOutput) {
            const errLines = errorOutput.split('\n').filter(line => 
              !line.includes('Xet Storage') && 
              !line.includes('hf_xet') &&
              line.trim().length > 0
            ).join('\n');
            if (errLines) console.warn(`   Python stderr: ${errLines.substring(0, 500)}`);
          }
          resolve({ emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, useFallback: true });
        } catch (e) {
          console.warn(`⚠️  HuggingFace parsing error: ${e.message}`);
          resolve({ emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, useFallback: true });
        }
      });

      // Timeout after 180 seconds (model download can take time first run)
      setTimeout(() => {
        python.kill();
        console.warn(`⚠️  HuggingFace model timeout (3 minutes exceeded)`);
        resolve({ emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, useFallback: true });
      }, 180000);

    } catch (error) {
      console.warn(`⚠️  HuggingFace model error: ${error.message}`);
      resolve({ emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, useFallback: true });
    }
  });
};

/**
 * Detect emotion using custom .h5 BiLSTM model
 * Runs Python inference script with TensorFlow/Keras model
 */
export const detectEmotionCustomModel = async (audioPath) => {
  return new Promise((resolve) => {
    try {
      if (!config.customVoiceModel.enabled) {
        console.log(`⚠️  Custom model disabled in config`);
        resolve(null);
        return;
      }

      const modelPath = path.resolve(config.customVoiceModel.modelPath);
      const scriptPath = path.resolve(config.customVoiceModel.scriptPath);
      const emotionLabels = config.customVoiceModel.emotionLabels.join(',');

      if (!fs.existsSync(modelPath)) {
        console.warn(`⚠️  Custom model not found at: ${modelPath}`);
        resolve(null);
        return;
      }

      if (!fs.existsSync(scriptPath)) {
        console.warn(`⚠️  Python inference script not found at: ${scriptPath}`);
        resolve(null);
        return;
      }

      console.log(`🤖 Running custom BiLSTM model inference...`);

      // Use full Python path to ensure correct environment
      const pythonPath = process.platform === 'win32' 
        ? 'C:\\Users\\ayush\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
        : 'python3';
      
      const python = spawn(pythonPath, [scriptPath, modelPath, audioPath, emotionLabels], {
        cwd: path.resolve('./'),
        env: { ...process.env }
      });
      
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        try {
          if (code === 0 && output) {
            const result = JSON.parse(output.trim());
            if (result.success) {
              console.log(`✅ Custom model detected: ${result.emotion} (${(result.confidence * 100).toFixed(1)}%)`);
              resolve({
                emotion: result.emotion,
                confidence: result.confidence,
                scores: result.scores,
                model: 'custom-bilstm'
              });
              return;
            } else {
              console.warn(`⚠️  Custom model error: ${result.error}`);
            }
          }
          resolve(null);
        } catch (e) {
          console.warn(`⚠️  Custom model parsing error: ${e.message}`);
          if (errorOutput) {
            const errLines = errorOutput.split('\n').slice(0, 5).join('\n');
            if (errLines) console.warn(`   Python stderr: ${errLines}`);
          }
          resolve(null);
        }
      });

      // Timeout after 45 seconds (increased for model loading)
      setTimeout(() => {
        python.kill();
        console.warn(`⚠️  Custom model timeout (45 seconds exceeded)`);
        resolve(null);
      }, 45000);

    } catch (error) {
      console.warn(`⚠️  Custom model error: ${error.message}`);
      resolve(null);
    }
  });
};

/**
 * Combine emotions from multiple models
 * Supports: averaging, voting, weighted average
 */
const combineEmotions = (results) => {
  // Filter valid results
  const validResults = results.filter(r => r && r.emotion && r.confidence > 0);
  
  if (validResults.length === 0) {
    return { emotion: 'neutral', confidence: 0.5, scores: { neutral: 0.5 }, method: 'default' };
  }
  
  if (validResults.length === 1) {
    return { ...validResults[0], method: validResults[0].model || 'single-model' };
  }

  // Weighted average approach
  console.log(`🔀 Combining ${validResults.length} emotion predictions...`);
  
  // Get all unique emotion labels
  const allEmotions = new Set();
  validResults.forEach(result => {
    Object.keys(result.scores || {}).forEach(emotion => allEmotions.add(emotion));
    allEmotions.add(result.emotion);
  });

  // Calculate weighted scores
  const combinedScores = {};
  const totalWeight = validResults.reduce((sum, r) => sum + r.confidence, 0);
  
  allEmotions.forEach(emotion => {
    let weightedSum = 0;
    validResults.forEach(result => {
      const score = result.scores && result.scores[emotion] ? result.scores[emotion] : 
                    (result.emotion === emotion ? result.confidence : 0);
      const weight = result.confidence / totalWeight;
      weightedSum += score * weight;
    });
    combinedScores[emotion] = weightedSum;
  });

  // Find dominant emotion
  let maxEmotion = 'neutral';
  let maxScore = 0;
  Object.entries(combinedScores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion;
    }
  });

  console.log(`✅ Combined result: ${maxEmotion} (${(maxScore * 100).toFixed(1)}%)`);
  console.log(`   Models used: ${validResults.map(r => r.model).join(' + ')}`);

  return {
    emotion: maxEmotion,
    confidence: maxScore,
    scores: combinedScores,
    method: 'combined-weighted',
    modelsUsed: validResults.map(r => r.model)
  };
};

/**
 * Main function: Analyze voice emotion with multi-model approach
 * Flow: Groq Whisper → Text Emotion (BiLSTM + HuggingFace) → Voice Emotion (HuggingFace)
 */
export const analyzeVoiceEmotion = async (audioPath) => {
  console.log(`🎤 Analyzing voice emotion from: ${audioPath}`);
  
  // Step 1: Speech-to-Text using Groq Whisper API
  let transcriptResult;
  try {
    transcriptResult = await speechToTextGroq(audioPath);
    console.log(`✅ Transcript: "${transcriptResult.transcript}"`);
  } catch (error) {
    console.error(`❌ STT Error:`, error.message);
    transcriptResult = { 
      transcript: "", 
      confidence: 0,
      error: error.message
    };
  }
  
  // Step 2: Extract audio features
  const audioFeatures = await extractAudioFeatures(audioPath);
  console.log(`✅ Audio features extracted`);
  
  // Step 3: Analyze text emotion from transcript (BiLSTM + HuggingFace)
  let textEmotionResult = null;
  if (transcriptResult.transcript && transcriptResult.transcript.length > 0) {
    try {
      console.log(`📝 Analyzing text emotion from transcript using BiLSTM + HuggingFace...`);
      const { analyzeTextEmotion } = await import('../text-service/index.js');
      textEmotionResult = await analyzeTextEmotion(transcriptResult.transcript);
      console.log(`✅ Text emotion: ${textEmotionResult.emotion} (confidence: ${textEmotionResult.confidence.toFixed(2)})`);
      if (textEmotionResult.models_used) {
        console.log(`   Models used: ${textEmotionResult.models_used.join(' + ')}`);
      }
    } catch (textError) {
      console.error(`❌ Text emotion analysis failed:`, textError.message);
      textEmotionResult = null;
    }
  }
  
  // Step 4: Attempt voice emotion detection with HuggingFace model
  console.log(`🎙️ Attempting voice emotion detection...`);
  
  const huggingfaceResult = await detectEmotionFromVoice(audioPath).catch(err => {
    console.warn(`⚠️  HuggingFace voice model failed: ${err.message}`);
    return null;
  });

  // Step 5: Combine text and voice emotion results
  let emotionResult;
  const validResults = [];
  
  // Add text emotion result if available
  if (textEmotionResult && textEmotionResult.confidence > 0.3) {
    validResults.push({ 
      emotion: textEmotionResult.emotion,
      confidence: textEmotionResult.confidence,
      scores: textEmotionResult.scores,
      model: 'text-emotion-dual',
      source: 'transcript'
    });
  }
  
  // Add voice emotion result if available
  if (huggingfaceResult && !huggingfaceResult.useFallback && huggingfaceResult.confidence > 0.3) {
    validResults.push({ 
      ...huggingfaceResult, 
      model: 'huggingface-voice',
      source: 'audio'
    });
  }

  // Combine results
  if (validResults.length > 0) {
    // We have at least one result - combine them
    emotionResult = combineEmotions(validResults);
    console.log(`✅ Final emotion result: ${emotionResult.emotion} (confidence: ${emotionResult.confidence.toFixed(2)})`);
    console.log(`   Combined from: ${validResults.map(r => r.source).join(' + ')}`);
  } else {
    // No valid results
    console.warn(`⚠️  No emotion detection method succeeded, using neutral`);
    emotionResult = { 
      emotion: 'neutral', 
      confidence: 0.5, 
      scores: { neutral: 0.5 }, 
      method: 'default',
      modelsUsed: []
    };
  }
  
  return {
    transcript: transcriptResult.transcript,
    transcriptConfidence: transcriptResult.confidence,
    sttProvider: 'groq',
    sttModel: transcriptResult.model || 'whisper-large-v3-turbo',
    sttLanguage: transcriptResult.language,
    sttDuration: transcriptResult.duration,
    
    // Text emotion analysis results
    textEmotion: textEmotionResult ? {
      emotion: textEmotionResult.emotion,
      confidence: textEmotionResult.confidence,
      scores: textEmotionResult.scores,
      models_used: textEmotionResult.models_used,
      combination_strategy: textEmotionResult.combination_strategy,
      individual_results: textEmotionResult.individual_results
    } : null,
    
    // Voice emotion analysis results
    voiceEmotion: huggingfaceResult && !huggingfaceResult.useFallback ? {
      emotion: huggingfaceResult.emotion,
      confidence: huggingfaceResult.confidence,
      scores: huggingfaceResult.scores,
      model: 'huggingface-voice'
    } : null,
    
    // Combined final emotion
    emotion: emotionResult.emotion,
    confidence: emotionResult.confidence,
    scores: emotionResult.scores,
    audioFeatures: audioFeatures,
    emotionMethod: emotionResult.method,
    modelsUsed: emotionResult.modelsUsed
  };
};
