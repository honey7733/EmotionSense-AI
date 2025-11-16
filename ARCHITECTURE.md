# 🏗️ Emotion AI Frontend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                      (Browser - Port 3000)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Pages     │  │  Components  │  │    Hooks     │         │
│  │              │  │              │  │              │         │
│  │ • Dashboard  │  │ • Emotion    │  │ • Voice      │         │
│  │ • Text       │  │ • Voice      │  │   Recorder   │         │
│  │ • Voice      │  │ • UI         │  │ • Toast      │         │
│  │ • MultiModal │  │              │  │              │         │
│  │ • History    │  │              │  │              │         │
│  │ • Settings   │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   API Layer  │  │    Store     │  │    Types     │         │
│  │              │  │              │  │              │         │
│  │ • Axios      │  │ • Zustand    │  │ • Emotion    │         │
│  │   Client     │  │ • History    │  │   Types      │         │
│  │ • Endpoints  │  │ • Prefs      │  │ • Results    │         │
│  │ • Intercept  │  │ • Persist    │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ REST API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API SERVER                           │
│                       (Port 8080)                                │
│                                                                  │
│  • Text Analysis Endpoint                                       │
│  • Voice Analysis Endpoint                                      │
│  • Multi-Modal Endpoint                                         │
│  • TTS Service                                                  │
│  • Response Generator                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App Layout (Root)
│
├── Navbar (Top)
│   ├── Logo
│   ├── Navigation Links
│   └── Theme Toggle
│
├── Sidebar (Left - Desktop)
│   ├── Navigation Menu
│   └── Status Indicator
│
└── Main Content Area
    │
    ├── Dashboard Page (/)
    │   ├── Quick Action Cards
    │   ├── Session Stats
    │   ├── Emotion Timeline
    │   └── Model Performance
    │
    ├── Text Analysis Page (/text)
    │   ├── Text Input Area
    │   ├── Emotion Card (Main Result)
    │   ├── Dual Model Compare
    │   ├── Emotion Bar Chart
    │   └── AI Response Box
    │
    ├── Voice Analysis Page (/voice)
    │   ├── Voice Recorder
    │   ├── Waveform Visualizer
    │   ├── Transcript Display
    │   ├── Emotion Cards (3x)
    │   └── AI Response Box
    │
    ├── Multi-Modal Page (/multimodal)
    │   ├── Text Input
    │   ├── Voice Recorder
    │   ├── Emotion Results Grid
    │   └── AI Response Box
    │
    ├── History Page (/history)
    │   └── Analysis History List
    │       ├── Text Analyses
    │       ├── Voice Analyses
    │       └── Multi-Modal Analyses
    │
    └── Settings Page (/settings)
        ├── Appearance Settings
        ├── Analysis Preferences
        └── About Section
```

## Data Flow

### Text Analysis Flow

```
User Types Text
      │
      ▼
Text Input Component
      │
      ▼
Click "Analyze" Button
      │
      ▼
API Call: analyzeText(text)
      │
      ▼
Backend Processing
      │
      ▼
Response: TextAnalysisResult
      │
      ├─► Update Current Analysis State
      ├─► Add to History Store
      └─► Render Results
          │
          ├─► Emotion Card
          ├─► Dual Model Compare
          ├─► Emotion Bar Chart
          └─► AI Response Box
```

### Voice Analysis Flow

```
User Clicks "Record"
      │
      ▼
MediaRecorder Starts
      │
      ├─► Capture Audio Chunks
      └─► Display Waveform
      │
      ▼
User Stops Recording
      │
      ▼
Blob Created
      │
      ▼
API Call: analyzeVoice(audioFile)
      │
      ▼
Backend Processing
      │
      ├─► Speech-to-Text
      ├─► Voice Emotion Detection
      └─► Text Emotion Detection
      │
      ▼
Response: VoiceAnalysisResult
      │
      ├─► Update State
      ├─► Add to History
      └─► Render Results
          │
          ├─► Transcript
          ├─► Voice Emotion Card
          ├─► Text Emotion Card
          ├─► Combined Emotion Card
          └─► AI Response Box
```

## State Management

### Zustand Store Structure

```
useStore
│
├── history: AnalysisHistory[]
│   ├── id: string
│   ├── type: 'text' | 'voice' | 'multimodal'
│   ├── result: Analysis Result
│   └── timestamp: string
│
├── preferences: UserPreferences
│   ├── theme: 'light' | 'dark'
│   ├── defaultMode: string
│   ├── voiceEnabled: boolean
│   └── ttsEnabled: boolean
│
├── isLoading: boolean
│
├── currentAnalysis: Result | null
│
└── Actions
    ├── addToHistory()
    ├── clearHistory()
    ├── updatePreferences()
    ├── setIsLoading()
    └── setCurrentAnalysis()
```

### Local Storage Persistence

```
localStorage
│
└── emotion-ai-storage
    ├── state
    │   ├── history: [...]
    │   └── preferences: {...}
    └── version: 0
```

## API Integration

### Centralized API Client

```
lib/api.ts
│
├── axios.create()
│   ├── baseURL: env.NEXT_PUBLIC_API_URL
│   ├── timeout: 30000ms
│   └── headers: {'Content-Type': 'application/json'}
│
├── Request Interceptor
│   └── Log requests
│
├── Response Interceptor
│   └── Handle errors
│
└── API Functions
    ├── analyzeText(text)
    ├── analyzeVoice(file)
    ├── analyzeMultiModal(text, file)
    ├── regenerateResponse(emotion, context)
    ├── textToSpeech(text)
    └── healthCheck()
