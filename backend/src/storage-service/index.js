/**
 * Storage Service Module
 * Handles data persistence for emotion analysis results
 * 
 * This module:
 * 1. Stores emotion detection results
 * 2. Stores transcripts and audio metadata
 * 3. Supports Supabase and SQLite
 * 4. Provides retrieval and query functions
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

/**
 * Initialize Supabase client (if configured)
 */
let supabaseClient = null;

const ensureSupabaseClient = async () => {
  if (!supabaseClient) {
    await initializeSupabase();
  }

  if (!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  return supabaseClient;
};

const parseJsonField = (value, fallback = null) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('⚠️ Failed to parse JSON field, returning fallback');
    return fallback;
  }
};

const normalizeMessageRow = (row) => {
  if (!row) {
    return row;
  }

  const content = row.content ?? row.message ?? '';
  const emotion = row.emotion ?? row.emotion_detected ?? null;
  const emotionConfidence =
    row.emotion_confidence ?? row.confidence_score ?? null;
  const metadata = parseJsonField(row.metadata, {});
  const audioUrl = row.audio_url ?? row.audioUrl ?? null;

  return {
    ...row,
    content,
    message: content,
    emotion,
    emotion_detected: emotion,
    emotion_confidence: emotionConfidence,
    confidence_score: emotionConfidence,
    metadata,
    audio_url: audioUrl,
    audioUrl
  };
};

export const initializeSupabase = async () => {
  try {
    if (config.database.type !== 'supabase') {
      return null;
    }

    console.log('� Initializing Supabase...');

    const supabaseUrl = config.database.supabase.url;
    const supabaseKey = config.database.supabase.serviceRoleKey || config.database.supabase.anonKey;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Test the connection - use a simpler test that doesn't depend on specific tables
    try {
      const { data, error } = await supabaseClient.from('emotion_analysis').select('count').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('table') || error.message.includes('schema cache')) {
          console.log('⚠️ emotion_analysis table not found - this is OK if running for the first time');
          console.log('📝 Please run the database migration script to create all required tables');
        } else {
          console.error('❌ Supabase connection test failed:', error.message);
          return null;
        }
      }
    } catch (testError) {
      console.log('⚠️ Connection test failed but continuing - this may be a first-time setup');
      console.log('📝 If you see persistent errors, please run the database migration script');
    }

    console.log('✅ Supabase initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error.message);
    return null;
  }
};

/**
 * Initialize SQLite (if configured)
 * TODO: Implement actual SQLite initialization
 */
let sqliteDb = null;

export const initializeSQLite = async () => {
  try {
    if (config.database.type !== 'sqlite') {
      return null;
    }

    console.log('💾 Initializing SQLite...');

    // TODO: Implement SQLite initialization
    // const sqlite3 = require('sqlite3').verbose();
    // sqliteDb = new sqlite3.Database(config.database.sqlite.dbPath);
    
    // Create tables if they don't exist
    // const createTableQuery = `
    //   CREATE TABLE IF NOT EXISTS emotion_analysis (
    //     id TEXT PRIMARY KEY,
    //     userId TEXT,
    //     type TEXT,
    //     input TEXT,
    //     transcript TEXT,
    //     emotion TEXT,
    //     confidence REAL,
    //     scores TEXT,
    //     timestamp TEXT
    //   )
    // `;
    // sqliteDb.run(createTableQuery);

    console.log('✅ SQLite initialized');
    return sqliteDb;
  } catch (error) {
    console.error('❌ Error initializing SQLite:', error.message);
    return null;
  }
};

/**
 * Save analysis result to Supabase
 */
export const saveToSupabase = async (data) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const recordId = data.id || uuidv4();
    
    // Prepare data for Supabase (FIXED: JSONB fields should be objects, not strings)
    const record = {
      id: recordId,
      user_id: data.userId,
      type: data.type,
      input_text: data.input ? (typeof data.input === 'string' ? data.input : JSON.stringify(data.input)) : null,
      transcript: data.transcript || null,
      emotion: data.emotion,
      confidence: data.confidence,
      scores: data.scores || null,  // FIXED: Keep as object for JSONB
      timestamp: data.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Only add audio_features if the column exists and data is provided
    if (data.audioFeatures) {
      record.audio_features = data.audioFeatures;
    }

    const { error } = await supabaseClient
      .from('emotion_analysis')
      .insert(record);

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log(`✅ Saved to Supabase: ${recordId}`);
    return recordId;
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error.message);
    throw error;
  }
};

