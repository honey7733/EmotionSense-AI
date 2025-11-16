# Backend - EmotionSense AI Platform

This is the backend service for the EmotionSense AI platform, featuring emotion detection, contextual AI chat, and comprehensive user data management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and Supabase credentials

# Start development server
npm run dev

# Start production server
npm start
```

## 📡 API Endpoints

The backend runs on `http://localhost:8080` by default.

### 💬 Chat System (New Features)

#### Create or Continue Chat Session
```bash
POST /api/chat/message
Content-Type: application/json
Authorization: Bearer <supabase-jwt>

{
  "message": "Hello, how are you?",
  "sessionId": "optional-existing-session-id",
  "memoryLength": 10
}
```

**Response:**
```json
{
  "response": "AI response text",
  "emotion": "happy",
  "sessionId": "uuid-session-id",
  "audioUrl": "/api/tts/audio/filename.wav",
  "messageId": "uuid-message-id"
}
```

#### Get User Chat Sessions
```bash
GET /api/chat/sessions
Authorization: Bearer <supabase-jwt>
```

#### Get Session Messages
```bash
GET /api/chat/sessions/:sessionId/messages
Authorization: Bearer <supabase-jwt>
```

#### Update Session Title
```bash
PATCH /api/chat/sessions/:sessionId
Content-Type: application/json
Authorization: Bearer <supabase-jwt>

{
  "title": "New session title"
}
```

#### Delete Chat Session
```bash
DELETE /api/chat/sessions/:sessionId
Authorization: Bearer <supabase-jwt>
```

### 🎭 Emotion Analysis

#### Text Emotion Analysis
```bash
POST /api/analyze/text
Content-Type: application/json

{
  "text": "I am so happy today!",
  "userId": "user123"
}
```

#### Voice Emotion Analysis
```bash
POST /api/analyze/voice
Content-Type: multipart/form-data

audioFile: <binary file>
userId: user123
```

#### Multi-Modal Analysis
```bash
POST /api/analyze/multimodal
Content-Type: multipart/form-data

audioFile: <binary file>
text: "Optional text"
userId: user123
```

### 🤖 AI Response Generation
```bash
POST /api/response/generate
Content-Type: application/json

{
  "emotion": "happy",
  "context": "User expressed happiness",
  "includeAudio": true
}
```

### 🎵 Text-to-Speech
```bash
POST /api/tts/synthesize
Content-Type: application/json

{
  "text": "Hello world",
  "voice": "en_US-lessac-medium"
}
```

### 🏥 Health Check
```bash
GET /api/health
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Service APIs
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_google_gemini_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# LLM Configuration
GEMINI_MODEL=gemini-2.0-flash-exp
LLAMA_MODEL=llama-3.3-70b-versatile
MEMORY_LENGTH=10
```

## 🗄️ Database Schema

The application uses Supabase PostgreSQL with the following main tables:

### Chat Sessions
```sql
chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Messages
```sql
messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  role VARCHAR(20) CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion TEXT,
  emotion_confidence NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  audio_url TEXT,
  created_at TIMESTAMP DEFAULT timezone('utc', now())
)
```

**Note:** Run the migration scripts inside `backend/migrations` (starting with `create_chat_tables.sql`) to provision these tables with the latest schema and RLS policies.

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js                    # Express server entry point
│   ├── config/
│   │   └── index.js                 # Supabase and environment config
│   ├── routes/
│   │   ├── chatRoutes.js            # Chat system endpoints (NEW)
│   │   ├── textRoutes.js            # Text analysis endpoints
│   │   ├── voiceRoutes.js           # Voice analysis endpoints
│   │   ├── multiModalRoutes.js      # Multi-modal analysis
│   │   ├── responseRoutes.js        # AI response generation
│   │   ├── ttsRoutes.js             # Text-to-speech endpoints
│   │   └── healthRoutes.js          # Health check
│   ├── services/
│   │   ├── text-service/            # BiLSTM emotion detection
│   │   ├── voice-service/           # Audio emotion analysis
│   │   ├── multi-modal-layer/       # Emotion fusion algorithms
│   │   ├── llm-service/             # Gemini/LLaMA integration (UPDATED)
│   │   ├── storage-service/         # Supabase operations (UPDATED)
│   │   ├── tts-service/             # Piper TTS integration
│   │   └── aggregator/              # Response aggregation
│   ├── middleware/
│   │   ├── errorHandler.js          # Global error handling
│   │   ├── requestLogger.js         # Request logging
│   │   └── uploadMiddleware.js      # File upload handling
│   └── utils/
│       ├── helpers.js               # Utility functions
│       └── logger.js                # Winston logging
├── models/                          # ML models
│   ├── emotion_bilstm_final.onnx    # BiLSTM emotion model
│   └── piper/                       # TTS models
├── data/                            # Application data
├── logs/                            # Winston logs
├── temp/                            # Temporary files
│   └── audio/                       # Generated TTS audio
└── package.json
```

