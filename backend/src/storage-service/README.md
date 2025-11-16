# Storage Service Module

## Overview
This module handles data persistence for emotion analysis results, transcripts, and related metadata.

## Supported Databases

### 1. Supabase (Cloud, Recommended for Production)
- PostgreSQL database
- Real-time subscriptions
- Built-in authentication
- Auto-generated APIs
- Dashboard and SQL editor
- Row Level Security (RLS)

### 2. SQLite (Local, Good for Development)
- File-based database
- No server required
- Lightweight and fast
- Good for local testing
- Single file storage

## Data Model

### Emotion Analysis Record
```javascript
{
  id: "uuid",
  userId: "user123",
  type: "text" | "voice" | "multimodal",
  input: "text or filename",
  transcript: "speech transcript",
  emotion: "happy",
  confidence: 0.85,
  scores: { happy: 0.85, sad: 0.10, ... },
  audioFeatures: { ... }, // for voice analysis
  timestamp: "2025-10-15T10:30:00Z"
}
```

## Features
- Save emotion analysis results
- Retrieve results by user ID
- Retrieve results by record ID
- Query historical data
- Automatic cleanup of old data
- Support for both Firestore and SQLite

## Usage

```javascript
import { saveAnalysisResult, getAnalysisResultsByUser } from './storage-service/index.js';

// Save result
const recordId = await saveAnalysisResult({
  userId: "user123",
  type: "text",
  input: "I'm feeling happy!",
  emotion: "happy",
  confidence: 0.85,
  scores: { happy: 0.85, sad: 0.10 },
  timestamp: new Date().toISOString()
});

// Retrieve user's history
const history = await getAnalysisResultsByUser("user123", 10);
```

## Configuration
Set the following in `.env`:

### Supabase
- `DATABASE_TYPE`: 'supabase'
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key (for client-side use)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for server-side use, recommended)

### SQLite
- `DATABASE_TYPE`: 'sqlite'
- `SQLITE_DB_PATH`: Path to database file (default: ./data/emotions.db)

## API Functions

### saveAnalysisResult(data)
Saves an emotion analysis result to the configured database.

**Parameters:**
- `data`: Object containing analysis result

**Returns:** Record ID (string)

### getAnalysisResultsByUser(userId, limit)
Retrieves analysis results for a specific user.

**Parameters:**
- `userId`: User identifier (string)
- `limit`: Maximum number of results (number, default: 10)

**Returns:** Array of analysis records

### getAnalysisResultById(recordId)
Retrieves a specific analysis result by ID.

**Parameters:**
- `recordId`: Record identifier (string)

**Returns:** Analysis record object

### deleteOldResults(daysOld)
Deletes analysis results older than specified days.

**Parameters:**
- `daysOld`: Age threshold in days (number, default: 30)

**Returns:** Number of deleted records

## Setting Up Databases

### Firestore Setup
1. Create Firebase project
2. Enable Firestore database
3. Create service account and download JSON key
4. Add credentials to `.env`

### SQLite Setup
1. Set `DATABASE_TYPE=sqlite` in `.env`
2. Database file will be created automatically
3. No additional setup required

## Schema

### SQLite Table
```sql
CREATE TABLE emotion_analysis (
  id TEXT PRIMARY KEY,
  userId TEXT,
  type TEXT,
  input TEXT,
  transcript TEXT,
  emotion TEXT,
  confidence REAL,
  scores TEXT,
  audioFeatures TEXT,
  timestamp TEXT
);

CREATE INDEX idx_userId ON emotion_analysis(userId);
CREATE INDEX idx_timestamp ON emotion_analysis(timestamp);
```

### Firestore Collection
- Collection name: `emotion_analysis`
- Document ID: UUID
- Indexes: userId, timestamp

## Error Handling
- Storage failures don't break API responses
- Returns null on error instead of throwing
- Logs errors for debugging
- Graceful degradation

## Privacy Considerations
- Consider data retention policies
- Implement user data deletion on request
- Encrypt sensitive data
- Follow GDPR/privacy regulations
- Use cleanup function to remove old data
