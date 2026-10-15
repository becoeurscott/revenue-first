#!/bin/bash
# Generate mascot clips in parallel, skipping ones that already exist.
# Usage: bash scripts/wan-mascot-batch.sh [name ...]   (no names = all 11)
# Override WAN_MODEL / WAN_RESOLUTION for the final round (e.g. wan2.2-i2v-plus + 1080P).
cd "$(dirname "$0")/.." || exit 1
export WAN_MODEL="${WAN_MODEL:-wan2.2-i2v-flash}" WAN_RESOLUTION="${WAN_RESOLUTION:-720P}"
IMG=assets/mascot/vaulten-mascot.jpg
OUT=assets/mascot/clips
LOOP="Seamless loop: the clip starts and ends in the exact same neutral standing pose as the input image."
ONLY=" $* "
run() { [ "$ONLY" != "  " ] && [[ "$ONLY" != *" $1 "* ]] && return; [ -s "$OUT/$1.mp4" ] && return; sleep 20; node scripts/wan-mascot-video.mjs "$IMG" "$OUT/$1.mp4" --prompt "$2" > "$OUT/$1.log" 2>&1 & }

run happy     "The cat mascot stands relaxed and content, gently bobbing side to side with soft idle breathing, ears give a small happy twitch, one slow blink. $LOOP"
run thinking  "The cat mascot thinks: raises one hand to its chin, tilts its head slightly to one side and looks up and to the side, holds the pose, then returns. $LOOP"
run excited "The cat mascot is excited: bounces up and down twice on its toes with both fists pumped near its chest, ears perked up. Both glowing white oval eyes stay wide open and fully bright the entire time, never closing. Then it settles. $LOOP"
run wink "The cat mascot winks: ONLY its left eye briefly squeezes shut into a thin glowing line for half a second while its RIGHT eye stays a fully open glowing white oval the whole time, with a small playful head tilt toward the closed eye, then the left eye reopens. $LOOP"
run sad       "The cat mascot is sad: shoulders droop, head lowers and tilts down, ears fold back slightly, hands hang low, a slow sigh, then it straightens up a little. $LOOP"
run sleepy    "The cat mascot is sleepy: head slowly nods forward as both glowing eyes narrow to thin lines, then it catches itself and lifts its head back up drowsily. $LOOP"
run love      "The cat mascot shows affection: brings both hands together in front of its chest and sways shyly from side to side, head tilted warmly. $LOOP"
run focused "The cat mascot is focused and determined: leans slightly forward, gives one firm small nod, and clenches one fist at its side. Both glowing white oval eyes stay open, bright and clearly visible facing the camera the whole time. Head stays facing forward. $LOOP"
run greeting  "The cat mascot waves hello with one gloved hand raised high, two friendly waves, then lowers the hand and stands ready."
run celebrate "The cat mascot celebrates: crouches, jumps up joyfully with both arms raised high in the air, lands, and gives a happy little bounce."
run tap "The cat mascot reacts to being poked: a quick startled hop straight up with ears flicking, both glowing white oval eyes open wider in surprise, lands, and shakes it off with a little wiggle. The eyes stay round ovals, never narrowing. $LOOP"
wait
echo "all done"; grep -h "saved\|failed" $OUT/*.log
