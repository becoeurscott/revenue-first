#!/usr/bin/env bash
# Generates the app's sound effects with ElevenLabs into ios/.../Resources/SFX/<name>.m4a.
#   ELEVENLABS_API_KEY=... scripts/sfx.sh           # only missing sounds
#   ELEVENLABS_API_KEY=... scripts/sfx.sh --force   # regenerate all
set -euo pipefail
: "${ELEVENLABS_API_KEY:?Set ELEVENLABS_API_KEY}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/ios/FirstRevenue/FirstRevenue/Resources/SFX"
mkdir -p "$OUT"
FORCE="${1:-}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# name|seconds|prompt
SOUNDS=(
  "tap|0.5|Soft cute bubbly UI pop, short click for a mobile game button, clean, no reverb"
  "select|0.5|Light playful bloop for selecting an answer in a friendly mobile app, bright and short"
  "gift-appear|1.2|Magical sparkle chime, a gift appearing in a cute mobile game, twinkly bells"
  "gift-open|2.5|Cartoon gift box bursting open, whoosh then sparkly pop and short happy fanfare, mobile game"
  "reveal|1.2|Cheerful coin cha-ching with sparkles, reward revealed in a mobile game"
  "success|2|Short joyful celebration jingle, level complete in a cute mobile game, bright synth and bells"
  "error|0.7|Soft friendly cartoon bonk, gentle error sound for a mobile app, not harsh"
)

for entry in "${SOUNDS[@]}"; do
  IFS='|' read -r name secs prompt <<<"$entry"
  dest="$OUT/$name.m4a"
  if [[ -f "$dest" && "$FORCE" != "--force" ]]; then echo "skip $name"; continue; fi
  echo "-> $name"
  body=$(python3 -c 'import json,sys;print(json.dumps({"text":sys.argv[1],"duration_seconds":float(sys.argv[2]),"prompt_influence":0.6}))' "$prompt" "$secs")
  curl -sS --fail -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d "$body" -o "$TMP/$name.mp3"
  ffmpeg -v error -y -i "$TMP/$name.mp3" -af "loudnorm=I=-18:TP=-2" -c:a aac -b:a 96k "$dest"
done
echo "Done: $(ls "$OUT" | wc -l | tr -d ' ') sounds in $OUT"
