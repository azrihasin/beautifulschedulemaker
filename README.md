# LLM Timetable

An AI-powered timetable management application with integrated note-taking capabilities. Create, manage, and visualize class schedules using natural language input, while keeping organized notes for each course and session.

## Features

### 🤖 AI-Powered Course Management
- Add, edit, and delete courses using conversational AI
- Natural language input: "Add Math 101 on Monday and Wednesday from 2-3 PM"
- Intelligent parsing of course codes, times, and locations

### 📅 Visual Timetable Display
- Interactive weekly schedule view with customizable styling
- Mobile-responsive design with device-specific sizing
- Export capabilities (PNG, JPEG, SVG formats)

### 📝 Dual Note-Taking System ✅ **FULLY IMPLEMENTED**

#### Three-View Visual Notes System ✅ **PRODUCTION READY**
- **Seamless View Transitions**: ✅ Smooth 300ms transitions between timetable, note list, and editor views
- **iOS-Inspired Design**: ✅ Beautiful note cards with Apple-quality typography and generous spacing
- **Visual Note List**: ✅ Browse existing notes with elegant cards showing title, preview, and color accents
- **Floating Action Button**: ✅ Quick note creation with delightful interactions
- **Excalidraw Integration**: ✅ Full visual note-taking with drawing capabilities and scene persistence
- **Clean Editor Interface**: ✅ Distraction-free editing with Back/Title/Save controls
- **Auto-Save**: ✅ Changes automatically saved with proper user feedback and error handling
- **Loading & Error States**: ✅ Comprehensive skeleton loading animations and retry functionality
- **Accessibility**: ✅ Full keyboard navigation, ARIA labels, and screen reader support
- **Responsive Design**: ✅ Mobile-first design with tablet and desktop optimizations
- **Database Integration**: ✅ Full Supabase CRUD operations with user context and security

#### Context-Aware Note Drawer ✅ **PRODUCTION READY**
- **Hierarchical Notes**: ✅ Three-level note organization (timetable → course → session)
- **Rich Text Editor**: ✅ Full formatting with headings, lists, code blocks, and blockquotes
- **Tag System**: ✅ @mentions and #hashtags for organization and categorization
- **AI Integration**: ✅ Save AI responses directly to contextually relevant notes
- **Auto-Save**: ✅ Changes saved every 2 seconds with visual feedback
- **Pinned Notes**: ✅ Pin important notes for quick access
- **Offline Support**: ✅ Local caching with automatic sync when connection restored

### 🔐 User Authentication & Data Persistence
- Secure user accounts with Supabase integration
- Local storage with IndexedDB and cloud synchronization
- Row-level security for data protection
- Comprehensive database schema with migrations

