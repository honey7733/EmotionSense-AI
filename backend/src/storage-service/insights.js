/**
 * Insights Storage Service
 * Handles all database operations for emotion insights, daily journals, and weekly summaries
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

const supabase = createClient(
  config.database.supabase.url, 
  config.database.supabase.serviceRoleKey || config.database.supabase.anonKey
);

/**
 * Get daily insights for a user
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Daily journal entries
 */
async function getDailyInsights(userId, startDate, endDate) {
  try {
    let query = supabase
      .from('daily_journals')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching daily insights:', error);
    throw error;
  }
}

/**
 * Get weekly insights for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of weeks to fetch
 * @returns {Promise<Array>} Weekly insight entries
 */
async function getWeeklyInsights(userId, limit = 4) {
  try {
    const { data, error } = await supabase
      .from('weekly_insights')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching weekly insights:', error);
    throw error;
  }
}

/**
 * Get emotion timeline for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Object>} Timeline with hourly emotion breakdown
 */
async function getEmotionTimeline(userId, date) {
  try {
    // Get all emotions for the specified date
    const { data: emotions, error } = await supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lt('created_at', `${date}T23:59:59Z`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get daily journal for context
    const { data: journal } = await supabase
      .from('daily_journals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    return {
      date,
      emotions: emotions || [],
      journal: journal || null,
      timeline: buildHourlyTimeline(emotions || [])
    };
  } catch (error) {
    console.error('Error fetching emotion timeline:', error);
    throw error;
  }
}

/**
 * Get overall statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
async function getUserStats(userId) {
  try {
    // Get total tracked days
    const { data: journals, error: journalError } = await supabase
      .from('daily_journals')
      .select('date')
      .eq('user_id', userId);

    if (journalError) throw journalError;

    // Get first message date
    const { data: firstMessage, error: messageError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Get emotion distribution
    const { data: emotions, error: emotionError } = await supabase
      .from('emotions')
      .select('emotion')
      .eq('user_id', userId);

    if (emotionError) throw emotionError;

    // Count emotion occurrences
    const emotionCounts = (emotions || []).reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    return {
      trackedDays: journals?.length || 0,
      firstChatDate: firstMessage?.created_at || null,
      totalEmotions: emotions?.length || 0,
      emotionDistribution: emotionCounts
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      trackedDays: 0,
      firstChatDate: null,
      totalEmotions: 0,
      emotionDistribution: {}
    };
  }
}

/**
 * Get key moments for a date range
 * @param {string} userId - User ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Key emotional moments
 */
async function getKeyMoments(userId, startDate, endDate) {
  try {
    // Get high-confidence emotions within date range
    const { data: emotions, error } = await supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('confidence', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!emotions || emotions.length === 0) {
      return [];
    }

    // Get associated messages for context
    const moments = [];
    for (const emotion of emotions.slice(0, 10)) {
      // Find message from same session around the same time
      const { data: messages } = await supabase
        .from('messages')
        .select('content')
        .eq('session_id', emotion.session_id)
        .eq('role', 'user')
        .eq('emotion', emotion.emotion)
        .gte('created_at', new Date(new Date(emotion.created_at).getTime() - 60000).toISOString())
        .lte('created_at', new Date(new Date(emotion.created_at).getTime() + 60000).toISOString())
        .limit(1);

      const context = messages?.[0]?.content?.substring(0, 100) || 'No context available';

      moments.push({
        emotion: emotion.emotion,
        confidence: emotion.confidence,
        timestamp: emotion.created_at,
        context: context
      });
    }

    return moments;
  } catch (error) {
    console.error('Error fetching key moments:', error);
    return [];
  }
}

/**
 * Build hourly timeline from emotions array
 * @param {Array} emotions - Array of emotion records
 * @returns {Array} Hourly breakdown
 */
function buildHourlyTimeline(emotions) {
  const hourlyData = {};

  emotions.forEach(e => {
    const hour = new Date(e.created_at).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        hour,
        emotions: [],
        dominant: null,
        count: 0
      };
    }
    hourlyData[hour].emotions.push(e.emotion);
    hourlyData[hour].count++;
  });

  // Calculate dominant emotion per hour
  Object.keys(hourlyData).forEach(hour => {
    const emotionCounts = hourlyData[hour].emotions.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {});
    
    hourlyData[hour].dominant = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
  });

  return Object.values(hourlyData).sort((a, b) => a.hour - b.hour);
}

/**
 * Create or update daily journal
 * @param {string} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {Object} data - Journal data
 * @returns {Promise<Object>} Created/updated journal
 */
async function upsertDailyJournal(userId, date, data) {
  try {
    const { data: journal, error } = await supabase
      .from('daily_journals')
      .upsert({
        user_id: userId,
        date,
        ...data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;
    return journal;
  } catch (error) {
    console.error('Error upserting daily journal:', error);
    throw error;
  }
}

/**
 * Create or update weekly insight
 * @param {string} userId - User ID
 * @param {string} weekStart - Week start date (YYYY-MM-DD)
 * @param {Object} data - Insight data
 * @returns {Promise<Object>} Created/updated insight
 */
async function upsertWeeklyInsight(userId, weekStart, data) {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: insight, error } = await supabase
      .from('weekly_insights')
      .upsert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd.toISOString().split('T')[0],
        ...data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_start'
      })
      .select()
      .single();

    if (error) throw error;
    return insight;
  } catch (error) {
    console.error('Error upserting weekly insight:', error);
    throw error;
  }
}

export {
  getDailyInsights,
  getWeeklyInsights,
  getEmotionTimeline,
  getUserStats,
  getKeyMoments,
  upsertDailyJournal,
  upsertWeeklyInsight
};
