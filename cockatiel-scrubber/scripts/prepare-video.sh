#!/usr/bin/env bash
# Builds public/cockatiel-sweep.mp4 and public/neutral.jpg from the two
# generated head-turn clips. Run from the cockatiel-scrubber/ directory:
#
#   bash scripts/prepare-video.sh
#
# Requires: ffmpeg, ffprobe, curl, and network access to the Higgsfield CDN.
#
# Both source clips start from the SAME neutral frame:
#   LEFT  clip: neutral pose -> profile facing left
#   RIGHT clip: neutral pose -> profile facing right
# The LEFT clip is reversed and concatenated with the RIGHT clip, giving one
# continuous sweep: left profile -> neutral (exact midpoint) -> right profile.
#
# The re-encode places a keyframe on EVERY frame (-g 1 -keyint_min 1
# -sc_threshold 0). This is not optional: a normal export keyframes every
# ~2 seconds, so seeking to an arbitrary frame forces the browser to decode
# forward from the last keyframe — that is what causes scrub stutter.
set -euo pipefail
cd "$(dirname "$0")/.."

LEFT_URL="https://d8j0ntlcm91z4.cloudfront.net/user_33rtKIwxl8xQN8ccvHNuaK5JFHV/hf_20260716_084505_2d57a897-4b77-4e9e-ad33-b59c6e436daf.mp4"
RIGHT_URL="https://d8j0ntlcm91z4.cloudfront.net/user_33rtKIwxl8xQN8ccvHNuaK5JFHV/hf_20260716_084052_8c12a44a-6aa1-4071-88ed-4baabf90f719.mp4"

# If the seek latency test (see README) shows the file is too slow or too
# large, raise CRF — all-intra encoding inflates high-detail footage.
CRF="${CRF:-24}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

echo "Downloading source clips..."
curl -fsSL -o "$workdir/left.mp4" "$LEFT_URL"
curl -fsSL -o "$workdir/right.mp4" "$RIGHT_URL"

mkdir -p public

echo "Reversing left clip, concatenating, re-encoding all-intra (crf $CRF)..."
ffmpeg -y -i "$workdir/left.mp4" -i "$workdir/right.mp4" \
  -filter_complex "[0:v]reverse,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,scale=1920:-2[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf "$CRF" -g 1 -keyint_min 1 -sc_threshold 0 \
  -pix_fmt yuv420p -an -movflags +faststart public/cockatiel-sweep.mp4

echo "Extracting neutral midpoint frame as poster..."
duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/cockatiel-sweep.mp4)"
midpoint="$(awk -v d="$duration" 'BEGIN { printf "%.3f", d / 2 }')"
ffmpeg -y -ss "$midpoint" -i public/cockatiel-sweep.mp4 -frames:v 1 -q:v 2 public/neutral.jpg

echo "Done:"
ls -lh public/cockatiel-sweep.mp4 public/neutral.jpg