```

### API Endpoints

```
Backend API (localhost:8080)
│
├── POST /api/analyze/text
│   Request: { text: string }
│   Response: TextAnalysisResult
│
├── POST /api/analyze/voice
│   Request: FormData { audio: File }
│   Response: VoiceAnalysisResult
│
├── POST /api/analyze/multimodal
│   Request: FormData { text: string, audio: File }
│   Response: MultiModalResult
│
├── POST /api/response/regenerate
│   Request: { emotion: string, context?: string }
│   Response: { response: string }
│
├── POST /api/tts
│   Request: { text: string }
│   Response: Blob (audio)
│
└── GET /api/health
    Response: { status: string, timestamp: string }
```

## Routing Structure

```
Next.js App Router
│
├── / (root)
│   └── app/page.tsx → Dashboard
│
├── /text
│   └── app/text/page.tsx → Text Analysis
│
├── /voice
│   └── app/voice/page.tsx → Voice Analysis
│
├── /multimodal
│   └── app/multimodal/page.tsx → Multi-Modal
│
├── /history
│   └── app/history/page.tsx → History
│
└── /settings
    └── app/settings/page.tsx → Settings
```

## Theme System

```
Theme Provider (next-themes)
│
├── Light Mode
│   ├── Background: white
│   ├── Text: dark gray
│   └── Components: light variants
│
├── Dark Mode
│   ├── Background: dark gray
│   ├── Text: light gray
│   └── Components: dark variants
│
└── System Mode
    └── Follows OS preference
```

## Emotion Detection Pipeline

```
Input (Text or Voice)
      │
      ▼
Backend API
      │
      ├─► BiLSTM Model
      │   └─► Emotion Scores
      │
      └─► HuggingFace Model
          └─► Emotion Scores
      │
      ▼
Model Results Comparison
      │
      ├─► Agreement Check
      └─► Confidence Scoring
      │
      ▼
Main Emotion Selection
      │
      ▼
AI Response Generation
      │
      ▼
Return Results to Frontend
      │
      ▼
Display in UI
      │
      ├─► Emotion Card
      ├─► Model Comparison
      ├─► Distribution Chart
      └─► AI Response
```

## Technology Stack Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  • React Components                     │
│  • Framer Motion Animations             │
│  • Tailwind CSS Styling                 │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│         Application Layer               │
│  • Next.js App Router                   │
│  • TypeScript Type Safety               │
│  • Custom Hooks                         │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│         State Management Layer          │
│  • Zustand Store                        │
│  • Local Storage Persistence            │
│  • React Context (Theme)                │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│         Data/API Layer                  │
│  • Axios HTTP Client                    │
│  • API Endpoints                        │
│  • Request/Response Interceptors        │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│         Backend Services                │
│  • Express.js Server                    │
│  • ML Models (BiLSTM, HuggingFace)      │
│  • TTS Service                          │
└─────────────────────────────────────────┘
```

## File Organization

```
frontend/
│
├── Core Application Files
│   ├── app/layout.tsx          → Root layout with providers
│   ├── app/page.tsx            → Dashboard page
│   ├── app/globals.css         → Global styles & CSS variables
│   └── tailwind.config.ts      → Tailwind configuration
│
├── Feature Pages
│   ├── app/text/page.tsx       → Text analysis feature
│   ├── app/voice/page.tsx      → Voice analysis feature
│   ├── app/multimodal/page.tsx → Multi-modal feature
│   ├── app/history/page.tsx    → History viewer
│   └── app/settings/page.tsx   → Settings panel
│
├── Reusable Components
│   ├── components/emotions/    → Emotion visualization
│   ├── components/voice/       → Voice recording
│   ├── components/ui/          → Base UI components
│   ├── components/navbar.tsx   → Navigation bar
│   └── components/sidebar.tsx  → Sidebar navigation
│
├── Business Logic
│   ├── lib/api.ts              → API client
│   ├── lib/utils.ts            → Helper functions
│   ├── hooks/                  → Custom hooks
│   └── store/useStore.ts       → Global state
│
├── Type Definitions
│   └── types/index.ts          → TypeScript types
│
└── Configuration
    ├── .env.local              → Environment variables
    ├── package.json            → Dependencies
    ├── tsconfig.json           → TypeScript config
    └── next.config.ts          → Next.js config
```

---

## Key Design Patterns

### 1. **Container/Presentational Pattern**
- Pages = Smart containers (data fetching, state)
- Components = Dumb presenters (UI only)

### 2. **Centralized API Layer**
- Single source for all API calls
- Consistent error handling
- Request/response logging

### 3. **Type-Safe Development**
- Full TypeScript coverage
- Strict type checking
- Interface definitions for all data

### 4. **Component Composition**
- Small, focused components
- Reusable across pages
- Props for customization

### 5. **State Management**
- Zustand for global state
- localStorage for persistence
- React Context for theme

---

This architecture ensures:
✅ Scalability
✅ Maintainability
✅ Type Safety
✅ Performance
✅ Developer Experience