/**
 * Save analysis result to SQLite
 */
export const saveToSQLite = async (data) => {
  try {
    if (!sqliteDb) {
      await initializeSQLite();
    }

    if (!sqliteDb) {
      throw new Error('SQLite not initialized');
    }

    const recordId = data.id || uuidv4();

    // TODO: Implement actual SQLite save
    // const query = `
    //   INSERT INTO emotion_analysis (id, userId, type, input, transcript, emotion, confidence, scores, timestamp)
    //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    // `;
    // const params = [
    //   recordId,
    //   data.userId,
    //   data.type,
    //   JSON.stringify(data.input),
    //   data.transcript || null,
    //   data.emotion,
    //   data.confidence,
    //   JSON.stringify(data.scores),
    //   data.timestamp
    // ];
    // sqliteDb.run(query, params);

    console.log(`✅ Saved to SQLite: ${recordId}`);
    return recordId;
  } catch (error) {
    console.error('❌ Error saving to SQLite:', error.message);
    throw error;
  }
};

/**
 * Chat Session and Message Management Functions
 */

/**
 * Create a new chat session
 */
export const createChatSession = async (userId, sessionTitle = 'New Chat') => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('chat_sessions')
      .insert({
        user_id: userId,
        session_title: sessionTitle
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    console.log(`✅ Created chat session: ${data.id}`);
    return data;
  } catch (error) {
    console.error('❌ Error creating chat session:', error.message);
    throw error;
  }
};

/**
 * Save a chat message to a session
 */
export const saveChatMessage = async (userId, sessionId, role, message, emotionData = null) => {
  try {
    const client = await ensureSupabaseClient();

    const messageData = {
      user_id: userId,
      session_id: sessionId,
      role,
      content: message
    };

    if (emotionData && typeof emotionData === 'object') {
      const {
        emotion = null,
        confidence = null,
        audioUrl = null,
        audio_url: legacyAudioUrl = null,
        metadata: existingMetadata = null,
        ...metadataRest
      } = emotionData;

      if (emotion) {
        messageData.emotion = emotion;
      }

      if (confidence !== undefined && confidence !== null) {
        messageData.emotion_confidence = confidence;
      }

      const resolvedAudioUrl = audioUrl || legacyAudioUrl;
      if (resolvedAudioUrl) {
        messageData.audio_url = resolvedAudioUrl;
      }

      const mergedMetadata = {
        ...(existingMetadata && typeof existingMetadata === 'object' ? existingMetadata : {}),
        ...Object.fromEntries(
          Object.entries(metadataRest).filter(([, value]) => value !== undefined)
        )
      };

      if (Object.keys(mergedMetadata).length > 0) {
        messageData.metadata = mergedMetadata;
      }
    }

    console.log('📋 Attempting to insert message with fields:', Object.keys(messageData));

    const { data, error } = await client
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save message:', error);
      throw new Error(`Failed to save message: ${error.message}`);
    }

    const normalized = normalizeMessageRow(data);
    console.log(`✅ Saved chat message: ${normalized.id}`);
    return normalized;
  } catch (error) {
    console.error('❌ Error saving chat message:', error.message);
    throw error;
  }
};

/**
 * Get chat sessions for a user
 */
export const getUserChatSessions = async (userId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error fetching chat sessions:', error.message);
    throw error;
  }
};

/**
 * Get messages for a specific chat session
 */
export const getChatMessages = async (userId, sessionId, limit = null) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    let query = supabaseClient
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return (data || []).map(normalizeMessageRow);
  } catch (error) {
    console.error('❌ Error fetching chat messages:', error.message);
    throw error;
  }
};

/**
 * Get recent chat messages for context (for LLM memory)
 */
export const getRecentChatMessages = async (userId, sessionId, limit = 10) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('messages')
      .select('id, user_id, session_id, role, content, emotion, emotion_confidence, metadata, audio_url, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent messages: ${error.message}`);
    }

    // Return in chronological order (oldest first) for context
    return (data || []).map(normalizeMessageRow).reverse();
  } catch (error) {
    console.error('❌ Error fetching recent chat messages:', error.message);
    throw error;
  }
};

/**
 * Update session title
 */
