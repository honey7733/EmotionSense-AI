/**
 * LLM Service Module
 * Generates empathetic responses using LLM (Gemini primary, LLaMA fallback)
 * 
 * This module:
 * 1. Receives emotion and context
 * 2. Creates appropriate prompts for empathetic responses
 * 3. Calls Gemini API (primary)
 * 4. Falls back to LLaMA if Gemini fails
 * 5. Returns generated response text
 */

import axios from 'axios';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '../config/index.js';
import { indianContextConfig } from '../config/indianContext.js';

/**
 * Build Indian context guidance based on detected topic
 */
const buildIndianContextGuidance = (topic) => {
  const guidance = {
    finance: `
• Acknowledge the financial pressure - many Indian families face these challenges
• Suggest government schemes like PM Kisan, Mudra loans, RBI savings schemes
• Recommend community solutions: chit funds, family lending circles
• Discuss realistic budgeting for festivals/celebrations
• Involve family members in financial decisions
• Explore employer benefits and health insurance options
• Suggest free/subsidized government resources`,
    
    marriage: `
• Understand family expectations and cultural norms around marriage
• Acknowledge the importance of parental approval and family consent
• Discuss respectful ways to involve family in decision-making
• Be aware of dowry concerns and societal pressures
• Respect caste, religion, and community considerations mentioned
• Help navigate arranged vs. love marriage acceptance
• Suggest community elders or counselors for guidance`,
    
    education: `
• Acknowledge India's exam-focused education culture and high competition
• Recognize pressure from JEE, NEET, board exams, competitive exams
• Understand role of coaching classes and academic stress
• Provide perspective on multiple career paths beyond "standard" routes
• Discuss government job aspirations (IAS, IPS, SSC)
• Help manage parental expectations about education
• Suggest stress-management and work-life balance`,
    
    career: `
• Acknowledge competitive Indian job market with quota system
• Discuss government job aspirations realistically (IAS, IPS, SSC, PSU)
• Understand family expectations around "secure" employment
• Help navigate location changes and migration concerns
• Discuss skill development and continuous learning
• Acknowledge role of networks and connections in Indian workplace
• Suggest government resources for job training and placement`,
    
    family: `
• Respect joint family system and multi-generational living
• Acknowledge elder care responsibilities and filial duties
• Understand decision-making is often collective, not individual
• Help navigate conflicts while respecting hierarchy
• Discuss cultural values of respect, sacrifice, and duty
• Suggest involving trusted family members in problem-solving
• Acknowledge financial interdependence in joint families`,
    
    emergency: `
• IMMEDIATELY: This is serious. Encourage reaching out to: 
  - Family members immediately
  - AASRA (9820466726), iCall (9152987821), Vandrevala Foundation (9999 666 555)
  - Local hospitals or emergency services
• Emphasize that family support and professional help are crucial
• Religious/spiritual resources may provide comfort
• Do NOT dismiss or minimize their feelings
• Help them see reasons to live and connect with support systems`
  };
  
  return guidance[topic] || "Consider the user's Indian context: family values, economic constraints, social norms, and cultural expectations.";
};

/**
 * Detect non-emotional intents that should bypass LLM generation
 */
const EMOTIONAL_KEYWORDS = [
  'feel',
  'feeling',
  'emotion',
  'stress',
  'stressed',
  'anxious',
  'anxiety',
  'sad',
  'depressed',
  'depression',
  'lonely',
  'alone',
  'angry',
  'upset',
  'hurt',
  'scared',
  'worried',
  'guilty',
  'overwhelmed',
  'cope',
  'coping',
  'grief'
];

