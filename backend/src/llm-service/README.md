# LLM Service Module

## Overview
This module generates empathetic responses using Large Language Models with automatic fallback mechanism.

## LLM Hierarchy
1. **Primary**: Google Gemini 2.5 Flash
2. **Fallback**: LLaMA 3 or 4 (local/remote)
3. **Emergency**: Static responses

## Features
- Emotion-aware prompt engineering
- Automatic failover between models
- Empathetic response generation
- Conversational context support
- Configurable parameters (temperature, tokens)

## Response Generation Flow
```
Detect Emotion → Create Prompt → Call Gemini
                                      ↓ (if fails)
                                  Call LLaMA
                                      ↓ (if fails)
                                  Static Fallback
```

## Prompt Engineering
The module creates context-aware prompts that include:
- Detected emotion
- Confidence score
- User transcript
- Additional context
- Emotion-specific guidelines

## Usage

```javascript
import { generateResponse } from './llm-service/index.js';

const response = await generateResponse({
  emotion: 'happy',
  confidence: 0.85,
  transcript: "I got the job!",
  context: "User shared good news"
});

console.log(response);
// Output:
// {
//   text: "That's wonderful news! Congratulations on getting the job...",
//   model: "gemini",
//   success: true
// }
```

## Configuration
Set the following in `.env`:

### Gemini (Primary)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `GEMINI_MODEL`: Model name (default: gemini-2.5-flash)
- `GEMINI_API_URL`: API endpoint
- `GEMINI_MAX_TOKENS`: Maximum response length (default: 1024)
- `GEMINI_TEMPERATURE`: Creativity (0-1, default: 0.7)

### LLaMA (Fallback)
- `LLAMA_ENABLED`: Enable/disable LLaMA fallback (true/false)
- `LLAMA_API_URL`: LLaMA server endpoint
- `LLAMA_MODEL_PATH`: Path to model weights
- `LLAMA_MAX_TOKENS`: Maximum response length
- `LLAMA_TEMPERATURE`: Creativity (0-1)

## Emotion-Specific Guidelines
The module uses different response strategies per emotion:
- **Happy**: Warm celebration and encouragement
- **Sad**: Gentle validation and support
- **Angry**: Calm understanding and processing help
- **Fear**: Reassurance and practical support
- **Surprise**: Curiosity and situation processing
- **Disgust**: Understanding and validation
- **Neutral**: Conversational and helpful

## Error Handling
- API timeout: 30 seconds (Gemini), 45 seconds (LLaMA)
- Automatic retry with fallback model
- Graceful degradation to static responses
- Detailed error logging

## Static Fallback Responses
Pre-written empathetic responses for each emotion when all LLMs fail. Ensures system never returns an error to the user.

## Best Practices
1. Always provide context and transcript for better responses
2. Monitor API quotas and rate limits
3. Consider caching common responses
4. Log which model was used for analytics
5. Test fallback mechanisms regularly