export const updateChatSessionTitle = async (userId, sessionId, newTitle) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('chat_sessions')
      .update({ session_title: newTitle })
      .eq('user_id', userId)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session title: ${error.message}`);
    }

    console.log(`✅ Updated session title: ${sessionId}`);
    return data;
  } catch (error) {
    console.error('❌ Error updating session title:', error.message);
    throw error;
  }
};

/**
 * Delete a chat session and all its messages
 */
export const deleteChatSession = async (userId, sessionId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    // Delete messages first (due to foreign key constraint)
    const { error: messagesError } = await supabaseClient
      .from('messages')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (messagesError) {
      throw new Error(`Failed to delete messages: ${messagesError.message}`);
    }

    // Delete session
    const { error: sessionError } = await supabaseClient
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('id', sessionId);

    if (sessionError) {
      throw new Error(`Failed to delete session: ${sessionError.message}`);
    }

    console.log(`✅ Deleted chat session: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting chat session:', error.message);
    throw error;
  }
};

/**
 * Main function: Save analysis result
 * This is the primary export used by routes
 */
export const saveAnalysisResult = async (data) => {
  console.log(`💾 Saving analysis result...`);

  try {
    let recordId;

    // Save to configured database
    switch (config.database.type) {
      case 'supabase':
        recordId = await saveToSupabase(data);
        break;
      case 'sqlite':
        recordId = await saveToSQLite(data);
        break;
      default:
        console.warn(`⚠️  Unknown database type: ${config.database.type}, skipping save`);
        recordId = null;
    }

    return recordId;
  } catch (error) {
    console.error('❌ Failed to save analysis result:', error.message);
    // Don't throw - storage failure shouldn't break the API response
    return null;
  }
};

/**
 * Retrieve analysis results by user ID
 */
export const getAnalysisResultsByUser = async (userId, limit = 10) => {
  console.log(`🔍 Retrieving analysis results for user: ${userId}`);

  try {
    let results = [];

    if (config.database.type === 'supabase' && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('emotion_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      // Transform snake_case to camelCase for consistency
      results = data.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        input: row.input_text,
        transcript: row.transcript,
        emotion: row.emotion,
        confidence: row.confidence,
        scores: row.scores ? JSON.parse(row.scores) : null,
        audioFeatures: row.audio_features ? JSON.parse(row.audio_features) : null,
        timestamp: row.timestamp,
        createdAt: row.created_at
      }));
    } else if (config.database.type === 'sqlite' && sqliteDb) {
      // TODO: Implement SQLite query
      // const query = `SELECT * FROM emotion_analysis WHERE userId = ? ORDER BY timestamp DESC LIMIT ?`;
      // results = await new Promise((resolve, reject) => {
      //   sqliteDb.all(query, [userId, limit], (err, rows) => {
      //     if (err) reject(err);
      //     else resolve(rows);
      //   });
      // });
    }

    console.log(`✅ Retrieved ${results.length} results`);
    return results;
  } catch (error) {
    console.error('❌ Error retrieving analysis results:', error.message);
    throw error;
  }
};

/**
 * Retrieve analysis result by ID
 */