### ⚡ Performance Optimizations
- **Rate Limiting**: 30 requests per 15-minute window to prevent API abuse
- **Response Caching**: 30%+ cache hit rate for common course parsing patterns
- **Chat Optimization**: Message limiting and virtual scrolling for long conversations
- **Three-View Performance**: Optimized transitions, lazy loading, and memory management
- **Auto-Save Debouncing**: Efficient database writes with error recovery

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account (for authentication and database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd llm-timetable
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials and OpenAI API key in `.env.local`.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Managing Courses
- Use the AI chat interface to add courses: "Add CSC 1100 Elements of Programming on Monday and Wednesday from 2:00 PM to 3:20 PM in ICT Lab 7"
- Toggle between chat-based AI interface and traditional button controls
- Edit or delete courses through natural language commands

### Taking Notes

#### Dual Note-Taking System

**Three-View Visual Notes System:**
1. **Timetable View**: Your main schedule with an "Add Note" button prominently displayed above
2. **Note List View**: Browse all your notes in an iOS-inspired interface with:
   - Beautiful note cards with rounded corners and subtle shadows
   - Title, preview text, and color accent borders
   - Floating "New Note" button for quick creation
   - Smooth hover animations and interactions
3. **Note Editor View**: Full Excalidraw-powered visual note editor with:
   - Clean header with Back, Title input, and Save controls
   - Full drawing and visual note-taking capabilities
   - Distraction-free editing experience
   - Automatic scene data persistence to Supabase

**Context-Aware Note Drawer:**
- Click on any timetable element to open contextual notes
- Rich text editor with formatting, tags, and @mentions
- Hierarchical organization: timetable → course → session notes
- AI response integration with "Save to Notes" functionality

#### Navigation Flow
- **Timetable → Note List**: Click "Add Note" button above timetable
- **Note List → Editor**: Click any note card to edit, or use floating "+" button for new notes
- **Editor → Note List**: Use Back button to return with smooth transitions
- **Seamless Transitions**: All view changes use iOS-quality animations (300ms duration)
- **Drawer Access**: Click any timetable element for contextual note drawer

### Customization
- Extensive styling options for fonts, colors, backgrounds, and layout
- Automatic color assignment for courses
- Responsive design adapts to different screen sizes

## Technology Stack

### Frontend
- **Next.js 15.2.4** - React framework with App Router
- **React 18.3.1** - UI library with TypeScript
- **Tailwind CSS 4.1.2** - Utility-first CSS framework
- **Radix UI** - Headless UI components for accessibility
- **@excalidraw/excalidraw** - Visual note-taking with drawing capabilities
- **Framer Motion** - Animation library

### Backend & Database
- **Supabase** - Authentication and PostgreSQL database with RLS
- **OpenAI API** - AI-powered course management with rate limiting
- **Vercel AI SDK** - Streaming responses and chat utilities
- **Database Migrations** - Comprehensive schema with automated migrations

### State Management
- **Zustand** - Lightweight state management with persistence
- **IndexedDB** - Local storage for large data and offline support
- **Supabase Sync** - Real-time database synchronization

### Testing & Development
- **Vitest** - Testing framework
- **Testing Library** - Component testing utilities
- **TypeScript** - Type safety and development experience

## Architecture

### Component Structure
```
app/
├── api/                    # API routes for AI chat and data sync
├── auth/                   # Authentication pages
├── protected/              # Protected routes requiring login
└── page.tsx               # Main timetable interface

components/
├── ui/                    # Reusable UI components (Radix-based)
├── add-note-button.tsx    # ✅ Button to transition from timetable to note list
├── course-chatbot.tsx     # ✅ AI conversation interface with performance optimizations
├── timetable.tsx          # ✅ Visual schedule display with note integration
├── note-list-view.tsx     # ✅ iOS-inspired note list with cards and animations
├── note-card.tsx          # ✅ Individual note card component with hover effects
├── floating-new-note-button.tsx # ✅ FAB for creating new notes
├── excalidraw-note-editor.tsx   # ✅ Full Excalidraw-powered editor with auto-save
├── note-drawer.tsx        # ✅ Context-aware note drawer with rich text editor
├── note-editor.tsx        # ✅ Rich text editor with formatting and tags
└── save-to-notes-button.tsx     # ✅ AI response integration button

stores/
├── noteStore.ts           # ✅ Context-aware note management with offline support
├── timetableStore.ts      # ✅ Timetable and chat data with persistence
├── courseStore.ts         # ✅ Course CRUD operations with AI integration
└── types.ts               # ✅ Comprehensive TypeScript interfaces

lib/
├── supabase/              # Database integration and migrations
│   ├── migrations/        # ✅ Complete database schema migrations
│   ├── excalidraw-notes.ts # ✅ Three-view notes database operations
│   └── database.types.ts  # ✅ Generated TypeScript types
├── performance-monitor.ts # ✅ Performance tracking and optimization
├── rate-limiter.ts        # ✅ API rate limiting and abuse prevention
├── response-cache.ts      # ✅ Intelligent response caching
└── excalidraw-notes-utils.ts # ✅ Excalidraw scene processing utilities
```

### Data Flow
1. **User Input** → AI Chat or Direct UI Interaction
2. **State Updates** → Zustand stores with automatic persistence
3. **Database Sync** → Supabase with row-level security
4. **UI Updates** → React components with optimistic updates

## Excalidraw Integration

### CSS Import Requirement

When using Excalidraw in Next.js projects, you **must** explicitly import the Excalidraw CSS file for proper rendering:

```typescript
import '@excalidraw/excalidraw/index.css';
```

**Why this is required:**
- Next.js does not automatically include styles from third-party packages
- Without this import, the Excalidraw canvas will not display or function correctly
- The styles are essential for layout, interaction, and visual elements

**Where to add the import:**
- Add it in any component file where you dynamically import Excalidraw
- In this project, it's included in `components/excalidraw-note-editor.tsx`

**Note:** This requirement applies to Next.js and similar frameworks that don't auto-load package-level CSS.

### Performance Considerations

The Excalidraw integration includes several performance optimizations:

- **Lazy Loading**: Excalidraw is only loaded when entering the editor view
- **Scene Data Optimization**: Efficient JSON serialization for large drawings
- **Memory Management**: Proper cleanup when leaving the editor
- **Auto-Save Debouncing**: Prevents excessive database writes
- **Offline Support**: Scene data cached locally and synced when online

## Documentation

### User Guides
- **[Note Taking Guide](docs/NOTE_TAKING_GUIDE.md)** - Comprehensive guide to both note-taking systems
- **[Performance Optimizations](docs/PERFORMANCE_OPTIMIZATIONS.md)** - System performance features and monitoring
- **[Three-View Notes Polish Summary](docs/THREE_VIEW_NOTES_POLISH_SUMMARY.md)** - Complete implementation details

### Developer Resources
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation and data structures
- **[Database Setup](DATABASE_SETUP.md)** - Database schema and migration instructions
- **[Excalidraw Notes Migration](lib/supabase/migrations/README_excalidraw_notes.md)** - Three-view notes database setup

### Testing

The project includes comprehensive test coverage with 57+ tests covering:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- __tests__/user-flow-integration.test.tsx          # Complete user journey testing
npm test -- __tests__/three-view-notes-integration.test.tsx   # Three-view system integration
npm test -- __tests__/error-handling-integration.test.tsx     # Error scenarios and recovery
npm test -- __tests__/accessibility-integration.test.tsx      # WCAG compliance testing
npm test -- __tests__/responsive-design.test.tsx              # Multi-device compatibility

# Component tests
npm test -- components/__tests__/add-note-button.test.tsx
npm test -- components/__tests__/note-list-view.test.tsx
npm test -- components/__tests__/excalidraw-note-editor.test.tsx
npm test -- components/__tests__/note-drawer.test.tsx

# Database and utility tests
npm test -- lib/supabase/__tests__/excalidraw-notes.test.ts
npm test -- __tests__/performance-optimization.test.ts

# Run with coverage
npm run test:coverage
```

**Test Coverage Areas:**
- ✅ User flow integration (5 tests)
- ✅ Error handling scenarios (8 tests) 
- ✅ Responsive design (19 tests)
- ✅ Accessibility compliance (9 tests)
- ✅ Component unit tests (25+ tests)
- ✅ Database operations (comprehensive CRUD testing)
- ✅ Performance optimizations (rate limiting, caching)

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - React framework features and API
- [Supabase Documentation](https://supabase.com/docs) - Database and authentication
- [Excalidraw Documentation](https://docs.excalidraw.com/) - Visual drawing and note-taking
- [Zustand Documentation](https://zustand-demo.pmnd.rs/) - State management
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling framework

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
