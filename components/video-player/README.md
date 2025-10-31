# Video Player Components

This directory contains modular, reusable components for the custom video player. The monolithic `CustomVideoPlayer` component has been split into smaller, focused sub-components for better maintainability, testability, and performance.

## Component Structure

```
video-player/
├── VideoControls.tsx      # Playback controls (play, volume, settings, fullscreen)
├── ProgressBar.tsx        # Progress bar with scrubbing and chapter markers
├── AdOverlay.tsx          # Advertisement overlay UI
├── types.ts               # Shared TypeScript interfaces
├── index.ts               # Barrel export
└── README.md              # This file
```

## Components

### 1. VideoControls

**Purpose**: Renders all video playback controls including play/pause, volume, settings menu, quality selector, playback speed, chapters, and fullscreen controls.

**Props**:
- **Playback State**: `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `isFullscreen`, `isPictureInPicture`, `playbackRate`, `quality`
- **Control Handlers**: `onTogglePlay`, `onSeek`, `onVolumeChange`, `onToggleMute`, `onToggleFullscreen`, `onTogglePictureInPicture`, `onPlaybackRateChange`, `onQualityChange`
- **Optional Features**: `chapters`, `currentChapter`, `onChapterChange`, `availableQualities`, `transcriptSegments`, `onNoteTaken`, `isCapturingNote`
- **Utility**: `formatTime`, `showControls`

**Features**:
- Responsive design (mobile/desktop)
- Keyboard shortcuts support
- Settings dropdown with playback speed, chapters, and quality
- Note-taking button (when transcript available)
- Picture-in-Picture support
- Accessible with ARIA labels

**Performance**:
- Wrapped in `React.memo` to prevent unnecessary re-renders
- Only re-renders when props change

**Usage**:
```tsx
<VideoControls
  isPlaying={state.isPlaying}
  currentTime={state.currentTime}
  duration={state.duration}
  volume={state.volume}
  isMuted={state.isMuted}
  isFullscreen={state.isFullscreen}
  isPictureInPicture={state.isPictureInPicture}
  playbackRate={state.playbackRate}
  quality={state.quality}
  onTogglePlay={togglePlay}
  onVolumeChange={setVolume}
  onToggleMute={toggleMute}
  onToggleFullscreen={toggleFullscreen}
  onTogglePictureInPicture={togglePictureInPicture}
  onPlaybackRateChange={setPlaybackRate}
  onQualityChange={setQuality}
  onSeek={seek}
  chapters={chapters}
  currentChapter={getCurrentChapter()}
  onChapterChange={onChapterChange}
  availableQualities={getAvailableQualities()}
  transcriptSegments={transcriptSegments}
  onNoteTaken={takeNote}
  isCapturingNote={state.isCapturingNote}
  formatTime={formatTime}
  showControls={showControls}
/>
```

---

### 2. ProgressBar

**Purpose**: Displays video progress with buffer indicator, chapter markers, and thumbnail preview on hover.

**Props**:
- **State**: `currentTime`, `duration`, `buffered`, `poster`, `chapters`, `showProgressBar`, `showThumbnailPreview`, `thumbnailPreviewTime`, `thumbnailPreviewPosition`
- **Handlers**: `onSeek`, `onChapterChange`, `onProgressHover`, `onProgressLeave`, `onProgressClick`, `onProgressDrag`, `onShowControls`
- **Utility**: `formatTime`

**Features**:
- Visual progress indicator with gradient
- Buffer progress display
- Draggable progress handle
- Chapter markers (clickable)
- Thumbnail preview on hover
- Touch support for mobile

**Performance**:
- Wrapped in `React.memo`
- Throttled hover updates (handled by parent)
- Efficient DOM updates

**Usage**:
```tsx
<ProgressBar
  currentTime={state.currentTime}
  duration={state.duration}
  buffered={state.buffered}
  poster={poster}
  chapters={chapters}
  showProgressBar={showProgressBar}
  showThumbnailPreview={state.showThumbnailPreview}
  thumbnailPreviewTime={state.thumbnailPreviewTime}
  thumbnailPreviewPosition={state.thumbnailPreviewPosition}
  onSeek={seek}
  onChapterChange={onChapterChange}
  onProgressHover={handleProgressHover}
  onProgressLeave={handleProgressLeave}
  onProgressClick={handleProgressClick}
  onProgressDrag={handleProgressDrag}
  onShowControls={() => setShowControls(true)}
  formatTime={formatTime}
