# Text Service Module

## Overview
This module handles text-based emotion detection using state-of-the-art NLP models.

## Features
- Text preprocessing (cleaning, normalization)
- Tokenization
- Emotion detection using BERT/RoBERTa models
- Integration with HuggingFace Inference API
- Fallback to local model support

## Supported Emotions
The default model (j-hartmann/emotion-english-distilroberta-base) detects:
- joy
- sadness
- anger
- fear
- surprise
- disgust
- neutral

## Usage

```javascript
import { analyzeTextEmotion } from './text-service/index.js';

const result = await analyzeTextEmotion("I'm feeling really happy today!");
console.log(result);
// Output:
// {
//   emotion: "joy",
//   confidence: 0.95,
//   scores: { joy: 0.95, sadness: 0.02, ... }
// }
```

## Configuration
Set the following in `.env`:
- `HUGGINGFACE_API_KEY`: Your HuggingFace API key
- `TEXT_EMOTION_MODEL`: Model to use (default: j-hartmann/emotion-english-distilroberta-base)

## Implementation Notes
- Maximum text length: 512 characters (model limitation)
- API timeout: 30 seconds
- Fallback returns 'neutral' emotion if API fails
