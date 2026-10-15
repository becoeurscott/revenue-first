#!/bin/bash
# Turn the generated mascot clips (assets/mascot/clips/*.mp4) into transparent videos for the apps.
#
# Usage: bash scripts/mascot-clips.sh [name ...]   (no names = every clip in assets/mascot/clips)
#
# For each clip: cut the cat out of every frame on-device (scripts/mascot-matte.swift), then encode
#   ios/FirstRevenue/FirstRevenue/Mascot/Clips/mascot-<name>.mov   HEVC with alpha (iOS)
#   public/mascot/<name>.mov                                 HEVC with alpha (Safari)
#   public/mascot/<name>.webm                                VP9 with alpha (Chrome, Firefox, Edge)
#   public/mascot/<name>.png                                 first frame, shown before the video plays
# Needs ffmpeg (brew install ffmpeg) and Xcode's swiftc.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/mascot/clips
IOS=ios/FirstRevenue/FirstRevenue/Mascot/Clips
WEB=public/mascot
SIZE=480
FADE=15                            # frames (0.5s) of crossfade that close each mood loop
ONE_SHOTS="tap greeting celebrate gift-offer gift-open" # played once, so they keep their natural start and end
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$IOS" "$WEB"

swiftc -O scripts/mascot-matte.swift -o "$WORK/mascot-matte" 2>/dev/null

names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for f in "$SRC"/*.mp4; do names+=("$(basename "$f" .mp4)"); done
fi

for name in "${names[@]}"; do
  echo "== $name"
  rm -rf "$WORK/in" "$WORK/out"; mkdir -p "$WORK/in"
  cat "$SRC/$name.mp4" > /dev/null   # make iCloud download an evicted clip before ffmpeg reads it
  ffmpeg -v error -i "$SRC/$name.mp4" "$WORK/in/%04d.png"
  "$WORK/mascot-matte" "$WORK/in" "$WORK/out"
  scale="scale=$SIZE:$SIZE:flags=lanczos"
  case " $ONE_SHOTS " in
    *" $name "*) frames=(-framerate 30 -i "$WORK/out/%04d.png" -vf "$scale" -an) ;;
    *)
      # Mood clips loop, but the generated end pose never quite matches the start. Drop the first
      # FADE frames and crossfade the end into them, so the last frame flows into the first.
      count=$(ls "$WORK/out" | wc -l | tr -d ' ')
      offset=$(printf "%.4f" "$(echo "scale=4; ($count - 2 * $FADE) / 30" | bc)")
      fade=$(printf "%.4f" "$(echo "scale=4; $FADE / 30" | bc)")
      frames=(-framerate 30 -i "$WORK/out/%04d.png" -an -filter_complex
        "[0]format=rgba,split[a][b];[a]trim=start_frame=$FADE,setpts=PTS-STARTPTS[body];[b]trim=end_frame=$FADE,setpts=PTS-STARTPTS[head];[body][head]xfade=transition=fade:duration=$fade:offset=$offset,$scale")
      ;;
  esac
  ffmpeg -v error -y "${frames[@]}" -c:v hevc_videotoolbox -alpha_quality 0.8 -b:v 1200k -tag:v hvc1 -pix_fmt bgra "$IOS/mascot-$name.mov"
  cp "$IOS/mascot-$name.mov" "$WEB/$name.mov"
  ffmpeg -v error -y "${frames[@]}" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 -row-mt 1 "$WEB/$name.webm"
  ffmpeg -v error -y -c:v libvpx-vp9 -i "$WEB/$name.webm" -frames:v 1 -pix_fmt rgba "$WEB/$name.png"
  for f in "$IOS/mascot-$name.mov" "$WEB/$name.webm" "$WEB/$name.png"; do
    [ -s "$f" ] || { echo "   failed: $f is empty" >&2; exit 1; }
  done
  echo "   $(du -h "$IOS/mascot-$name.mov" | cut -f1) mov, $(du -h "$WEB/$name.webm" | cut -f1) webm"
done
