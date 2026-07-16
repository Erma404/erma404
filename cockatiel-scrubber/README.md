# Cockatiel head-turn scrubber

A mouse-position-driven video scrubber: the video never autoplays — its current
frame is driven directly by horizontal cursor position. Move the mouse left and
the cockatiel turns to face left; move right and it faces right; dead-center is
the neutral pose.

## Setup

```bash
npm install
npm run prepare-video   # needs ffmpeg + network access to the Higgsfield CDN
npm run dev
```

`prepare-video` downloads the two generated head-turn clips (each starts from
the same neutral frame and turns to an opposite extreme), reverses the
left-turn clip, concatenates it with the right-turn clip so the neutral pose
sits exactly at the midpoint, and re-encodes the result into
`public/cockatiel-sweep.mp4` plus a `public/neutral.jpg` poster.

> The script must run on a machine with open network access — the sandbox this
> project was authored in blocks the Higgsfield CDN
> (`d8j0ntlcm91z4.cloudfront.net`) by egress policy.

## How it works (and why each step matters)

1. **All-intra re-encode** (`-g 1 -keyint_min 1 -sc_threshold 0`): a normal
   export only has a keyframe every ~2 seconds, so seeking to an arbitrary
   frame forces the browser to decode forward from the last keyframe — that is
   what causes stutter. With a keyframe on every frame, every seek is a single
   decode. If the file comes out too large, re-run with a higher CRF:
   `CRF=28 npm run prepare-video`.
2. **Direct mapping, no smoothing**: pointer X as a fraction of container width
   (0–1) × `video.duration` is written straight to `video.currentTime` on every
   `pointermove`. Springing/easing the input makes the video lag and visibly
   "catch up" after the mouse stops.
3. **Seek throttling**: updates are skipped while `video.seeking` is true or
   when the target is within ~1/12 s of the current time; a `seeked` listener
   re-applies the latest pointer position so the final pose is always reached.
4. **Markup**: `<video muted playsInline preload="auto">` with autoplay, loop,
   and controls off, `object-fit: cover`, and the neutral frame as the poster
   so nothing flashes before JS attaches.
5. **Fallbacks**: under `prefers-reduced-motion`, or on devices without a fine
   persistent pointer (touch), the static neutral-frame image is shown instead
   of the video.

## Measuring seek latency

If scrubbing still feels sluggish, measure it directly in the browser console:

```js
const v = document.createElement("video");
v.muted = true; v.preload = "auto"; v.src = "/cockatiel-sweep.mp4";
v.addEventListener("loadedmetadata", async () => {
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * v.duration;
    const t0 = performance.now();
    await new Promise((r) => { v.addEventListener("seeked", r, { once: true }); v.currentTime = t; });
    console.log(`seek to ${t.toFixed(2)}s: ${(performance.now() - t0).toFixed(1)}ms`);
  }
});
```

Consistent double-digit milliseconds means the encode is fine; triple digits
means raise CRF (smaller frames decode and load faster) and re-run the script.