/>
```

---

### 3. AdOverlay

**Purpose**: Displays advertisement information and skip button during ad playback.

**Props**:
- **Ad State**: `currentAd`, `adTimeRemaining`, `canSkipAd`
- **Handlers**: `onAdClick`, `onSkipAd`

**Features**:
- Ad information display (advertiser, title)
- Countdown timer
- Skip button (appears after `skipAfter` seconds)
- Click-through support
- Overlay prevents interaction with main video

**Performance**:
- Wrapped in `React.memo`
- Minimal re-renders (only when ad state changes)

**Usage**:
```tsx
{state.isPlayingAd && state.currentAd && (
  <AdOverlay
    currentAd={state.currentAd}
    adTimeRemaining={state.adTimeRemaining}
    canSkipAd={state.canSkipAd}
    onAdClick={handleAdClick}
    onSkipAd={skipAd}
  />
)}
```

---

### 4. Types (types.ts)

**Purpose**: Shared TypeScript interfaces used across all video player components.

**Exports**:
- `Ad`: Advertisement configuration
- `Watermark`: Watermark configuration
- `Chapter`: Video chapter metadata
- `TranscriptSegment`: Transcript segment data
- `VideoState`: Complete video player state

**Usage**:
```tsx
import type { Ad, Chapter, VideoState } from './video-player/types'
```

---

## Benefits of Component Split

### 1. **Maintainability**
- Each component has a single responsibility
- Easier to locate and fix bugs
- Simpler code reviews
- Better code organization

### 2. **Testability**
- Components can be tested in isolation
- Easier to mock dependencies
- More focused unit tests
- Better test coverage

### 3. **Performance**
- Granular memoization (each component memoized separately)
- Reduced re-render scope
- Only affected components re-render on state changes
- Better React DevTools profiling

### 4. **Reusability**
- Components can be used independently
- Easy to create variants (e.g., minimal controls)
- Shareable across projects
- Composable architecture

### 5. **Developer Experience**
- Smaller files are easier to navigate
- Clear component boundaries
- Better IDE autocomplete
- Easier onboarding for new developers

---

## Performance Comparison

### Before Split (Monolithic Component)
- **File Size**: ~1600 lines
- **Re-render Scope**: Entire component on any state change
- **Testing**: Difficult to test individual features
- **Maintenance**: Hard to locate specific functionality

### After Split (Modular Components)
- **File Sizes**: 
  - VideoControls: ~350 lines
  - ProgressBar: ~120 lines
  - AdOverlay: ~70 lines
  - Types: ~65 lines
- **Re-render Scope**: Only affected sub-components
- **Testing**: Easy to test each component independently
- **Maintenance**: Clear separation of concerns

---

## Migration Guide

### For Existing Code

The main `CustomVideoPlayer` component can now use these sub-components internally:

```tsx
// Old approach (monolithic)
return (
  <div>
    {/* All UI inline */}
  </div>
)

// New approach (modular)
return (
  <div>
    <ProgressBar {...progressProps} />
    {state.isPlayingAd && <AdOverlay {...adProps} />}
    <VideoControls {...controlProps} />
  </div>
)
```

### Breaking Changes
None - these are internal sub-components. The main `CustomVideoPlayer` API remains unchanged.

---

## Future Enhancements

1. **Additional Sub-Components**
   - `SeekFeedback`: Double-click seek visual feedback
   - `LoadingSpinner`: Loading state UI
   - `ErrorDisplay`: Error state UI
   - `BigPlayButton`: Center play button
   - `WatermarkOverlay`: Watermark display

2. **Accessibility Improvements**
   - Dedicated `Announcements` component for screen readers
   - Keyboard navigation component
   - Focus management utilities

3. **Advanced Features**
   - `PlaylistControls`: Next/previous video controls
   - `QualityIndicator`: Current quality badge
   - `LiveIndicator`: Live stream badge
   - `CaptionsMenu`: Subtitle/caption selector

---

## Best Practices

### When to Create a New Sub-Component

Create a new sub-component when:
1. A section has distinct functionality (e.g., controls vs. progress bar)
2. The section can be tested independently
3. The section might be reused elsewhere
4. The section has its own state/logic
5. The file is becoming too large (>500 lines)

### When to Keep Code Together

Keep code together when:
1. Components are tightly coupled
2. Splitting would require excessive prop drilling
3. The code is simple and unlikely to change
4. Performance benefits are minimal

---

## Testing

### Unit Tests

Each component should have its own test file:

```
video-player/
├── __tests__/
│   ├── VideoControls.test.tsx
│   ├── ProgressBar.test.tsx
│   └── AdOverlay.test.tsx
```

### Example Test

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoControls } from './VideoControls'

describe('VideoControls', () => {
  it('should toggle play/pause on button click', () => {
    const onTogglePlay = jest.fn()
    
    render(
      <VideoControls
        isPlaying={false}
        onTogglePlay={onTogglePlay}
        // ... other required props
      />
    )
    
    fireEvent.click(screen.getByLabelText('Play video'))
    expect(onTogglePlay).toHaveBeenCalledTimes(1)
  })
})
```

---

## Contributing

When adding new features:

1. Determine which component should own the feature
2. Add necessary props to the component interface
3. Update the component's JSDoc comments
4. Add unit tests
5. Update this README
6. Consider performance implications

---

## License

Same as parent project.
