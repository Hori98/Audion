# Main Tab and Feed Tab Requirements

## Main Tab (Default Tab)
- **Function**: Behaves like a complete news application
- **Default behavior**: This should be the primary tab users see when opening the app
- **Features**: 
  - News-like interface with curated content
  - Automatic content curation and recommendations
  - Clean, Twitter/news app-like UI
  - Shows processed articles ready for podcast conversion

## Feed Tab (RSS Reader)
- **Function**: Traditional RSS reader interface
- **Features**:
  - Registration-based news sources (users can add RSS feeds)
  - Manual pick functionality for article selection
  - Source management (add/remove RSS sources)
  - Article filtering and selection tools
  - Direct RSS feed reading experience

## Current Implementation Analysis
- Current tab structure: feed, archive, discover, library
- Need to restructure to: main (default), feed, archive, library
- Feed tab currently has manual pick functionality - this is correct
- Main tab needs to be created with news app-like behavior
- Archive and library tabs can remain as-is

## Action Items
1. Create new main tab that serves as the default news app interface
2. Modify feed tab to focus on RSS reader functionality
3. Update tab layout to make main tab the first/default tab
4. Ensure proper navigation and user experience flow