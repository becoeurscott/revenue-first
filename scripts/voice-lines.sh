#!/usr/bin/env bash
# Generates Vault's onboarding voice lines with ElevenLabs and saves them as .m4a in the app bundle.
#
#   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... scripts/voice-lines.sh          # only missing lines
#   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... scripts/voice-lines.sh --force  # regenerate all
#
# One file per question: onb-<key>.m4a, plus onb-<key>-<journey>.m4a where a journey rewords it.
# "{name}" is dropped from the spoken line (the recording can't know the user's name).
set -euo pipefail

: "${ELEVENLABS_API_KEY:?Set ELEVENLABS_API_KEY}"
: "${ELEVENLABS_VOICE_ID:?Set ELEVENLABS_VOICE_ID (pick a voice in the ElevenLabs Voice Library)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CATALOG="$ROOT/ios/FirstRevenue/FirstRevenue/Resources/Data/journeys.json"
OUT="$ROOT/ios/FirstRevenue/FirstRevenue/Resources/Voice"
FORCE="${1:-}"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

python3 - "$CATALOG" > "$TMP/lines.tsv" <<'PY'
import json, re, sys
d = json.load(open(sys.argv[1]))
def spoken(s):
    s = re.sub(r",?\s*\{name\}", "", s)
    return re.sub(r"\s+", " ", s).strip()
for q in d["onboarding"]:
    print(f"onb-{q['key']}\t{spoken(q['title'])}")
    for method, v in (q.get("variants") or {}).items():
        if v.get("title"):
            print(f"onb-{q['key']}-{method}\t{spoken(v['title'])}")
PY

count=0
while IFS=$'\t' read -r name text; do
  [[ -z "$name" ]] && continue
  if [[ -f "$OUT/$name.m4a" && "$FORCE" != "--force" ]]; then continue; fi
  echo "→ $name: $text"
  body=$(python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1], "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35}}))' "$text")
  curl -sS --fail -X POST "https://api.elevenlabs.io/v1/text-to-speech/$ELEVENLABS_VOICE_ID?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "content-type: application/json" \
    -d "$body" -o "$TMP/$name.mp3"
  afconvert -f m4af -d aac -b 96000 "$TMP/$name.mp3" "$OUT/$name.m4a"
  count=$((count + 1))
done < "$TMP/lines.tsv"

echo "Done: $count new line(s) in $OUT"
