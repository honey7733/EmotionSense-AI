# Response Aggregator Module

## Overview
This module combines all components of the emotion detection and response generation pipeline into a final, formatted response for the client.

## Features
- Combines text and audio responses
- Formats emotion data
- Adds metadata and timestamps
- Calculates processing time
- Handles error responses
- Sanitizes sensitive data

## Response Formats

### Standard Response (with LLM)
```javascript
{
  success: true,
  timestamp: "2025-10-15T10:30:00Z",
  emotion: {
    detected: "happy",
    confidence: 0.85
  },
  response: {
    text: "That's wonderful to hear!...",
    model: "gemini",
    hasAudio: true,
    audio: {
      data: "base64_encoded_audio",
      format: "mp3",
      duration: 2.5,
      provider: "google"
    }
  },
  processingTime: 1250
}
```

### Multi-Modal Analysis Response
```javascript
{
  success: true,
  timestamp: "2025-10-15T10:30:00Z",
  transcript: "I'm feeling really happy today",
  emotions: {
    text: {
      emotion: "happy",
      confidence: 0.85,
      scores: { happy: 0.85, sad: 0.10, ... }
    },
    voice: {
      emotion: "happy",
      confidence: 0.82,
      scores: { happy: 0.82, sad: 0.12, ... }
    },
    fused: {
      emotion: "happy",
      confidence: 0.835,
      strategy: "weighted",
      scores: { happy: 0.835, sad: 0.11, ... }
    }
  },
  dominantEmotion: "happy",
  confidence: 0.835,
  processingTime: 2100
}
```

### Error Response
```javascript
{
  success: false,
  timestamp: "2025-10-15T10:30:00Z",
  error: {
    message: "API call failed",
    code: 500,
    type: "Error"
  }
}
```

## Usage

```javascript
import { aggregateResponse, aggregateMultiModalResponse } from './aggregator/index.js';

// Aggregate LLM response with audio
const finalResponse = aggregateResponse({
  textResponse: {
    text: "I'm glad you're feeling good!",
    model: "gemini"
  },
  audioResponse: {
    audioData: "base64...",
    format: "mp3",
    duration: 2.5
  },
  emotion: "happy",
  confidence: 0.85,
  startTime: Date.now() - 1250
});

// Aggregate multi-modal analysis
const multiModalResponse = aggregateMultiModalResponse({
  textEmotion: { emotion: "happy", confidence: 0.85, scores: {...} },
  voiceEmotion: { emotion: "happy", confidence: 0.82, scores: {...} },
  fusedEmotion: { emotion: "happy", confidence: 0.835, strategy: "weighted" },
  transcript: "I'm feeling really happy",
  startTime: Date.now() - 2100
});
```

## API Functions

### aggregateResponse(params)
Aggregates text response, audio response, and emotion data.

**Parameters:**
- `textResponse`: LLM-generated text
- `audioResponse`: TTS-generated audio (optional)
- `emotion`: Detected emotion
- `confidence`: Confidence score
- `startTime`: Request start timestamp (optional)

**Returns:** Formatted response object

### aggregateMultiModalResponse(params)
Aggregates multi-modal emotion analysis results.

**Parameters:**
- `textEmotion`: Text emotion result
- `voiceEmotion`: Voice emotion result
- `fusedEmotion`: Combined emotion result
- `transcript`: Speech transcript
- `startTime`: Request start timestamp (optional)

**Returns:** Formatted multi-modal response object

### aggregateErrorResponse(error, statusCode)
Creates a standardized error response.

**Parameters:**
- `error`: Error object
- `statusCode`: HTTP status code (default: 500)

**Returns:** Formatted error response

### formatEmotionScores(scores)
Formats emotion scores for display.

**Parameters:**
- `scores`: Object with emotion scores

**Returns:** Array of formatted emotion scores

### createResponseSummary(response)
Creates a summary for logging or analytics.

**Parameters:**
- `response`: Full response object

**Returns:** Summary object

### sanitizeResponse(response, includeSensitive)
Removes sensitive data before sending to client.

**Parameters:**
- `response`: Response object
- `includeSensitive`: Whether to include sensitive fields (default: false)

**Returns:** Sanitized response

## Response Fields

### Metadata
- `success`: Operation success status
- `timestamp`: ISO 8601 timestamp
- `processingTime`: Processing time in milliseconds

### Emotion Data
- `detected`: Detected emotion label
- `confidence`: Confidence score (0-1)
- `scores`: Scores for all emotions

### LLM Response
- `text`: Generated text response
- `model`: Model used (gemini/llama/fallback)
- `hasAudio`: Whether audio is included
- `isFallback`: Whether fallback response was used

### Audio Data
- `data`: Base64 encoded audio
- `format`: Audio format (mp3/wav)
- `duration`: Duration in seconds
- `provider`: TTS provider used

## Data Flow
```
Text/Voice Input → Emotion Detection → LLM Generation → TTS (optional) → Aggregator → Client
```

## Best Practices
1. Always include timestamps for tracking
2. Calculate processing time for performance monitoring
3. Use sanitization for sensitive data
4. Provide clear error messages
5. Log response summaries for analytics
