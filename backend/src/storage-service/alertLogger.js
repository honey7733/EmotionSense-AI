/**
 * Alert Logger Utility
 * Handles logging of emergency alerts to Supabase alert_logs table
 * Provides audit trail for all emergency notifications sent
 */

import { supabaseClient, initializeSupabase } from './index.js';

let supabase = null;

/**
 * Initialize Supabase for alert logging
 * @returns {Promise<Object|null>} - Supabase client or null
 */
const initializeAlertLogger = async () => {
  if (!supabase) {
    supabase = await initializeSupabase();
  }
  return supabase;
};

/**
 * Log an alert event to the alert_logs table
 * Creates a permanent audit trail of emergency notifications
 *
 * @param {string} userId - User ID (UUID)
 * @param {string} contactEmail - Emergency contact's email
 * @param {string} messageText - User's message that triggered alert (truncated to 1000 chars)
 * @param {string} alertType - Type of alert (default: 'emotional_distress')
 * @param {Object} additionalData - Optional additional data to log
 * @returns {Promise<Object|null>} - Logged alert record or null on error
 */
export const logAlertEvent = async (
  userId,
  contactEmail,
  messageText,
  alertType = 'emotional_distress',
  additionalData = {}
) => {
  try {
    // Initialize Supabase if needed
    const client = await initializeAlertLogger();

    if (!client) {
      console.warn('⚠️ Supabase not initialized - cannot log alert');
      return null;
    }

    // Truncate message to first 1000 characters
    const messageExcerpt = messageText
      ? messageText.slice(0, 1000) + (messageText.length > 1000 ? '...' : '')
      : null;

    // Prepare alert log entry
    const alertLogEntry = {
      user_id: userId,
      contact_email: contactEmail,
      alert_type: alertType,
      message_excerpt: messageExcerpt,
      additional_data: additionalData || null,
      created_at: new Date().toISOString()
    };

    console.log(`📝 Logging alert event to alert_logs table...`);

    // Insert into alert_logs table
    const { data, error } = await client
      .from('alert_logs')
      .insert([alertLogEntry])
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting alert log:', error.message);
      console.log('   This may be because the alert_logs table does not exist yet.');
      console.log('   Run the migration: backend/migrations/create_alert_logs_table.sql');
      return null;
    }

    console.log(`✅ Alert logged successfully with ID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error('❌ Unexpected error logging alert:', error.message);
    return null;
  }
};

/**
 * Fetch all alerts for a specific user
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Maximum number of records to fetch (default: 50)
 * @param {number} offset - Number of records to skip for pagination (default: 0)
 * @returns {Promise<Array|null>} - Array of alert records or null on error
 */
export const getAlertHistoryForUser = async (userId, limit = 50, offset = 0) => {
  try {
    const client = await initializeAlertLogger();

    if (!client) {
      console.warn('⚠️ Supabase not initialized');
      return null;
    }

    const { data, error } = await client
      .from('alert_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching alert history:', error.message);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Unexpected error fetching alert history:', error.message);
    return null;
  }
};

/**
 * Get statistics about alerts for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} - Statistics object or null on error
 */
export const getAlertStatistics = async (userId) => {
  try {
    const client = await initializeAlertLogger();

    if (!client) {
      console.warn('⚠️ Supabase not initialized');
      return null;
    }

    // Get total count
    const { count: totalAlerts, error: countError } = await client
      .from('alert_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('❌ Error counting alerts:', countError.message);
      return null;
    }

    // Get count from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: alertsLast24h, error: count24hError } = await client
      .from('alert_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo);

    if (count24hError) {
      console.error('❌ Error counting 24h alerts:', count24hError.message);
    }

    // Get unique contact emails that have been alerted
    const { data: contactEmails, error: contactError } = await client
      .from('alert_logs')
      .select('contact_email', { distinct: true })
      .eq('user_id', userId);

    if (contactError) {
      console.error('❌ Error fetching contact emails:', contactError.message);
    }

    return {
      totalAlerts: totalAlerts || 0,
      alertsLast24h: alertsLast24h || 0,
      uniqueContactsAlerted: contactEmails?.length || 0,
      lastAlertTime: null // Will be fetched if needed
    };
  } catch (error) {
    console.error('❌ Unexpected error getting alert statistics:', error.message);
    return null;
  }
};

/**
 * Delete old alerts (for data cleanup)
 * @param {number} daysOld - Delete alerts older than this many days
 * @returns {Promise<number|null>} - Number of deleted records or null on error
 */
export const deleteOldAlerts = async (daysOld = 90) => {
  try {
    const client = await initializeAlertLogger();

    if (!client) {
      console.warn('⚠️ Supabase not initialized');
      return null;
    }

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    console.log(`🗑️ Deleting alerts older than ${daysOld} days (before ${cutoffDate})`);

    const { data, error, count } = await client
      .from('alert_logs')
      .delete()
      .lt('created_at', cutoffDate);

    if (error) {
      console.error('❌ Error deleting old alerts:', error.message);
      return null;
    }

    console.log(`✅ Deleted ${count} old alert records`);
    return count;
  } catch (error) {
    console.error('❌ Unexpected error deleting old alerts:', error.message);
    return null;
  }
};

export default {
  logAlertEvent,
  getAlertHistoryForUser,
  getAlertStatistics,
  deleteOldAlerts
};