## 🏗️ Architecture Features

### 🔐 User Authentication & Data Isolation
- **Supabase Auth Integration**: JWT-based authentication with automatic user context
- **Row Level Security (RLS)**: Database-level user data isolation
- **Secure API Access**: All chat endpoints require valid Supabase JWT tokens

### 🧠 Contextual AI Memory
- **Conversation History**: Maintains context across chat sessions
- **Configurable Memory Length**: Adjustable context window (default: 10 messages)
- **Multi-Model Support**: Primary Gemini 2.0 Flash + LLaMA 3.3 fallback
- **Emotion-Aware Responses**: AI responses consider detected user emotions

### 💾 Data Persistence
- **Session Management**: Persistent chat sessions with custom titles
- **Message History**: Complete conversation logs with timestamps
- **Emotion Tracking**: Emotion detection results stored per message
- **Audio Generation**: TTS audio files cached and served

### 🎯 Real-time Features
- **Live Emotion Detection**: Real-time analysis of text and voice inputs
- **Speech-to-Text**: Integrated Whisper STT via Groq API
- **Text-to-Speech**: High-quality Piper neural TTS
- **Session Updates**: Real-time chat session management

## 🧪 Testing

### Test Chat System
```bash
# Test new chat message (requires auth token)
curl -X POST http://localhost:8080/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{"message": "Hello, how are you feeling today?"}'

# Test session retrieval
curl -X GET http://localhost:8080/api/chat/sessions \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"
```

### Test Emotion Analysis
```bash
# Test text emotion analysis
curl -X POST http://localhost:8080/api/analyze/text \
  -H "Content-Type: application/json" \
  -d '{"text": "I am really excited about this project!", "userId": "test-user"}'

# Test voice emotion analysis
curl -X POST http://localhost:8080/api/analyze/voice \
  -F "audio=@test-audio.wav" \
  -F "userId=test-user"
```

### Test Text-to-Speech
```bash
# Generate speech audio
curl -X POST http://localhost:8080/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test of the text to speech system."}'
```

## 🔄 Migration Guide

If upgrading from the previous version:

1. **Run Database Migration**: Execute `supabase_schema_migration.sql` in Supabase
2. **Update Environment**: Add new Supabase environment variables
3. **Update Dependencies**: Run `npm install` to get latest packages
4. **Test Authentication**: Verify Supabase JWT tokens work with new endpoints

## 🚀 Recent Updates

### v2.0 - Contextual Chat System
- ✅ **User-Specific Data Isolation**: Complete RLS implementation
- ✅ **Contextual AI Memory**: LLM conversation history support
- ✅ **Session Management**: CRUD operations for chat sessions
- ✅ **Enhanced API**: New chat endpoints with authentication
- ✅ **Audio Integration**: TTS generation for AI responses
- ✅ **Emotion Context**: AI responses consider user emotional state

## 📚 Additional Documentation

- **Frontend Integration**: See `../frontend/README.md` for client implementation
- **API Reference**: Complete endpoint documentation in root `README.md`
- **Deployment Guide**: Production deployment instructions available
- **Architecture Details**: Detailed system design in `ARCHITECTURE.md`

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify Supabase JWT tokens and RLS policies
2. **Memory Context Issues**: Check `MEMORY_LENGTH` environment variable
3. **TTS Audio Problems**: Ensure Piper models are downloaded in `/models/piper/`
4. **Emotion Model Loading**: Verify ONNX models exist in `/models/` directory

### Debug Mode
Set `NODE_ENV=development` and check logs in `/logs/` directory for detailed error information.
