/**
 * Generate Insights from Existing Messages
 * Creates daily_journals and weekly_insights from message data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Calculate mood score from emotion
function getMoodScore(emotion) {
  const scores = {
    joy: 85,
    surprise: 70,
    neutral: 55,
    sadness: 30,
    fear: 25,
    anger: 20,
    disgust: 18
  };
  return scores[emotion] || 50;
}

// Get time segment from hour
function getTimeSegment(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Generate journal text based on emotions
function generateJournalText(emotionCounts, dominantEmotion, themes, date) {
  const emotionDescriptions = {
    joy: ['joyful', 'happy', 'excited', 'delighted'],
    sadness: ['sad', 'down', 'melancholic', 'low'],
    anger: ['frustrated', 'angry', 'irritated', 'annoyed'],
    fear: ['anxious', 'worried', 'nervous', 'concerned'],
    surprise: ['surprised', 'amazed', 'intrigued', 'curious'],
    neutral: ['calm', 'steady', 'balanced', 'composed'],
    disgust: ['bothered', 'disturbed', 'uncomfortable']
  };

  const feelings = emotionDescriptions[dominantEmotion] || ['emotional'];
  const mainFeeling = feelings[Math.floor(Math.random() * feelings.length)];
  
  const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
  const emotionList = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, count]) => `${emotion} (${Math.round(count / totalEmotions * 100)}%)`)
    .join(', ');
  
  const themesList = themes.slice(0, 3).join(', ');
  
  const journalTemplates = [
    `Today I felt predominantly ${mainFeeling}. My conversations centered around ${themesList}. Throughout the day, my emotions ranged across ${emotionList}. It's interesting to reflect on how these different feelings shaped my interactions and thoughts.`,
    
    `Reflecting on today, ${dominantEmotion} was my dominant emotion. I spent time thinking about ${themesList}. The emotional journey included ${emotionList}, showing the complexity of my day.`,
    
    `Today's emotional landscape was primarily colored by ${mainFeeling} feelings. My focus areas included ${themesList}. I experienced a range of emotions: ${emotionList}, each contributing to my understanding of the day's events.`,
    
    `Looking back on ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, I notice ${dominantEmotion} stood out most. Conversations about ${themesList} occupied my thoughts. My emotional state varied between ${emotionList}.`,
  ];
  
  return journalTemplates[Math.floor(Math.random() * journalTemplates.length)];
}

// Generate weekly reflection
function generateWeeklyReflection(weekData, dominantEmotion, avgMoodScore) {
  const emotionTrends = {
    joy: ['positive trajectory', 'uplifting moments', 'bright spots'],
    sadness: ['challenging times', 'difficult moments', 'low points'],
    anger: ['frustrating situations', 'tense moments', 'irritating events'],
    fear: ['anxious periods', 'worrying times', 'uncertain moments'],
    neutral: ['balanced state', 'steady rhythm', 'calm progression'],
    surprise: ['unexpected turns', 'surprising developments', 'new discoveries']
  };

  const trend = emotionTrends[dominantEmotion] || ['various experiences'];
  const moodLevel = avgMoodScore > 70 ? 'high' : avgMoodScore > 40 ? 'moderate' : 'low';
  
  const templates = [
    `This week was marked by ${trend[0]}, with ${dominantEmotion} being the predominant emotion. My overall mood remained ${moodLevel}, averaging ${Math.round(avgMoodScore)}/100. Looking at the daily patterns, I can see how different themes and situations influenced my emotional state throughout the week.`,
    
    `Reflecting on the past seven days, ${dominantEmotion} emerged as the central emotional theme with ${trend[1]}. My mood score averaged ${Math.round(avgMoodScore)}/100, indicating a ${moodLevel} emotional baseline. The week brought a mix of experiences that shaped my emotional journey.`,
    
    `The week showcased ${trend[2]}, with ${dominantEmotion} taking center stage. Maintaining a ${moodLevel} mood level (averaging ${Math.round(avgMoodScore)}/100), I navigated through various emotional landscapes. Each day contributed uniquely to my overall emotional arc.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

async function generateDailyJournals(userId, email) {
  console.log(`\n📅 Generating daily journals for ${email}...`);
  
  // Get all user messages grouped by date
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  if (!messages || messages.length === 0) {
    console.log('No messages found for user');
    return [];
  }
  
  // Group messages by date
  const messagesByDate = {};
  messages.forEach(msg => {
    const date = msg.created_at.split('T')[0];
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(msg);
  });
  
  const journals = [];
  
  for (const [date, dayMessages] of Object.entries(messagesByDate)) {
    // Count emotions
    const emotionCounts = {};
    const themes = new Set();
    const timeSegments = {
      morning: { emotions: [], count: 0 },
      afternoon: { emotions: [], count: 0 },
      evening: { emotions: [], count: 0 },
      night: { emotions: [], count: 0 }
    };
    
    let totalMoodScore = 0;
    
    dayMessages.forEach(msg => {
      if (msg.emotion) {
        emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
        
        // Time segment
        const hour = new Date(msg.created_at).getHours();
        const segment = getTimeSegment(hour);
        timeSegments[segment].emotions.push(msg.emotion);
        timeSegments[segment].count++;
        
        // Mood score
        totalMoodScore += getMoodScore(msg.emotion);
      }
      
      // Themes
      if (msg.metadata && msg.metadata.theme) {
        themes.add(msg.metadata.theme);
      }
    });
    
    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    const avgMoodScore = totalMoodScore / dayMessages.length;
    
    // Build time segments array
    const timeSegmentsArray = Object.entries(timeSegments)
      .filter(([_, data]) => data.count > 0)
      .map(([segment, data]) => {
        const segmentEmotionCounts = {};
        data.emotions.forEach(e => {
          segmentEmotionCounts[e] = (segmentEmotionCounts[e] || 0) + 1;
        });
        const segmentDominant = Object.entries(segmentEmotionCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        
        return {
          segment,
          emotion: segmentDominant,
          count: data.count,
          intensity: Math.min(100, (data.count / dayMessages.length) * 100)
        };
      });
    
    const journalText = generateJournalText(
      emotionCounts, 
      dominantEmotion, 
      Array.from(themes),
      date
    );
    
    journals.push({
      id: generateUUID(),
      user_id: userId,
      date: date,
      dominant_emotion: dominantEmotion,
      mood_score: avgMoodScore,
      journal_text: journalText,
      emotion_counts: emotionCounts,
      time_segments: timeSegmentsArray,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  console.log(`✅ Generated ${journals.length} daily journals`);
  return journals;
}

async function generateWeeklyInsights(userId, email, dailyJournals) {
  console.log(`\n📊 Generating weekly insights for ${email}...`);
  
  if (!dailyJournals || dailyJournals.length === 0) {
    console.log('No daily journals to process');
    return [];
  }
  
  // Sort journals by date
  const sortedJournals = [...dailyJournals].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  // Group by weeks (Monday to Sunday)
  const weekGroups = {};
  
  sortedJournals.forEach(journal => {
    const date = new Date(journal.date);
    // Get Monday of that week
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekStart = monday.toISOString().split('T')[0];
    
    if (!weekGroups[weekStart]) {
      weekGroups[weekStart] = [];
    }
    weekGroups[weekStart].push(journal);
  });
  
  const weeklyInsights = [];
  
  for (const [weekStart, weekJournals] of Object.entries(weekGroups)) {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split('T')[0];
    
    // Aggregate emotions across the week
    const weekEmotionCounts = {};
    let totalMoodScore = 0;
    const dailyArc = [];
    const keyHighlights = [];
    
    weekJournals.forEach(journal => {
      // Emotion counts
      Object.entries(journal.emotion_counts).forEach(([emotion, count]) => {
        weekEmotionCounts[emotion] = (weekEmotionCounts[emotion] || 0) + count;
      });
      
      totalMoodScore += journal.mood_score;
      
      // Daily arc point
      dailyArc.push({
        date: journal.date,
        emotion: journal.dominant_emotion,
        mood_score: Math.round(journal.mood_score)
      });
      
      // Key highlights (days with extreme emotions)
      if (journal.dominant_emotion === 'joy' && journal.mood_score > 80) {
        keyHighlights.push({
          date: journal.date,
          type: 'peak',
          description: `High point: Predominantly joyful day`,
          emotion: 'joy'
        });
      } else if (['sadness', 'fear', 'anger'].includes(journal.dominant_emotion) && journal.mood_score < 35) {
        keyHighlights.push({
          date: journal.date,
          type: 'low',
          description: `Challenging day: Dealing with ${journal.dominant_emotion}`,
          emotion: journal.dominant_emotion
        });
      }
    });
    
    const avgMoodScore = totalMoodScore / weekJournals.length;
    const dominantEmotion = Object.entries(weekEmotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    const reflectionText = generateWeeklyReflection(
      weekJournals,
      dominantEmotion,
      avgMoodScore
    );
    
    weeklyInsights.push({
      id: generateUUID(),
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      dominant_emotion: dominantEmotion,
      avg_mood_score: avgMoodScore,
      reflection_text: reflectionText,
      emotion_summary: weekEmotionCounts,
      daily_arc: dailyArc,
      key_highlights: keyHighlights.slice(0, 5), // Max 5 highlights
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  console.log(`✅ Generated ${weeklyInsights.length} weekly insights`);
  return weeklyInsights;
}

async function insertInsights() {
  console.log('🚀 Starting insights generation from messages...\n');
  
  // Get users
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email');
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }
  
  console.log(`Found ${users.length} users\n`);
  
  for (const user of users) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${user.email}`);
    console.log('='.repeat(60));
    
    // Generate daily journals
    const dailyJournals = await generateDailyJournals(user.id, user.email);
    
    if (dailyJournals.length > 0) {
      // Insert daily journals in batches
      console.log(`\n💾 Inserting daily journals...`);
      for (let i = 0; i < dailyJournals.length; i += 100) {
        const batch = dailyJournals.slice(i, i + 100);
        const { error } = await supabase.from('daily_journals').insert(batch);
        if (error) {
          console.error(`❌ Error inserting daily journals batch ${i}:`, error.message);
        } else {
          console.log(`   ✅ Inserted journals ${i + 1}-${Math.min(i + 100, dailyJournals.length)}`);
        }
      }
      
      // Generate weekly insights
      const weeklyInsights = await generateWeeklyInsights(user.id, user.email, dailyJournals);
      
      if (weeklyInsights.length > 0) {
        // Insert weekly insights
        console.log(`\n💾 Inserting weekly insights...`);
        const { error } = await supabase.from('weekly_insights').insert(weeklyInsights);
        if (error) {
          console.error(`❌ Error inserting weekly insights:`, error.message);
        } else {
          console.log(`   ✅ Inserted ${weeklyInsights.length} weekly insights`);
        }
      }
    }
    
    console.log(`\n✨ Completed insights generation for ${user.email}!`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All insights generated successfully!');
  console.log('='.repeat(60) + '\n');
  
  // Summary
  const { count: dailyCount } = await supabase
    .from('daily_journals')
    .select('id', { count: 'exact', head: true });

  const { count: weeklyCount } = await supabase
    .from('weekly_insights')
    .select('id', { count: 'exact', head: true });
  
  console.log('📊 Summary:');
  console.log(`   Daily Journals: ${dailyCount || 0}`);
  console.log(`   Weekly Insights: ${weeklyCount || 0}`);
}

// Run the script
insertInsights().catch(console.error);
