/**
 * Quick test script for insights endpoints
 * Run: node test-insights.js
 */

const API_URL = process.env.API_URL || 'http://localhost:8080';

// Test user ID (replace with actual user ID from your database)
const TEST_USER_ID = 'a38131f7-07b4-4387-89d4-90ca395dafee';

async function testInsightsEndpoints() {
  console.log('🧪 Testing Insights API Endpoints\n');

  try {
    // Test 1: Get user stats
    console.log('1️⃣ Testing GET /api/insights/stats');
    const statsResponse = await fetch(`${API_URL}/api/insights/stats?userId=${TEST_USER_ID}`);
    const statsData = await statsResponse.json();
    console.log('✅ Stats:', statsData.success ? 'Success' : 'Failed');
    console.log('   - Tracked Days:', statsData.data?.trackedDays);
    console.log('   - Total Emotions:', statsData.data?.totalEmotions);
    console.log('');

    // Test 2: Get daily insights
    console.log('2️⃣ Testing GET /api/insights/daily');
    const dailyResponse = await fetch(`${API_URL}/api/insights/daily?userId=${TEST_USER_ID}`);
    const dailyData = await dailyResponse.json();
    console.log('✅ Daily Insights:', dailyData.success ? 'Success' : 'Failed');
    console.log('   - Count:', dailyData.data?.count);
    if (dailyData.data?.insights?.length > 0) {
      const latest = dailyData.data.insights[0];
      console.log('   - Latest Date:', latest.date);
      console.log('   - Dominant Emotion:', latest.dominant_emotion);
      console.log('   - Mood Score:', Math.round(latest.mood_score));
    }
    console.log('');

    // Test 3: Get weekly insights
    console.log('3️⃣ Testing GET /api/insights/weekly');
    const weeklyResponse = await fetch(`${API_URL}/api/insights/weekly?userId=${TEST_USER_ID}&limit=2`);
    const weeklyData = await weeklyResponse.json();
    console.log('✅ Weekly Insights:', weeklyData.success ? 'Success' : 'Failed');
    console.log('   - Count:', weeklyData.data?.count);
    if (weeklyData.data?.insights?.length > 0) {
      const latest = weeklyData.data.insights[0];
      console.log('   - Week:', latest.week_start, 'to', latest.week_end);
      console.log('   - Dominant Emotion:', latest.dominant_emotion);
      console.log('   - Avg Mood Score:', Math.round(latest.avg_mood_score));
    }
    console.log('');

    // Test 4: Get key moments
    console.log('4️⃣ Testing GET /api/insights/moments');
    const momentsResponse = await fetch(`${API_URL}/api/insights/moments?userId=${TEST_USER_ID}`);
    const momentsData = await momentsResponse.json();
    console.log('✅ Key Moments:', momentsData.success ? 'Success' : 'Failed');
    console.log('   - Count:', momentsData.data?.count);
    console.log('');

    // Test 5: Get timeline for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`5️⃣ Testing GET /api/insights/timeline/${today}`);
    const timelineResponse = await fetch(`${API_URL}/api/insights/timeline/${today}?userId=${TEST_USER_ID}`);
    const timelineData = await timelineResponse.json();
    console.log('✅ Timeline:', timelineData.success ? 'Success' : 'Failed');
    if (timelineData.data) {
      console.log('   - Date:', timelineData.data.date);
      console.log('   - Emotions Count:', timelineData.data.emotions?.length || 0);
      console.log('   - Has Journal:', !!timelineData.data.journal);
    }
    console.log('');

    console.log('✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run tests
testInsightsEndpoints();
