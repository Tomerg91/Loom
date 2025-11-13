#!/bin/bash

# Notification Sound Generator using SOX
# This script generates notification sounds in multiple formats

echo "🔊 Generating notification sounds..."

# Check if sox is installed
if ! command -v sox &> /dev/null; then
    echo "❌ Error: sox is not installed"
    echo ""
    echo "Install sox:"
    echo "  macOS:   brew install sox"
    echo "  Ubuntu:  sudo apt-get install sox libsox-fmt-all"
    echo "  Fedora:  sudo dnf install sox"
    exit 1
fi

# Create sounds directory
mkdir -p "$(dirname "$0")/../public/sounds"
cd "$(dirname "$0")/../public/sounds"

# Generate WAV file (source)
echo "📝 Generating WAV..."
sox -n notification.wav synth 0.3 sine 800 fade 0 0.3 0.1
echo "✅ notification.wav created"

# Convert to MP3 (requires lame)
if command -v lame &> /dev/null || sox --help 2>&1 | grep -q mp3; then
    echo "📝 Generating MP3..."
    sox notification.wav notification.mp3
    echo "✅ notification.mp3 created"
else
    echo "⚠️  Skipping MP3 (lame not installed)"
fi

# Convert to OGG (requires vorbis-tools)
if sox --help 2>&1 | grep -q ogg; then
    echo "📝 Generating OGG..."
    sox notification.wav notification.ogg
    echo "✅ notification.ogg created"
else
    echo "⚠️  Skipping OGG (vorbis-tools not installed)"
fi

echo ""
echo "✨ Done! Notification sounds generated in public/sounds/"
echo ""
echo "Generated files:"
ls -lh notification.*

echo ""
echo "🎧 Test the sounds:"
echo "  play notification.wav"
