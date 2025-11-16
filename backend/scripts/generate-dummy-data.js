/**
 * Generate Diverse Dummy Data for EmotionSense AI Users
 * Creates 1-2 months of realistic emotional data for existing users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec);

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Emotion configurations with realistic patterns
const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];

// User personas with distinct emotional patterns
const USER_PERSONAS = {
  'ayushkumar2205@zohomail.in': {
    name: 'Ayush Kumar',
    dominantEmotions: ['joy', 'neutral', 'surprise'],
    stressPattern: 'workday-stress', // Stressed Mon-Fri, relaxed weekends
    messageFrequency: 15, // messages per day
    moodTrend: 'improving', // Overall trend
    themes: ['work', 'coding', 'career', 'learning', 'relationships']
  },
  'natesingh.nt@gmail.com': {
    name: 'Wing Singh',
    dominantEmotions: ['sadness', 'fear', 'neutral'],
    stressPattern: 'anxiety-peaks', // Random anxiety episodes
    messageFrequency: 8,
    moodTrend: 'fluctuating',
    themes: ['health', 'family', 'finance', 'self-improvement', 'social']
  }
};

// Realistic message templates by theme and emotion
const MESSAGE_TEMPLATES = {
  work: {
    joy: [
      "Just finished a major project! Feeling accomplished",
      "Got positive feedback from my manager today",
      "Team collaboration was amazing today",
      "Successfully deployed the new feature!"
    ],
    sadness: [
      "Work feels overwhelming lately",
      "Missed another deadline today",
      "Feeling underappreciated at work",
      "Long day at the office, feeling drained"
    ],
    anger: [
      "This bug is driving me crazy!",
      "Frustrated with how slow things are moving",
      "Why doesn't anyone respond to my emails?",
      "Another meeting that could have been an email"
    ],
    neutral: [
      "Regular day at work",
      "Working on the usual tasks",
      "Just another Monday",
      "Going through my to-do list"
    ],
    fear: [
      "Worried about the upcoming presentation",
      "Not sure if I can meet this deadline",
      "Anxious about the performance review",
      "What if I made a mistake in the code?"
    ]
  },
  coding: {
    joy: [
      "Finally solved that algorithm problem!",
      "Code is running perfectly now",
      "Love when everything compiles on first try",
      "Built something cool today"
    ],
    anger: [
      "This library is so poorly documented",
      "Why is this error so cryptic?",
      "Spent 3 hours on a typo",
      "Dependencies are broken again"
    ],
    surprise: [
      "Wow, this new framework is amazing",
      "Didn't expect that solution to work",
      "Just discovered a better way to do this",
      "This AI tool actually helped!"
    ]
  },
  relationships: {
    joy: [
      "Had a great time with friends today",
      "Family dinner was wonderful",
      "My partner surprised me today",
      "Reconnected with an old friend"
    ],
    sadness: [
      "Missing my family",
      "Feel like I'm drifting from friends",
      "Long distance is hard",
      "Feeling a bit lonely today"
    ],
    fear: [
      "Worried about what they think of me",
      "Scared of losing this friendship",
      "Not sure how to handle this conversation",
      "Anxious about meeting new people"
    ]
  },
  health: {
    joy: [
      "Great workout today!",
      "Feeling energized and healthy",
      "Finally got good sleep last night",
      "Hit my fitness goal!"
    ],
    sadness: [
      "Haven't been sleeping well",
      "Feeling tired all the time",
      "Skipped the gym again",
      "Not taking care of myself lately"
    ],
    fear: [
      "Worried about these symptoms",
      "Health anxiety is acting up",
      "Should I see a doctor?",
      "Concerned about my wellbeing"
    ]
  },
  finance: {
    joy: [
      "Saved some money this month!",
      "Got a bonus at work",
      "Investment is doing well",
      "Finally paid off that debt"
    ],
    sadness: [
      "Bills are piling up",
      "Overspent this month",
      "Financial stress is getting to me",
      "Wish I earned more"
    ],
    fear: [
      "Worried about the expenses",
      "Job security concerns",
      "What if I can't afford this?",
      "Economic uncertainty is scary"
    ]
  },
  learning: {
    joy: [
      "Learned something new today!",
      "Understanding this concept finally",
      "Completed an online course",
      "Knowledge is power!"
    ],
    neutral: [
      "Reading some documentation",
      "Going through tutorials",
      "Study session today",
      "Taking notes on new tech"
    ],
    surprise: [
      "This is easier than I thought",
      "Wow, I didn't know that!",
      "Mind = blown by this concept",
      "Unexpected discovery today"
    ]
  },
  social: {
    joy: [
      "Party was so much fun!",
      "Met some amazing people",
      "Great conversation tonight",
      "Laughed so hard today"
    ],
    sadness: [
      "Feel left out sometimes",
      "Social battery is drained",
      "Wish I was more outgoing",
      "Feeling isolated"
    ],
    fear: [
      "Social anxiety is high today",
      "Nervous about the event",
      "What if they don't like me?",
      "Scared to speak up"
    ]
  },
  'self-improvement': {
    joy: [
      "Proud of my progress",
      "Small wins add up!",
      "Growing every day",
      "Feeling more confident"
    ],
    neutral: [
      "Working on myself",
      "One step at a time",
      "Reflecting on my journey",
      "Setting new goals"
    ],
    sadness: [
      "Feel like I'm not improving",
      "So hard to break old habits",
      "Disappointed in myself",
      "Progress is so slow"
    ]
  },
  career: {
    joy: [
      "Career is heading in the right direction",
      "Excited about new opportunities",
      "Networking paid off!",
      "Learning valuable skills"
    ],
    fear: [
      "Career uncertainty is stressful",
      "Am I on the right path?",
      "Imposter syndrome hitting hard",
      "Worried about my future"
    ]
  }
};

// AI responses that reference conversation history
const AI_RESPONSES = {
  joy: [
    "That's wonderful to hear! I'm so glad things are going well for you.",
    "Your positivity is infectious! Keep up the great work.",
    "It's beautiful to see you so happy. You deserve these good moments.",
    "I can feel your excitement! This is a significant achievement."
  ],
  sadness: [
    "I hear you. It's okay to feel this way. You've been dealing with a lot lately.",
    "I'm here for you. Remember, tough times don't last forever.",
    "Based on what you've shared before, I know this has been weighing on you. Let's talk through it.",
    "Your feelings are valid. It's been a challenging period for you."
  ],
  anger: [
    "I can sense your frustration. You've mentioned similar issues before - it must be exhausting.",
    "It's completely understandable to feel angry about this situation.",
    "Take a deep breath. Let's work through this together.",
    "Your frustration is justified. How can we address this?"
  ],
  fear: [
    "I know this connects to the worries you've shared before. Your concerns are valid.",
    "Anxiety can be overwhelming. Let's break this down step by step.",
    "You've overcome similar challenges in the past. You're stronger than you think.",
    "It's natural to feel scared about this. Let's explore these feelings together."
  ],
  neutral: [
    "I'm listening. How are you feeling about everything we've discussed?",
    "Thanks for sharing. How does this connect to what we talked about earlier?",
    "I see. Tell me more about what's on your mind.",
    "Reflecting on our previous conversations, how do you see things now?"
  ],
  surprise: [
    "That's quite unexpected! How do you feel about this development?",
    "Wow! Life certainly has its surprises. What does this mean for you?",
    "I'm surprised to hear that too! This is a new turn.",
    "Interesting! This adds a new dimension to what you've been experiencing."
  ],
  disgust: [
    "I can understand why that would bother you.",
    "That does sound unpleasant. Let's talk about it.",
    "Your reaction makes sense given the situation.",
    "I hear your discomfort. How can we address this?"
  ]
};

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getDateNDaysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

function getTimeOfDay(hour) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function calculateMoodScore(emotion, baseScore, trendModifier) {
  const emotionScores = {
    joy: 85,
    surprise: 70,
    neutral: 55,
    sadness: 30,
    fear: 25,
    anger: 20,
    disgust: 18
  };
  return Math.min(100, Math.max(0, emotionScores[emotion] + trendModifier + randomInt(-10, 10)));
}

function getEmotionForPersona(persona, dayOfWeek, hour, dayIndex) {
  const { dominantEmotions, stressPattern, moodTrend } = persona;
  
  let emotionPool = [...dominantEmotions];
  
  // Apply stress patterns
  if (stressPattern === 'workday-stress') {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWorkHours = hour >= 9 && hour <= 18;
    if (isWeekday && isWorkHours) {
      emotionPool = ['neutral', 'sadness', 'anger', 'fear'];
    } else {
      emotionPool = ['joy', 'neutral', 'surprise'];
    }
  } else if (stressPattern === 'anxiety-peaks') {
    // Random anxiety episodes
    if (Math.random() < 0.3) {
      emotionPool = ['fear', 'sadness', 'anger'];
    } else {
      emotionPool = dominantEmotions;
    }
  }
  
  // Add trend influence (improving = more positive over time)
  if (moodTrend === 'improving' && dayIndex < 30) {
    if (Math.random() < 0.3) emotionPool.push('joy');
  } else if (moodTrend === 'fluctuating') {
    emotionPool.push(randomChoice(['sadness', 'fear', 'neutral']));
  }
  
  return randomChoice(emotionPool);
}

function getMessage(theme, emotion) {
  const themeMessages = MESSAGE_TEMPLATES[theme];
  if (!themeMessages) return `Talking about ${theme}`;
  
  const emotionMessages = themeMessages[emotion] || themeMessages['neutral'] || [];
  if (emotionMessages.length === 0) {
    return `Feeling ${emotion} about ${theme}`;
  }
  
  return randomChoice(emotionMessages);
}

function getAIResponse(emotion, includeHistory = true) {
  const responses = AI_RESPONSES[emotion] || AI_RESPONSES['neutral'];
  return randomChoice(responses);
}

async function generateDataForUser(userId, email) {
  console.log(`\n🎭 Generating data for ${email}...`);
  
  const persona = USER_PERSONAS[email];
  if (!persona) {
    console.log(`❌ No persona defined for ${email}`);
    return;
  }
  
  const daysToGenerate = randomInt(45, 60); // 1.5-2 months
  const sessions = [];
  const messages = [];
  const emotionAnalyses = [];
  
  console.log(`📅 Generating ${daysToGenerate} days of data...`);
  
  for (let dayIndex = 0; dayIndex < daysToGenerate; dayIndex++) {
    // Make final generated day be today (getDateNDaysAgo(0) => today)
    const date = getDateNDaysAgo(daysToGenerate - 1 - dayIndex);
    const dayOfWeek = date.getDay();
    const messagesPerDay = randomInt(
      Math.max(3, persona.messageFrequency - 5),
      persona.messageFrequency + 5
    );
    
    // Create 1-3 sessions per day
    const sessionsPerDay = randomInt(1, 3);
    const messagesPerSession = Math.floor(messagesPerDay / sessionsPerDay);
    
    for (let sessionIdx = 0; sessionIdx < sessionsPerDay; sessionIdx++) {
      // Create session
      const sessionId = generateUUID();
      const sessionStartHour = randomInt(8, 22);
      const sessionDate = new Date(date);
      sessionDate.setHours(sessionStartHour, randomInt(0, 59), randomInt(0, 59));
      
      const theme = randomChoice(persona.themes);
      
      const session = {
        id: sessionId,
        user_id: userId,
        session_title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} chat`,
        created_at: sessionDate.toISOString(),
        updated_at: sessionDate.toISOString()
      };
      sessions.push(session);
      
      // Generate conversation
      for (let msgIdx = 0; msgIdx < messagesPerSession; msgIdx++) {
        const msgTime = new Date(sessionDate.getTime() + msgIdx * randomInt(30000, 300000));
        const hour = msgTime.getHours();
        
        // User message
        const emotion = getEmotionForPersona(persona, dayOfWeek, hour, dayIndex);
        const confidence = randomFloat(0.65, 0.95);
        const moodScore = calculateMoodScore(
          emotion,
          50,
          dayIndex < 30 ? dayIndex * 0.5 : 15 // Trend modifier
        );
        const userMessage = getMessage(theme, emotion);
        
        const userMsgId = generateUUID();
        messages.push({
          id: userMsgId,
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: userMessage,
          emotion: emotion,
          emotion_confidence: confidence,
          metadata: {
            theme: theme,
            time_of_day: getTimeOfDay(hour),
            word_count: userMessage.split(' ').length
          },
          created_at: msgTime.toISOString()
        });
        
        // Emotion analysis entry
        emotionAnalyses.push({
          id: generateUUID(),
          user_id: userId,
          type: 'text',
          input_text: userMessage,
          emotion: emotion,
          confidence: confidence,
          scores: {
            [emotion]: confidence,
            [randomChoice(EMOTIONS)]: randomFloat(0.1, 0.3),
            [randomChoice(EMOTIONS)]: randomFloat(0.05, 0.15)
          },
          timestamp: msgTime.toISOString(),
          created_at: msgTime.toISOString()
        });
        
        // AI response
        const aiResponseTime = new Date(msgTime.getTime() + randomInt(2000, 10000));
        const aiResponse = getAIResponse(emotion, msgIdx > 0);
        
        messages.push({
          id: generateUUID(),
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: aiResponse,
          emotion: null,
          emotion_confidence: null,
          metadata: {
            response_to_emotion: emotion,
            context_aware: msgIdx > 0
          },
          created_at: aiResponseTime.toISOString()
        });
      }
    }
  }
  
  console.log(`✅ Generated for ${email}:`);
  console.log(`   📊 ${sessions.length} sessions`);
  console.log(`   💬 ${messages.length} messages`);
  console.log(`   🎭 ${emotionAnalyses.length} emotion analyses`);
  
  return { sessions, messages, emotionAnalyses };
}

async function insertData() {
  console.log('🚀 Starting data generation...\n');
  
  // Get users
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email');
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }
  
  console.log(`Found ${users.length} users`);
  
  for (const user of users) {
    if (!USER_PERSONAS[user.email]) {
      console.log(`⏭️  Skipping ${user.email} (no persona defined)`);
      continue;
    }
    
    const { sessions, messages, emotionAnalyses } = await generateDataForUser(
      user.id,
      user.email
    );
    
    // Insert in batches
    console.log(`\n💾 Inserting data for ${user.email}...`);
    
    // Insert sessions (batch of 100)
    for (let i = 0; i < sessions.length; i += 100) {
      const batch = sessions.slice(i, i + 100);
      const { error } = await supabase.from('chat_sessions').insert(batch);
      if (error) {
        console.error(`❌ Error inserting sessions batch ${i}:`, error.message);
      } else {
        console.log(`   ✅ Inserted sessions ${i + 1}-${Math.min(i + 100, sessions.length)}`);
      }
    }
    
    // Insert messages (batch of 500)
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      const { error } = await supabase.from('messages').insert(batch);
      if (error) {
        console.error(`❌ Error inserting messages batch ${i}:`, error.message);
      } else {
        console.log(`   ✅ Inserted messages ${i + 1}-${Math.min(i + 500, messages.length)}`);
      }
    }
    
    // Insert emotion analyses (batch of 500)
    for (let i = 0; i < emotionAnalyses.length; i += 500) {
      const batch = emotionAnalyses.slice(i, i + 500);
      const { error } = await supabase.from('emotion_analysis').insert(batch);
      if (error) {
        console.error(`❌ Error inserting emotion analyses batch ${i}:`, error.message);
      } else {
        console.log(`   ✅ Inserted analyses ${i + 1}-${Math.min(i + 500, emotionAnalyses.length)}`);
      }
    }
    
    console.log(`\n✨ Completed data generation for ${user.email}!\n`);
  }
  
  console.log('🎉 All data generated successfully!');

  // After generating messages, run the insights and timeline population
  try {
    console.log('\n🔁 Triggering insights generation and timeline population...');
    // Run insights generator
    const insightsCmd = 'node scripts/generate-insights-from-messages.js';
    console.log(`   ▶️ ${insightsCmd}`);
    const insightsResult = await exec(insightsCmd);
    console.log(insightsResult.stdout || insightsResult.stderr);

    // Run emotions population
    const emotionsCmd = 'node scripts/populate-emotions.js';
    console.log(`   ▶️ ${emotionsCmd}`);
    const emotionsResult = await exec(emotionsCmd);
    console.log(emotionsResult.stdout || emotionsResult.stderr);

    console.log('\n✨ Insights generation & timeline population complete.');
  } catch (err) {
    console.error('❌ Error triggering insights or timeline scripts:', err?.message || err);
  }
}

// Run the script
insertData().catch(console.error);
