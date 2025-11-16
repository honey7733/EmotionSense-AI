# Voice Service Module

## Overview
This module handles voice-based emotion detection through speech-to-text conversion, audio feature extraction, and emotion classification using **Vosk** for offline speech recognition.

## Features
- **Speech-to-Text** using Vosk (offline, no API required)
- **Audio feature extraction** (MFCC, pitch, energy, spectral features)
- **Voice emotion detection** using Wav2Vec2 model via HuggingFace
- **Fully offline STT** - works without internet for transcription
- Support for multiple audio formats

## Audio Processing Pipeline
1. **Speech-to-Text**: Converts audio to transcript
2. **Feature Extraction**: Extracts acoustic features
3. **Emotion Detection**: Classifies emotion from audio

## Supported Audio Formats
- WAV (recommended)
- MP3
- OGG
- WebM

## Extracted Audio Features
- **MFCC**: Mel-frequency cepstral coefficients
- **Pitch**: Mean, std, min, max
- **Energy**: Mean, std
- **Zero Crossing Rate**: Speech/noise detection
- **Spectral Centroid**: Brightness measure
- **Duration**: Audio length

## Usage

```javascript
import { analyzeVoiceEmotion } from './voice-service/index.js';

const result = await analyzeVoiceEmotion('/path/to/audio.wav');
console.log(result);
// Output:
// {
//   transcript: "I'm feeling really happy",
//   emotion: "happy",
//   confidence: 0.87,
//   audioFeatures: { ... }
// }
```

## Configuration
Set the following in `.env`:
- `STT_PROVIDER`: 'vosk' (recommended)
- `VOSK_MODEL_PATH`: Path to downloaded Vosk model
- `VOSK_SAMPLE_RATE`: Audio sample rate (default: 16000)
- `VOSK_MODEL_PATH`: Path to Vosk model (if using Vosk)
- `HUGGINGFACE_API_KEY`: For voice emotion detection
- `VOICE_EMOTION_MODEL`: Model to use (default: ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition)

## Vosk Setup

### Download Vosk Model
1. Visit: https://alphacephei.com/vosk/models
2. Download a model (recommended: `vosk-model-small-en-us-0.15` - 40MB)
3. Extract to `./models/vosk-model-small-en-us-0.15`
4. Update `VOSK_MODEL_PATH` in `.env`

### Recommended Models
- **Small English** (40 MB): vosk-model-small-en-us-0.15
- **Large English** (1.8 GB): vosk-model-en-us-0.22
- **Other languages**: Check Vosk models page

## Implementation Notes
- Maximum audio file size: 10MB (configurable)
- Vosk works completely offline - no API calls for STT
- Emotion detection still uses HuggingFace API
- For production, ensure Vosk model is downloaded and configured