export const getAnalysisResultById = async (recordId) => {
  console.log(`🔍 Retrieving analysis result: ${recordId}`);

  try {
    let result = null;

    if (config.database.type === 'supabase' && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('emotion_analysis')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (data) {
        // Transform snake_case to camelCase for consistency
        result = {
          id: data.id,
          userId: data.user_id,
          type: data.type,
          input: data.input_text,
          transcript: data.transcript,
          emotion: data.emotion,
          confidence: data.confidence,
          scores: data.scores ? JSON.parse(data.scores) : null,
          audioFeatures: data.audio_features ? JSON.parse(data.audio_features) : null,
          timestamp: data.timestamp,
          createdAt: data.created_at
        };
      }
    } else if (config.database.type === 'sqlite' && sqliteDb) {
      // TODO: Implement SQLite query
      // const query = `SELECT * FROM emotion_analysis WHERE id = ?`;
      // result = await new Promise((resolve, reject) => {
      //   sqliteDb.get(query, [recordId], (err, row) => {
      //     if (err) reject(err);
      //     else resolve(row);
      //   });
      // });
    }

    if (result) {
      console.log(`✅ Found result: ${recordId}`);
    } else {
      console.log(`⚠️  Result not found: ${recordId}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Error retrieving analysis result:', error.message);
    throw error;
  }
};

/**
 * Delete old analysis results (cleanup)
 */
export const deleteOldResults = async (daysOld = 30) => {
  console.log(`🗑️  Deleting results older than ${daysOld} days...`);

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = cutoffDate.toISOString();

    let deletedCount = 0;

    if (config.database.type === 'supabase' && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('emotion_analysis')
        .delete()
        .lt('timestamp', cutoffTimestamp)
        .select('id');

      if (error) {
        throw new Error(`Supabase deletion failed: ${error.message}`);
      }

      deletedCount = data ? data.length : 0;
    } else if (config.database.type === 'sqlite' && sqliteDb) {
      // TODO: Implement SQLite deletion
      // const query = `DELETE FROM emotion_analysis WHERE timestamp < ?`;
      // deletedCount = await new Promise((resolve, reject) => {
      //   sqliteDb.run(query, [cutoffTimestamp], function(err) {
      //     if (err) reject(err);
      //     else resolve(this.changes);
      //   });
      // });
    }

    console.log(`✅ Deleted ${deletedCount} old results`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error deleting old results:', error.message);
    throw error;
  }
};

/**
 * User Profile Management Functions
 */

/**
 * Get user profile by user ID
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} - User profile object or null
 */
/**
 * Get user profile by user ID
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} - User profile object or null
 */
export const getUserProfile = async (userId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    // First try to get from profiles table
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let userProfile = null;

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn(`⚠️ Failed to fetch user profile from profiles table: ${profileError.message}`);
    } else if (profileData) {
      userProfile = profileData;
    }

    // If no email found in profile, try to get from auth.users table (requires service role key)
    if (!userProfile?.email && config.database.supabase.serviceRoleKey) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
        
        if (!authError && authData?.user) {
          // Merge profile data with auth email
          userProfile = {
            ...userProfile,
            email: authData.user.email,
            auth_email: authData.user.email, // Store as backup
            phone: authData.user.phone || userProfile?.phone
          };
        }
      } catch (authError) {
        console.warn(`⚠️ Could not fetch auth data: ${authError.message}`);
      }
    }

    return userProfile || null;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error.message);
    return null;
  }
};

/**
 * Emergency Contact Management Functions
 */

/**
 * Get emergency contact for a user
 */
export const getEmergencyContact = async (userId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch emergency contact: ${error.message}`);
    }

    return data || null;
  } catch (error) {
    console.error('❌ Error fetching emergency contact:', error.message);
    return null;
  }
};

/**
 * Check if user has an emergency contact
 */
export const hasEmergencyContact = async (userId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error, count } = await supabaseClient
      .from('emergency_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking emergency contact:', error.message);
      return false;
    }

    return count && count > 0;
  } catch (error) {
    console.error('❌ Error checking emergency contact:', error.message);
    return false;
  }
};

/**
 * Create or update emergency contact
 */
export const createOrUpdateEmergencyContact = async (userId, contactName, contactEmail, contactPhone = null) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    // Check if contact already exists
    const existing = await getEmergencyContact(userId);

    let data, error;

    if (existing) {
      // Update existing contact
      const result = await supabaseClient
        .from('emergency_contacts')
        .update({
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Create new contact
      const result = await supabaseClient
        .from('emergency_contacts')
        .insert({
          user_id: userId,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(`Failed to save emergency contact: ${error.message}`);
    }

    console.log(`✅ Emergency contact saved for user: ${userId}`);
    return data;
  } catch (error) {
    console.error('❌ Error saving emergency contact:', error.message);
    throw error;
  }
};

/**
 * Delete emergency contact
 */
export const deleteEmergencyContact = async (userId) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await supabaseClient
      .from('emergency_contacts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete emergency contact: ${error.message}`);
    }

    console.log(`✅ Emergency contact deleted for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting emergency contact:', error.message);
    throw error;
  }
};

/**
 * Log safety alert event
 */
export const logSafetyAlert = async (userId, detectedEmotion, messageText, emergencyContactId = null, alertSent = false) => {
  try {
    if (!supabaseClient) {
      await initializeSupabase();
    }

    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabaseClient
      .from('safety_alerts')
      .insert({
        user_id: userId,
        emergency_contact_id: emergencyContactId,
        detected_emotion: detectedEmotion,
        message_text: messageText,
        alert_sent: alertSent,
        alert_sent_at: alertSent ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log safety alert: ${error.message}`);
    }

    console.log(`✅ Safety alert logged for user: ${userId}`);
    return data;
  } catch (error) {
    console.error('❌ Error logging safety alert:', error.message);
    return null;
  }
};

const transformAnalysisRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  input: row.input_text,
  transcript: row.transcript,
  emotion: row.emotion,
  confidence: row.confidence,
  scores: parseJsonField(row.scores, {}),
  audioFeatures: parseJsonField(row.audio_features, null),
  timestamp: row.timestamp,
  createdAt: row.created_at
});

const transformDailySummaryRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  date: row.date,
  dominantEmotion: row.dominant_emotion,
  emotionDistribution: parseJsonField(row.emotion_distribution, {}),
  moodScore: row.mood_score !== null && row.mood_score !== undefined ? Number(row.mood_score) : null,
  totalEntries: row.total_entries ?? 0,
  timeSegments: parseJsonField(row.time_segments, []),
  trendPoints: parseJsonField(row.trend_points, []),
  compassPoints: parseJsonField(row.compass_points, []),
  emotionFlow: parseJsonField(row.emotion_flow, []),
  segmentSummary: parseJsonField(row.segment_summary, []),
  keyMoments: parseJsonField(row.key_moments, []),
  summaryText: row.summary_text,
  eJournalEntry: row.ejournal_entry,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const transformWeeklySummaryRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  weekStart: row.week_start,
  weekEnd: row.week_end,
  dominantEmotion: row.dominant_emotion,
  weeklyArc: parseJsonField(row.weekly_arc, []),
  averageMoodScore: row.average_mood_score !== null && row.average_mood_score !== undefined ? Number(row.average_mood_score) : null,
  keyHighlights: parseJsonField(row.key_highlights, []),
  weeklyMomentFlow: parseJsonField(row.weekly_moment_flow, []),
  weeklyReflection: row.weekly_reflection,
  weeklySummaryText: row.weekly_summary_text,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getEmotionAnalysisByDateRange = async (userId, startISO, endISO) => {
  if (config.database.type !== 'supabase') {
    return [];
  }

  const client = await ensureSupabaseClient();

  const { data, error } = await client
    .from('emotion_analysis')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startISO)
    .lte('timestamp', endISO)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch analysis range: ${error.message}`);
  }

  return (data || []).map(transformAnalysisRow);
};

export const getUserMessagesByDateRange = async (userId, startISO, endISO) => {
  if (config.database.type !== 'supabase') {
    return [];
  }

  const client = await ensureSupabaseClient();

  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch chat messages for range: ${error.message}`);
  }

  return (data || []).map(normalizeMessageRow);
};

export const getEarliestUserMessageDate = async (userId) => {
  if (config.database.type !== 'supabase') {
    return null;
  }

  const client = await ensureSupabaseClient();

  const { data, error } = await client
    .from('messages')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch earliest message: ${error.message}`);
  }

  return data?.created_at || null;
};

export const replaceEmotionFlowSegments = async (userId, dateISO, segments = []) => {
  if (config.database.type !== 'supabase') {
    return segments;
  }

  const client = await ensureSupabaseClient();

  await client
    .from('emotion_flow_segments')
    .delete()
    .eq('user_id', userId)
    .eq('date', dateISO);

  if (!segments.length) {
    return [];
  }

  const payload = segments.map((segment) => ({
    id: segment.id || uuidv4(),
    user_id: userId,
    date: dateISO,
    segment: segment.segment?.toLowerCase() || null,
    dominant_emotion: segment.dominantEmotion || segment.emotion || null,
    intensity: segment.intensity ?? null,
    summary: segment.summary || null
  }));

  const { error } = await client.from('emotion_flow_segments').insert(payload);

  if (error) {
    throw new Error(`Failed to upsert emotion flow segments: ${error.message}`);
  }

  return payload;
};

export const getDailyEmotionSummary = async (userId, dateISO) => {
  if (config.database.type !== 'supabase') {
    return null;
  }

  const client = await ensureSupabaseClient();

  const { data, error } = await client
    .from('daily_emotion_summary')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateISO)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch daily summary: ${error.message}`);
  }

  return data ? transformDailySummaryRow(data) : null;
};

