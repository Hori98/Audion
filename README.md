# Audion Web UI

A modern web interface for the Audion AI-powered audio news platform.

## Features

- **Authentication**: Secure login and registration
- **RSS Management**: Add and manage your news sources
- **Article Feed**: Browse and select articles from your RSS feeds
- **Audio Creation**: Generate AI-powered audio summaries from selected articles
- **Audio Library**: Manage and play your created audio content
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your backend API URL.

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Make sure your backend is running**:
   The backend should be running on `http://localhost:8000` (or update the API URL in your `.env` file).

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthScreen.jsx   # Login/register interface
│   ├── FeedScreen.jsx   # Article browsing and selection
│   ├── SourcesScreen.jsx # RSS source management
│   ├── LibraryScreen.jsx # Audio library and player
│   ├── AudioPlayer.jsx  # Bottom audio player component
│   └── Layout.jsx       # Main app layout
├── contexts/            # React contexts
│   ├── AuthContext.jsx  # Authentication state management
│   └── AudioContext.jsx # Audio player state management
└── main.jsx            # App entry point
```

## Key Features

### Authentication
- Clean, modern login/register interface
- Secure token-based authentication
- Persistent login state

### RSS Source Management
- Add RSS feeds with name and URL
- Visual source cards with metadata
- Easy source deletion
- URL validation

### Article Feed
- Grid layout of articles from your RSS sources
- Multi-select functionality with visual indicators
- Article metadata (source, date, genre)
- Direct links to original articles
- Bulk audio creation from selected articles

### Audio Library
- List of all created audio content
- Inline audio player with controls
- Audio renaming functionality
- Script viewing for AI-generated content
- Download functionality
- Audio deletion

### Audio Player
- Persistent bottom player
- Play/pause, skip controls
- Progress bar with seeking
- Visual feedback for currently playing audio
- Animated audio wave indicators

## Design System

- **Colors**: Primary purple theme with careful contrast ratios
- **Typography**: Clean, readable fonts with proper hierarchy
- **Components**: Consistent button styles, cards, and form elements
- **Animations**: Subtle transitions and loading states
- **Responsive**: Mobile-first design with breakpoints

## API Integration

The app integrates with the Audion backend API for:
- User authentication (`/auth/login`, `/auth/register`)
- RSS source management (`/sources`)
- Article fetching (`/articles`)
- Audio creation (`/audio/create`)
- Audio library management (`/audio/library`)

## Development

- Built with React 18 and Vite
- Styled with Tailwind CSS
- Uses Axios for API calls
- Date formatting with date-fns
- Icons from Lucide React

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service
3. Update the `VITE_API_URL` environment variable to point to your production backend

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)