const NON_EMOTIONAL_PATTERNS = [
  {
    category: 'technical or account support',
    keywords: [
      'password',
      'reset my password',
      'forgot password',
      'login issue',
      'sign in problem',
      'verification code',
      'otp',
      'account locked',
      'bug report',
      'error code',
      'app not working',
      'software update',
      'install the app',
      'device issue',
      'internet not working'
    ]
  },
  {
    category: 'orders, billing, or subscription requests',
    keywords: [
      'order status',
      'shipping',
      'delivery',
      'refund',
      'return my order',
      'exchange',
      'cancel my order',
      'tracking number',
      'invoice',
      'payment failed',
      'subscription',
      'billing support'
    ]
  },
  {
    category: 'general knowledge or factual questions',
    keywords: [
      'capital of',
      'who is',
      'what is',
      'definition of',
      'history of',
      'recipe',
      'weather forecast',
      'latest news',
      'sports score',
      'stock price'
    ]
  },
  {
    category: 'coding or math help',
    keywords: [
      'write code',
      'fix this code',
      'compile error',
      'algorithm',
      'python',
      'java',
      'javascript',
      'sql query',
      'solve this equation',
      'math problem',
      'derivative'
    ]
  },
  {
    category: 'legal, medical, or financial services',
    keywords: [
      'legal advice',
      'sue someone',
      'attorney',
      'court case',
      'medical diagnosis',
      'prescription',
      'treatment plan',
      'side effects',
      'investment tips',
      'open a bank account',
      'loan eligibility'
    ]
  }
];

const detectNonEmotionalIntent = (message = '', conversationHistory = []) => {
  const haystacks = [];

  if (typeof message === 'string' && message.trim().length > 0) {
    haystacks.push(message.toLowerCase());
  }

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    conversationHistory
      .filter((item) => item && item.role === 'user' && typeof item.message === 'string')
      .slice(-4)
      .forEach((item) => haystacks.push(item.message.toLowerCase()));
  }

  if (haystacks.length === 0) {
    return { blocked: false };
  }

  const primaryText = haystacks[0];
  const primaryHasEmotion = EMOTIONAL_KEYWORDS.some((word) => primaryText.includes(word));

  for (const pattern of NON_EMOTIONAL_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (!primaryHasEmotion && primaryText.includes(keyword)) {
        return {
          blocked: true,
          category: pattern.category,
          keyword
        };
      }
    }
  }

  // Fallback: if the most recent message is emotional, still check older ones
  for (const pattern of NON_EMOTIONAL_PATTERNS) {
    for (const keyword of pattern.keywords) {
      const match = haystacks.slice(1).find((text) => {
        if (!text.includes(keyword)) {
          return false;
        }
        const hasEmotion = EMOTIONAL_KEYWORDS.some((word) => text.includes(word));
        return !hasEmotion;
      });

      if (match) {
        return {
          blocked: true,
          category: pattern.category,
          keyword
        };
      }
    }
  }

  return { blocked: false };
};

const buildScopeBoundaryMessage = (category) => {
  const focusLine = 'I am here to support emotional wellbeing, feelings, and coping strategies.';
  const categoryLine = category ? `It sounds like your question is about ${category}, which I am not able to help with directly.` : 'Your question seems outside that focus.';
  const redirectLine = 'If something about this is causing stress or difficult feelings, let me know so I can support you emotionally.';
  return `${focusLine} ${categoryLine} ${redirectLine}`;
};

/**
 * Create empathetic prompt based on emotion, context, and chat history
 * Enhanced to provide better continuity and context awareness
 * IMPORTANT: Uses conversation history to understand the actual topic, not just emotion
 * NOW WITH INDIAN CONTEXT: Considers Indian cultural, economic, and social aspects
 */