export const upsertDailyEmotionSummary = async (payload) => {
  if (config.database.type !== 'supabase') {
    return payload;
  }

  const client = await ensureSupabaseClient();
  const recordId = payload.id || uuidv4();
  const timestamp = new Date().toISOString();

  const record = {
    id: recordId,
    user_id: payload.userId,
    date: payload.date,
    dominant_emotion: payload.dominantEmotion,
    emotion_distribution: payload.emotionDistribution || {},
    mood_score: payload.moodScore,
    total_entries: payload.totalEntries ?? 0,
    time_segments: payload.timeSegments || [],
    trend_points: payload.trendPoints || [],
    compass_points: payload.compassPoints || [],
    emotion_flow: payload.emotionFlow || [],
    segment_summary: payload.segmentSummary || [],
    key_moments: payload.keyMoments || [],
    summary_text: payload.summaryText || null,
    ejournal_entry: payload.eJournalEntry || null,
    created_at: payload.createdAt || timestamp,
    updated_at: timestamp
  };

  const { data, error } = await client
    .from('daily_emotion_summary')
    .upsert(record, { onConflict: 'user_id,date' })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to upsert daily summary: ${error.message}`);
  }

  return data ? transformDailySummaryRow(data) : transformDailySummaryRow(record);
};

export const listDailyEmotionSummaries = async (userId, limit = 3650) => {
  if (config.database.type !== 'supabase') {
    return [];
  }

  const client = await ensureSupabaseClient();

  // If limit is very large or explicitly unlimited, fetch all without .limit()
  let query = client
    .from('daily_emotion_summary')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (limit < 10000) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list daily summaries: ${error.message}`);
  }

  return (data || []).map(transformDailySummaryRow);
};

export const getWeeklyEmotionSummary = async (userId, weekStartISO, weekEndISO) => {
  if (config.database.type !== 'supabase') {
    return null;
  }

  const client = await ensureSupabaseClient();

  const { data, error } = await client
    .from('weekly_emotion_summary')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStartISO)
    .eq('week_end', weekEndISO)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch weekly summary: ${error.message}`);
  }

  return data ? transformWeeklySummaryRow(data) : null;
};

export const upsertWeeklyEmotionSummary = async (payload) => {
  if (config.database.type !== 'supabase') {
    return payload;
  }

  const client = await ensureSupabaseClient();
  const recordId = payload.id || uuidv4();
  const timestamp = new Date().toISOString();

  const record = {
    id: recordId,
    user_id: payload.userId,
    week_start: payload.weekStart,
    week_end: payload.weekEnd,
    dominant_emotion: payload.dominantEmotion,
    weekly_arc: payload.weeklyArc || [],
    average_mood_score: payload.averageMoodScore,
    key_highlights: payload.keyHighlights || [],
    weekly_moment_flow: payload.weeklyMomentFlow || [],
    weekly_reflection: payload.weeklyReflection || null,
    weekly_summary_text: payload.weeklySummaryText || null,
    created_at: payload.createdAt || timestamp,
    updated_at: timestamp
  };

  const { data, error } = await client
    .from('weekly_emotion_summary')
    .upsert(record, { onConflict: 'user_id,week_start,week_end' })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to upsert weekly summary: ${error.message}`);
  }

  return data ? transformWeeklySummaryRow(data) : transformWeeklySummaryRow(record);
};

export const listWeeklyEmotionSummaries = async (userId, limit = 500) => {
  if (config.database.type !== 'supabase') {
    return [];
  }

  const client = await ensureSupabaseClient();

  // If limit is very large or explicitly unlimited, fetch all without .limit()
  let query = client
    .from('weekly_emotion_summary')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false });

  if (limit < 10000) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list weekly summaries: ${error.message}`);
  }

  return (data || []).map(transformWeeklySummaryRow);
};

export const getRecentKeyMoments = async (userId, lookbackDays = 30) => {
  const summaries = await listDailyEmotionSummaries(userId, lookbackDays + 5);

  const moments = summaries.flatMap((summary) =>
    (summary.emotionFlow || []).map((flow, index) => ({
      id: flow.id || `${summary.date}-${flow.segment || index}`,
      emotion: flow.emotion,
      intensity: flow.intensity,
      timestamp: summary.date,
      excerpt: flow.summary,
      timeOfDay: flow.segment,
      date: summary.date,
      summaryId: summary.id
    }))
  );

  return moments.sort((a, b) => {
    const intensityA = typeof a.intensity === 'number' ? a.intensity : 0;
    const intensityB = typeof b.intensity === 'number' ? b.intensity : 0;
    return intensityB - intensityA;
  });
};
