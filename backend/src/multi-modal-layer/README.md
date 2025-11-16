# Multi-Modal Emotion Layer Module

## Overview
This module combines emotion detection results from text and voice analysis to produce a more accurate and robust emotion classification.

## Fusion Strategies

### 1. Weighted Fusion (Default)
- Combines emotion scores using configurable weights
- Text weight: 0.5 (default)
- Voice weight: 0.5 (default)
- Best for balanced multi-modal input

### 2. Voting Fusion
- Takes majority vote between modalities
- Boosts confidence when modalities agree
- Reduces confidence when they disagree
- Best when you trust both modalities equally

### 3. Ensemble Fusion
- Advanced strategy combining weighted and voting
- Uses confidence thresholds to choose best method
- Handles low-confidence scenarios
- Best for production use

## Emotion Normalization
The module normalizes emotion labels to a standard set:
- happy (joy, excited)
- sad (sadness, depressed)
- angry (anger, frustrated)
- fear (fearful, anxious, anxiety)
- surprise (surprised)
- disgust (disgusted)
- neutral (calm)

## Usage

```javascript
import { fuseEmotions } from './multi-modal-layer/index.js';

const textResult = {
  emotion: "happy",
  confidence: 0.85,
  scores: { happy: 0.85, sad: 0.10, neutral: 0.05 }
};

const voiceResult = {
  emotion: "happy",
  confidence: 0.78,
  scores: { happy: 0.78, sad: 0.15, neutral: 0.07 }
};

const fused = fuseEmotions(textResult, voiceResult);
console.log(fused);
// Output:
// {
//   emotion: "happy",
//   confidence: 0.815,
//   strategy: "weighted",
//   textEmotion: "happy",
//   voiceEmotion: "happy"
// }
```

## Configuration
Set the following in `.env`:
- `EMOTION_FUSION_STRATEGY`: 'weighted', 'voting', or 'ensemble'
- `TEXT_EMOTION_WEIGHT`: Weight for text emotion (0-1)
- `VOICE_EMOTION_WEIGHT`: Weight for voice emotion (0-1)
- `CONFIDENCE_THRESHOLD`: Minimum confidence for ensemble strategy

## Handling Single Modality
The module gracefully handles cases where only text or voice is available:
- Returns text-only result if voice is missing
- Returns voice-only result if text is missing
- Marks the strategy as 'text_only' or 'voice_only'

## Agreement Detection
When modalities agree:
- Confidence is boosted by 20%
- `agreement: true` flag is set
- Higher trust in the result

When modalities disagree:
- Confidence is reduced by 20%
- `agreement: false` flag is set
- Reason for choice is provided
