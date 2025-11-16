/**
 * Insights Routes
 * Handles all API endpoints for emotion insights, daily journals, and weekly summaries
 */

import express from 'express';
import * as insightsStorage from '../storage-service/insights.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/insights/daily
 * Fetch daily insights for a user
 * Query params: startDate, endDate
 */
router.get('/daily', async (req, res) => {
  try {
    const { userId } = req.query;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const dailyInsights = await insightsStorage.getDailyInsights(userId, startDate, endDate);

    res.json({
      success: true,
      data: {
        insights: dailyInsights,
        count: dailyInsights.length
      }
    });
  } catch (error) {
    logger.error('Error in GET /insights/daily:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily insights',
      message: error.message
    });
  }
});

/**
 * GET /api/insights/weekly
 * Fetch weekly insights for a user
 * Query params: limit (default: 4)
 */
router.get('/weekly', async (req, res) => {
  try {
    const { userId, limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const weeklyInsights = await insightsStorage.getWeeklyInsights(
      userId, 
      limit ? parseInt(limit) : 4
    );

    res.json({
      success: true,
      data: {
        insights: weeklyInsights,
        count: weeklyInsights.length
      }
    });
  } catch (error) {
    logger.error('Error in GET /insights/weekly:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly insights',
      message: error.message
    });
  }
});

/**
 * GET /api/insights/timeline/:date
 * Get emotion timeline for a specific date
 * Params: date (YYYY-MM-DD)
 */
router.get('/timeline/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Valid date (YYYY-MM-DD) is required'
      });
    }

    const timeline = await insightsStorage.getEmotionTimeline(userId, date);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    logger.error('Error in GET /insights/timeline/:date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotion timeline',
      message: error.message
    });
  }
});

/**
 * GET /api/insights/stats
 * Get overall statistics for a user
 */
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const stats = await insightsStorage.getUserStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in GET /insights/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/insights/moments
 * Get key emotional moments for a date range
 * Query params: startDate, endDate
 */
router.get('/moments', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Default to last 7 days if not provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const moments = await insightsStorage.getKeyMoments(userId, start, end);

    res.json({
      success: true,
      data: {
        moments,
        count: moments.length,
        dateRange: { start, end }
      }
    });
  } catch (error) {
    logger.error('Error in GET /insights/moments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch key moments',
      message: error.message
    });
  }
});

/**
 * POST /api/insights/daily
 * Create or update a daily journal entry
 */
router.post('/daily', async (req, res) => {
  try {
    const { userId, date, dominantEmotion, moodScore, journalText, emotionCounts, timeSegments } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        error: 'userId and date are required'
      });
    }

    const journal = await insightsStorage.upsertDailyJournal(userId, date, {
      dominant_emotion: dominantEmotion,
      mood_score: moodScore,
      journal_text: journalText,
      emotion_counts: emotionCounts,
      time_segments: timeSegments
    });

    res.json({
      success: true,
      data: journal
    });
  } catch (error) {
    logger.error('Error in POST /insights/daily:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update daily journal',
      message: error.message
    });
  }
});

/**
 * POST /api/insights/weekly
 * Create or update a weekly insight
 */
router.post('/weekly', async (req, res) => {
  try {
    const { userId, weekStart, dominantEmotion, avgMoodScore, reflectionText, emotionSummary, dailyArc } = req.body;

    if (!userId || !weekStart) {
      return res.status(400).json({
        success: false,
        error: 'userId and weekStart are required'
      });
    }

    const insight = await insightsStorage.upsertWeeklyInsight(userId, weekStart, {
      dominant_emotion: dominantEmotion,
      avg_mood_score: avgMoodScore,
      reflection_text: reflectionText,
      emotion_summary: emotionSummary,
      daily_arc: dailyArc
    });

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    logger.error('Error in POST /insights/weekly:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update weekly insight',
      message: error.message
    });
  }
});

export default router;
