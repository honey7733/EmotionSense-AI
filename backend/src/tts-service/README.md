# Text-to-Speech (TTS) Service Module

## Overview
This module converts text responses from the LLM into natural-sounding speech audio using **Piper** for offline text-to-speech.

## TTS Provider: Piper

### Piper TTS (Fast, Local, Neural TTS)
- ✅ **Completely offline** - no internet required
- ✅ **Fast synthesis** - real-time speech generation
- ✅ **Neural voices** - natural-sounding quality
- ✅ **Privacy-friendly** - all processing local
- ✅ **Free and open-source** - Apache 2.0 license
- ✅ **Multiple voices** - 40+ languages, 100+ voices
- ✅ **Low resource usage** - runs on CPU efficiently

## Features
- Offline neural text-to-speech using Piper
- WAV audio output (PCM, 22050 Hz)
- Duration estimation
- Base64 audio encoding for API responses
- Multiple voice models support
- Fallback to CLI if Node.js binding fails

## Usage

```javascript
import { generateSpeech } from './tts-service/index.js';

const audio = await generateSpeech("Hello, how can I help you today?");
console.log(audio);
// Output:
// {
//   audioData: "base64_encoded_audio...",
//   format: "mp3",
//   duration: 2.5,
//   provider: "google"
// }
```

## Configuration

Set the following in `.env`:

```env
TTS_ENABLED=true
TTS_PROVIDER=piper
PIPER_MODEL_PATH=./models/piper/en_US-lessac-medium.onnx
PIPER_CONFIG_PATH=./models/piper/en_US-lessac-medium.onnx.json
PIPER_SPEAKER_ID=0
```

### Configuration Options

- `TTS_ENABLED`: Enable/disable TTS (true/false)
- `TTS_PROVIDER`: Set to 'piper' for offline TTS
- `PIPER_MODEL_PATH`: Path to Piper ONNX model file
- `PIPER_CONFIG_PATH`: Path to Piper config JSON file
- `PIPER_SPEAKER_ID`: Speaker ID for multi-speaker models (default: 0)

## Audio Output Format

- **WAV**: PCM audio, 22050 Hz sample rate
- **Encoding**: 16-bit PCM
- **Channels**: Mono
- **Quality**: Neural TTS, natural-sounding voices

## Piper Setup

### Step 1: Download Piper Model

Visit: https://github.com/rhasspy/piper/releases

**Recommended voices:**

1. **English (US) - Lessac (Medium)**
   - Size: ~60 MB
   - Files: `en_US-lessac-medium.onnx` + `.json`

2. **English (US) - Amy (Low, Faster)**
   - Size: ~20 MB
   - Files: `en_US-amy-low.onnx` + `.json`

### Step 2: Extract Models

```powershell
New-Item -ItemType Directory -Force -Path "./models/piper"
# Extract both .onnx and .onnx.json files here
```

### Step 3: Update .env

```env
PIPER_MODEL_PATH=./models/piper/en_US-lessac-medium.onnx
PIPER_CONFIG_PATH=./models/piper/en_US-lessac-medium.onnx.json
```

## Implementation Notes

- **Offline**: All processing happens locally
- **Fast**: Real-time synthesis on CPU
- **Base64**: Audio returned as base64 string
- **WAV Output**: 22050 Hz PCM audio
- **Fallback**: CLI fallback if Node.js binding fails

## Available Voices

Piper supports 100+ voices in 40+ languages.
Browse: https://rhasspy.github.io/piper-samples/

## Benefits Over Cloud TTS

| Feature | Piper | Google TTS |
|---------|-------|------------|
| **Cost** | Free | Pay per use |
| **Privacy** | Local | Cloud |
| **Internet** | Not needed | Required |
| **Latency** | Instant | Network delay |