export const createEmpatheticPrompt = (emotion, context, transcript, chatHistory = []) => {
  const emotionPrompts = {
    happy: "The user might be expressing some positivity, but FIRST check the conversation history to understand the actual situation. They may be asking HOW to be happy, or seeking hope despite difficulties.",
    sad: "The user is feeling sad or down. Respond with empathy, understanding, and gentle support. Validate their feelings.",
    angry: "The user is expressing anger or frustration. Respond with calm understanding and help them process their feelings.",
    fear: "The user is experiencing fear or anxiety. Respond with reassurance, comfort, and practical support.",
    surprise: "The user is surprised. Respond with curiosity and help them process this unexpected situation.",
    disgust: "The user is expressing disgust or discomfort. Respond with understanding and validation.",
    neutral: "The user is in a neutral emotional state. Respond conversationally and be helpful."
  };

  const emotionGuidance = emotionPrompts[emotion] || emotionPrompts.neutral;
  
  // Determine the actual underlying topic from conversation history
  let underlyingTopic = "general conversation";
  let detectedContext = { isIndianRelevant: false, topic: '', keywords: [] };
  
  if (chatHistory && chatHistory.length > 0) {
    const recentUserMessages = chatHistory.filter(msg => msg.role === 'user').map(msg => msg.message.toLowerCase());
    const allText = recentUserMessages.join(' ');
    
    if (recentUserMessages.some(msg => msg.includes('money') || msg.includes('afford') || msg.includes('celebrate') || msg.includes('festival') || msg.includes('diwali') || msg.includes('holi') || msg.includes('eid') || msg.includes('loan'))) {
      underlyingTopic = "financial hardship and festival/celebration expenses (Indian context)";
      detectedContext = { isIndianRelevant: true, topic: 'finance', keywords: ['money', 'festival', 'celebrate'] };
    } else if (recentUserMessages.some(msg => msg.includes('die') || msg.includes('suicide') || msg.includes('harm'))) {
      underlyingTopic = "suicidal thoughts or severe distress";
      detectedContext = { isIndianRelevant: true, topic: 'emergency', keywords: ['suicide', 'harm'] };
    } else if (recentUserMessages.some(msg => msg.includes('marriage') || msg.includes('arrange') || msg.includes('parent') || msg.includes('approval') || msg.includes('dowry'))) {
      underlyingTopic = "marriage and family approval (Indian context)";
      detectedContext = { isIndianRelevant: true, topic: 'marriage', keywords: ['marriage', 'parent', 'approval'] };
    } else if (recentUserMessages.some(msg => msg.includes('exam') || msg.includes('jee') || msg.includes('neet') || msg.includes('board') || msg.includes('iit') || msg.includes('coaching'))) {
      underlyingTopic = "academic pressure and competitive exams (Indian context)";
      detectedContext = { isIndianRelevant: true, topic: 'education', keywords: ['exam', 'jee', 'neet', 'board'] };
    } else if (recentUserMessages.some(msg => msg.includes('job') || msg.includes('ias') || msg.includes('ips') || msg.includes('government') || msg.includes('ssc') || msg.includes('career'))) {
      underlyingTopic = "career and job prospects (Indian context)";
      detectedContext = { isIndianRelevant: true, topic: 'career', keywords: ['job', 'ias', 'career'] };
    } else if (recentUserMessages.some(msg => msg.includes('parent') || msg.includes('father') || msg.includes('mother') || msg.includes('elder') || msg.includes('grandmother') || msg.includes('family'))) {
      underlyingTopic = "family relationships and obligations (Indian context)";
      detectedContext = { isIndianRelevant: true, topic: 'family', keywords: ['parent', 'family', 'elder'] };
    } else if (recentUserMessages.some(msg => msg.includes('break') || msg.includes('betray') || msg.includes('friend') || msg.includes('hurt'))) {
      underlyingTopic = "relationship betrayal or emotional pain";
      detectedContext = { isIndianRelevant: false, topic: 'relationships', keywords: ['break', 'betray', 'friend'] };
    } else if (recentUserMessages.some(msg => msg.includes('work') || msg.includes('boss'))) {
      underlyingTopic = "work-related stress or issues";
      detectedContext = { isIndianRelevant: false, topic: 'work', keywords: ['work', 'boss'] };
    }
  }

  // Start with system context and guidelines - INCLUDE INDIAN CONTEXT
  let prompt = `${indianContextConfig.systemPrompt}

===========================================
CONVERSATION CONTEXT
===========================================

IMPORTANT: This is a CONTINUOUS conversation about: ${underlyingTopic}

You have access to previous messages in this conversation thread. Use them to provide coherent, contextual responses that reference the conversation thread when appropriate.

CRITICAL: Focus on the UNDERLYING TOPIC (${underlyingTopic}), not just the detected emotion. The emotion detection helps understand HOW the user feels, but the conversation history shows WHAT they're dealing with.

CURRENT MESSAGE CONTEXT:
- Underlying Topic: ${underlyingTopic}
- Detected Emotion: ${emotion}
- Confidence: ${context?.confidence || 'N/A'}
${transcript ? `- User's current message: "${transcript}"` : ''}
${context?.context ? `- Additional context: ${context.context}` : ''}

EMOTIONAL GUIDANCE:
${emotionGuidance}

${detectedContext.isIndianRelevant ? `
===========================================
INDIAN CONTEXT DETECTED - SPECIAL GUIDANCE
===========================================
This appears to be related to: ${detectedContext.topic}
Key aspects for Indian users in this situation:
${buildIndianContextGuidance(detectedContext.topic)}
` : ''}`;

  // Add chat history for context - make it prominent and well-formatted
  if (chatHistory && chatHistory.length > 0) {
    prompt += `\n\n${'═'.repeat(70)}
CONVERSATION HISTORY - UNDERSTANDING THE SITUATION
${'═'.repeat(70)}

Situation: The user is dealing with: ${underlyingTopic}

Previous messages in conversation:`;
    
    chatHistory.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
      const emotion = msg.emotion_detected ? ` [${msg.emotion_detected.toUpperCase()}]` : '';
      const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : '';
      prompt += `\n\n[${index + 1}] ${role}${emotion}${timestamp ? ` (${timestamp})` : ''}:\n"${msg.message}"`;
    });
    
    prompt += `\n\n${'═'.repeat(70)}
CRITICAL INSTRUCTIONS FOR RESPONDING:
${'═'.repeat(70)}

✓ UNDERSTAND THE REAL SITUATION: The user is dealing with ${underlyingTopic}
✓ RESPOND TO THE TOPIC, NOT JUST EMOTION: Focus on their actual problem/need
✓ REFERENCE THE CONVERSATION: Show you remember what they've told you
✓ BUILD ON PREVIOUS MESSAGES: Connect your response to their earlier statements
✓ MAINTAIN CONTINUITY: Keep supporting them on this specific journey
✓ BE SPECIFIC: Use examples from their story, not generic advice
✓ ACKNOWLEDGE THEIR FEELINGS: Validate their emotions in context of their situation
✓ PROVIDE PRACTICAL HELP: When they ask "how to overcome", give specific suggestions related to their situation

EXAMPLE:
- If they mention financial hardship → suggest practical solutions (saving, budgeting, community resources)
- If they mention loneliness → suggest connection strategies
- If they mention loss → offer grieving support
- NOT: Change topic or respond to a different emotion`;
  }

  prompt += `

RESPONSE REQUIREMENTS:
- Be warm, genuine, and conversational
- Keep response concise (1-2 sentences, or more if continuing an important thread)
- Use simple, natural language
- Show you understand their emotional journey AND their real-life situation
- Consider Indian values: family, duty, respect, hard work, education, community
- Offer support or encouragement as appropriate
- Reference previous messages and the underlying topic when helpful
- Suggest solutions considering Indian economic realities and social structures
- Do NOT start fresh - treat this as an ongoing conversation
- Do NOT ignore the real topic in favor of emotion detection
- Do NOT provide generic advice - be specific to THEIR situation and INDIAN context
- Do NOT ignore cultural/family aspects when relevant
- Do NOT say "I don't remember" - you have the conversation history above

Now respond to help them with: ${underlyingTopic}
Current message: "${transcript}"

RESPOND NATURALLY, CONTEXTUALLY, AND WITH INDIAN AWARENESS:`;

  return prompt;
};

/**
 * Call Gemini API to generate response
 * Primary LLM service with model fallback
 */
export const generateWithGemini = async (prompt) => {
  // Try API keys in sequence with fallback
  const apiKey1 = config.gemini.apiKey1;
  const apiKey2 = config.gemini.apiKey2;
  
  if (!apiKey1 && !apiKey2) {
    throw new Error('No Gemini API keys configured');
  }

  // Generation config
  const generationConfig = {
    temperature: config.gemini.temperature,
    topK: config.gemini.topK,
    topP: config.gemini.topP,
    maxOutputTokens: config.gemini.maxTokens
  };

  // Safety settings - Allow emotional content but block harmful content
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  let error;

  // Get models from config with fallback order
  const models = config.gemini.models || ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro	'];
  
  // Try first API key with all models
  if (apiKey1) {
    for (const modelName of models) {
      try {
        console.log(`🤖 Attempting Gemini API Key 1 with model: ${modelName}`);
        const genAI = new GoogleGenerativeAI(apiKey1);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig,
          safetySettings
        });
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Check if response was blocked by safety filters
        if (response.promptFeedback?.blockReason) {
          console.warn(`⚠️ Response blocked by safety filter: ${response.promptFeedback.blockReason}`);
          throw new Error(`Response blocked: ${response.promptFeedback.blockReason}`);
        }
        
        const text = response.text()?.trim();
        
        // Validate that we got actual content
        if (!text || text.length === 0) {
          console.warn(`⚠️ Empty response received from Gemini model: ${modelName}`);
          console.warn(`Response object:`, JSON.stringify(response, null, 2));
          throw new Error('Empty response received from Gemini');
        }
        
        console.log(`✅ Gemini response generated with ${modelName} (API Key 1)`);
        console.log(`📝 Response preview: "${text.substring(0, 100)}..."`);
        return {
          text,
          model: `gemini-${modelName}`,
          success: true
        };
      } catch (err) {
        console.warn(`API Key 1 with ${modelName} failed:`, err.message);
        error = err;
      }
    }
  }

  // Try second API key with all models if first one failed
  if (apiKey2) {
    for (const modelName of models) {
      try {
        console.log(`🤖 Attempting Gemini API Key 2 with model: ${modelName}`);
        const genAI = new GoogleGenerativeAI(apiKey2);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig,
          safetySettings
        });
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Check if response was blocked by safety filters
        if (response.promptFeedback?.blockReason) {
          console.warn(`⚠️ Response blocked by safety filter: ${response.promptFeedback.blockReason}`);
          throw new Error(`Response blocked: ${response.promptFeedback.blockReason}`);
        }
        
        const text = response.text()?.trim();
        
        // Validate that we got actual content
        if (!text || text.length === 0) {
          console.warn(`⚠️ Empty response received from Gemini model: ${modelName}`);
          console.warn(`Response object:`, JSON.stringify(response, null, 2));
          throw new Error('Empty response received from Gemini');
        }
        
        console.log(`✅ Gemini response generated with ${modelName} (API Key 2)`);
        console.log(`📝 Response preview: "${text.substring(0, 100)}..."`);
        return {
          text,
          model: `gemini-${modelName}`,
          success: true
        };
      } catch (err) {
        console.warn(`API Key 2 with ${modelName} failed:`, err.message);
        error = err;
      }
    }
  }

  // If both keys failed with all models, throw the last error
  throw new Error(`All Gemini API keys failed. Last error: ${error?.message || 'Unknown error'}`);

  // Legacy code below (will not be reached)
  // Try each model in the fallback array
  let lastError = null;

  for (const [index, modelName] of models.entries()) {
    try {
      console.log(`🤖 Attempting Gemini API with model: ${modelName} (${index + 1}/${models.length})`);

      // Get the generative model
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig
      });

      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      console.log(`✅ Gemini response generated successfully with ${modelName}`);

      return {
        text,
        model: `gemini-${modelName}`,
        success: true
      };

    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Model ${modelName} failed: ${error.message}`);
      
      // If not the last model, try the next one
      if (index < models.length - 1) {
        console.log(`🔄 Trying next model...`);
        continue;
      }
    }
  }

  // All models failed
  console.error('❌ All Gemini models failed');
  throw new Error(`Gemini API call failed after trying ${models.length} models: ${lastError?.message || 'Unknown error'}`);
};

