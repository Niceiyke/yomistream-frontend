# Frontend Type System

This directory contains TypeScript type definitions that match the backend ORM database schema.

## Files

### `content.ts`
Complete type definitions for video content system:
- Video models (Video, VideoVariant, VideoMetadata, VideoTranscoding)
- Preacher models (Preacher, PreacherStats, PreacherMinimal)
- Categorization (Topic, Tag, Collection)
- Source data (SourceVideo, ProcessedSermon)
- Request/Response types for API calls
- Utility types (VideoStatus, TranscodingStatus, etc.)

### `user.ts`
User and authentication-related types:
- User interface
- UserPreferences interface

### `ad-system.ts`
Advertisement system types:
- Ad models
- Ad request/response types
- Placement and interaction types

### `index.ts`
Central export point - import types from here:
```typescript
import { Video, Preacher, Topic } from '@/lib/types'
```

## Usage

### Import Types
```typescript
import { Video, Preacher, VideoCreateRequest } from '@/lib/types'
```

### Use Helper Functions
```typescript
import { 
  formatDuration,
  normalizeVideoTags,
  getPreacherName 
} from '@/lib/utils/video-helpers'

const duration = formatDuration(video.duration)
const tags = normalizeVideoTags(video.tags)
const preacherName = getPreacherName(video)
```

### Handle Nullable Fields
```typescript
// Always check for null/undefined
const thumbnail = video.thumbnail_url || '/default.jpg'
const description = video.description ?? 'No description available'
```

### Work with Arrays
```typescript
// Sermon notes
const notes = video.sermon_notes || []

// Scripture references
const scriptures = video.scripture_references || []

// Tags (use helper for normalization)
const tags = normalizeVideoTags(video.tags)
```

## Type Safety

All types are strictly typed and match the backend database schema. TypeScript will catch:
- Missing required fields
- Incorrect field types
- Typos in field names
- Invalid enum values

## Backward Compatibility

The type system supports legacy field names:
```typescript
// Both work
video.preacher?.image_url
video.preachers?.profile_image_url

// Use helper function to handle both
getPreacherImageUrl(video)
```

## Related Files

- **Helper Functions**: `lib/utils/video-helpers.ts`
- **API Client**: `lib/api.ts`
- **Backend Models**: `yomistream-backend/fastapi/app/database/models/content.py`
- **Backend Schemas**: `yomistream-backend/fastapi/app/database/schemas/videos.py`

## Documentation

See `FRONTEND_DATABASE_MIGRATION.md` in the project root for complete documentation.
