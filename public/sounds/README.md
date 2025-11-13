# Notification Sounds

This directory contains audio files for notification sounds used throughout the Loom application.

## Required Files

The notification system expects the following sound files:

### 1. notification.mp3
- **Purpose**: Primary notification sound (used in most browsers)
- **Format**: MP3
- **Recommended specs**:
  - Sample rate: 44.1 kHz or 48 kHz
  - Bitrate: 128 kbps or higher
  - Duration: 0.5-2 seconds
  - Volume: Normalized to prevent clipping

### 2. notification.wav
- **Purpose**: Fallback notification sound (higher quality, broader compatibility)
- **Format**: WAV
- **Recommended specs**:
  - Sample rate: 44.1 kHz
  - Bit depth: 16-bit
  - Duration: 0.5-2 seconds
  - Channels: Mono or Stereo

### 3. notification.ogg (Optional)
- **Purpose**: Alternative format for Firefox and older browsers
- **Format**: OGG Vorbis
- **Recommended specs**:
  - Quality: ~128 kbps
  - Duration: 0.5-2 seconds

## How to Add Notification Sounds

### Option 1: Use Free Sound Libraries

1. **Freesound.org**: https://freesound.org/
   - Search for "notification" or "alert"
   - Filter by license (CC0 or CC-BY for commercial use)
   - Download and convert to required formats

2. **Zapsplat**: https://www.zapsplat.com/
   - Free sound effects library
   - Search for notification sounds
   - Requires attribution for free tier

3. **Notification Sounds**: https://notificationsounds.com/
   - Curated notification sounds
   - Free for personal and commercial use

### Option 2: Create Custom Sounds

Using **Audacity** (free, open-source):

1. Download Audacity: https://www.audacityteam.org/
2. Create or record your sound
3. Edit: Effect → Normalize (to -1.0 dB)
4. Trim to 0.5-2 seconds
5. Export as:
   - File → Export → Export as MP3
   - File → Export → Export as WAV

### Option 3: Generate Programmatically

Using **sox** command-line tool:

```bash
# Install sox
brew install sox  # macOS
sudo apt-get install sox  # Linux

# Generate a simple notification beep
sox -n notification.wav synth 0.3 sine 800 fade 0 0.3 0.1

# Convert to MP3 (requires lame)
sox notification.wav notification.mp3

# Convert to OGG
sox notification.wav notification.ogg
```

### Option 4: Use Web Audio API Generator

Create a simple tone generator:

```javascript
// Generate notification sound programmatically
const audioContext = new AudioContext();
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.frequency.value = 800; // Hz
oscillator.type = 'sine';
gainNode.gain.value = 0.3;

oscillator.start();
oscillator.stop(audioContext.currentTime + 0.3);
```

## Recommended Sound Characteristics

- **Tone**: Pleasant, non-intrusive
- **Duration**: 0.5-1.5 seconds (short enough to not be annoying)
- **Volume**: Moderate (users should be able to hear but not startled)
- **Frequency**: 400-1200 Hz (easily heard but not harsh)
- **Style**:
  - Soft chime
  - Gentle beep
  - Subtle bell
  - Warm tone

## Usage in Code

The notification sounds are used in:

1. **Notification Center** (`src/components/notifications/notification-center.tsx`):
   ```typescript
   const audio = new Audio('/sounds/notification.mp3');
   audio.volume = 0.3;
   audio.play();
   ```

2. **Realtime Hooks** (`src/lib/realtime/hooks.ts`):
   ```typescript
   const audio = new Audio('/sounds/notification.wav');
   audio.volume = 0.5;
   audio.play();
   ```

## Fallback Strategy

The application implements a fallback strategy:

1. Try to play `notification.mp3` (most compatible)
2. If fails, fall back to `notification.wav`
3. If both fail, use vibration API: `navigator.vibrate([200, 100, 200])`

## Testing

To test notification sounds:

1. Enable sound in notification settings
2. Trigger a test notification
3. Verify sound plays across different browsers:
   - Chrome/Edge: MP3
   - Firefox: OGG/MP3
   - Safari: MP3/WAV

## Browser Autoplay Policies

Modern browsers restrict autoplay:

- **User Interaction Required**: Most browsers require user interaction before playing sounds
- **Solution**: The app requests permission and plays sounds only after user grants notification permissions
- **Fallback**: If sound fails, the app uses vibration or visual indicators

## License Considerations

Ensure any sounds you add comply with licensing requirements:

- ✅ CC0 (Public Domain) - No attribution required
- ✅ CC-BY - Attribution required (add to CREDITS.md)
- ✅ Custom created - Full ownership
- ❌ Copyrighted - Do not use without permission

## File Size Optimization

Keep sound files small for performance:

- Target: < 50 KB per file
- Use compression tools:
  - MP3: Use variable bitrate (VBR) ~96-128 kbps
  - WAV: Consider 8-bit for very simple sounds
  - OGG: Use quality setting ~3-5

## Accessibility

Consider users with hearing impairments:

- Always provide visual notification indicators
- Allow users to disable sounds
- Provide vibration as an alternative
- Ensure notification appears in notification center even if sound is disabled