/**
 * Call LLaMA API to generate response via Groq
 * Fallback LLM service
 */
export const generateWithLLaMA = async (prompt) => {
  // Check if LLaMA is enabled before attempting
  if (!config.llama.enabled) {
    console.log(`⚠️  LLaMA is disabled in configuration, skipping...`);
    throw new Error('LLaMA is not enabled in configuration');
  }

  if (!config.llama.apiKey) {
    throw new Error('Groq API key not configured for LLaMA');
  }

  try {
    console.log(`🤖 Calling LLaMA via Groq (${config.llama.model})...`);

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: config.llama.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.llama.temperature,
        max_tokens: config.llama.maxTokens,
        top_p: 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llama.apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Extract text from Groq response
    const generatedText = response.data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('No response text from Groq LLaMA API');
    }
    
    console.log(`✅ LLaMA (Groq) response generated successfully`);

    return {
      text: generatedText.trim(),
      model: `llama-groq-${config.llama.model}`,
      success: true
    };
  } catch (error) {
    console.error('❌ Error calling LLaMA API:', error.response?.data?.error?.message || error.message);
    throw new Error('LLaMA API call failed: ' + (error.response?.data?.error?.message || error.message));
  }
};

/**
 * Generate fallback response when all LLMs fail
 */
export const generateFallbackResponse = (emotion) => {
  const fallbackResponses = {
    happy: "That's wonderful to hear! I'm so glad you're feeling good. Keep embracing those positive moments - your family and loved ones would be happy to see your joy!",
    sad: "I hear you, and I want you to know that it's okay to feel this way. I'm here for you, and remember - you have your family and community around you. Things will get better with time and support.",
    angry: "I understand you're feeling frustrated right now. Take a deep breath - your feelings are valid. It might help to talk with someone you trust or take some time for yourself. Let's work through this together.",
    fear: "It's completely normal to feel anxious sometimes. Remember that you're stronger than you think, and you're not alone - your family, friends, and community are there to support you. I'm here too.",
    surprise: "That sounds unexpected! Life can throw curveballs sometimes. It might help to talk with someone you trust about what you're feeling. How can I help you process this?",
    disgust: "I can sense your discomfort. Your reaction is valid, and it's important to trust your feelings. Talk to someone you trust about this when you're ready.",
    neutral: "I'm here and listening. Feel free to share what's on your mind whenever you're ready - I understand Indian challenges and will try my best to help with solutions relevant to you."
  };

  return {
    text: fallbackResponses[emotion] || fallbackResponses.neutral,
    model: 'fallback',
    success: true,
    isFallback: true,
    indianContextAware: true
  };
};

