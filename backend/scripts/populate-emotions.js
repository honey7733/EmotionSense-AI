/**
 * Populate Emotions Table from Messages
 * Creates emotion records for timeline and key moments features
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateUUID() {
  return crypto.randomUUID();
}

async function populateEmotions() {
  console.log('🚀 Populating emotions table from messages...\n');
  
  // Get all user messages with emotions in pages so we don't drop newer rows
  const BATCH = 1000;
  let start = 0;
  let totalFound = 0;
  let allMessages = [];

  while (true) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, user_id, session_id, emotion, emotion_confidence, created_at')
      .eq('role', 'user')
      .not('emotion', 'is', null)
      .order('created_at', { ascending: true })
      .range(start, start + BATCH - 1);

    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }

    if (!messages || messages.length === 0) break;

    allMessages.push(...messages);
    totalFound += messages.length;
    start += BATCH;
    if (messages.length < BATCH) break;
  }
  
  if (!allMessages || allMessages.length === 0) {
    console.log('No messages found with emotions');
    return;
  }
  
  console.log(`Found ${allMessages.length} messages with emotions`);
  
  // Convert messages to emotion records
  const emotions = allMessages.map(msg => ({
    id: generateUUID(),
    user_id: msg.user_id,
    session_id: msg.session_id,
    emotion: msg.emotion,
    confidence: msg.emotion_confidence || 0.8,
    model_used: 'dual-model', // BiLSTM + HuggingFace
    input_type: 'text',
    created_at: msg.created_at
  }));
  
  console.log(`\n💾 Inserting ${emotions.length} emotion records...`);
  
  // Insert in batches of 500
  for (let i = 0; i < emotions.length; i += 500) {
    const batch = emotions.slice(i, i + 500);
    const { error: insertError } = await supabase
      .from('emotions')
      .insert(batch);
    
    if (insertError) {
      console.error(`❌ Error inserting batch ${i}:`, insertError.message);
    } else {
      console.log(`   ✅ Inserted emotions ${i + 1}-${Math.min(i + 500, emotions.length)}`);
    }
  }
  
  // Verify insertion
  const { data: counts, error: countError } = await supabase
    .from('emotions')
    .select('user_id', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error getting count:', countError);
  }
  
  console.log('\n✨ Emotions table populated successfully!');
  console.log(`📊 Total emotions in database: ${counts?.length || 0}`);
  
  // Show breakdown by user
  const { data: userCounts } = await supabase
    .from('profiles')
    .select('id, email');
  
  if (userCounts) {
    console.log('\n📈 Breakdown by user:');
    for (const user of userCounts) {
      const { count } = await supabase
        .from('emotions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      console.log(`   ${user.email}: ${count} emotions`);
    }
  }
}

populateEmotions().catch(console.error);