/**
 * Main function: Generate empathetic response
 * This is the primary export used by routes
 * Implements auto-switch logic: Gemini -> LLaMA -> Fallback
 */
export const generateResponse = async ({ emotion, confidence, context, transcript, conversationHistory = [] }) => {
  console.log(`💬 Generating empathetic response for emotion: ${emotion}`);
  console.log(`🇮🇳 Indian Context Awareness: ENABLED - Responses will be tailored for Indian users`);

  // Guardrail: block non-emotional requests
  const scopeCheck = detectNonEmotionalIntent(transcript, conversationHistory);
  if (scopeCheck.blocked) {
    console.log(`🚧 Message appears outside emotional support scope (category: ${scopeCheck.category}, keyword: ${scopeCheck.keyword})`);
    return {
      text: buildScopeBoundaryMessage(scopeCheck.category),
      model: 'scope-guard',
      success: true,
      policyNotice: true,
      boundaryCategory: scopeCheck.category,
      boundaryKeyword: scopeCheck.keyword
    };
  }

  // Create prompt with conversation history
  const prompt = createEmpatheticPrompt(emotion, { confidence, context }, transcript, conversationHistory);

  // Try Gemini first
  try {
    const geminiResponse = await generateWithGemini(prompt);
    console.log(`✅ Response generated with Indian context awareness (Gemini)`);
    return geminiResponse;
  } catch (geminiError) {
    console.warn(`⚠️  Gemini failed: ${geminiError.message}`);

    // Try LLaMA as fallback only if enabled
    if (config.llama.enabled) {
      console.log('🔄 Attempting LLaMA fallback with Indian context...');
      try {
        const llamaResponse = await generateWithLLaMA(prompt);
        console.log(`✅ Response generated with Indian context awareness (LLaMA)`);
        return llamaResponse;
      } catch (llamaError) {
        console.warn(`⚠️  LLaMA fallback failed: ${llamaError.message}`);
      }
    } else {
      console.log('⚠️  LLaMA is disabled, skipping fallback...');
    }

    // Use static fallback if LLaMA is disabled or failed
    console.log('📝 Using static fallback response with Indian context awareness...');
    const fallbackResponse = generateFallbackResponse(emotion);
    return fallbackResponse;
  }
};

/**
 * Generate conversational response (for chat continuation)
 */
export const generateConversationalResponse = async ({ message, emotion = 'neutral', conversationHistory = [] }) => {
  console.log(`💬 Generating conversational response...`);

  // Build conversation context
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\n\nPREVIOUS CONVERSATION:\n';
    conversationHistory.forEach((msg, idx) => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
  }

  const prompt = `You are an empathetic AI assistant. The user is in a ${emotion} emotional state.

${conversationContext}

User: ${message}

Provide a helpful, empathetic response (2-3 sentences):`;

  // Try Gemini -> LLaMA -> Fallback
  try {
    return await generateWithGemini(prompt);
  } catch (error) {
    try {
      return await generateWithLLaMA(prompt);
    } catch (error) {
      return generateFallbackResponse(emotion);
    }
  }
};
