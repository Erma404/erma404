import { useEffect, useRef } from "react";

// Don't bother re-seeking for targets closer than this to the current frame.
// Without it (and the `seeking` guard), fast mouse movement queues more seeks
// than the decoder can drain and playback stutters.
const SEEK_EPSILON = 1 / 12; // seconds

/**
 * Drives a video's currentTime directly from horizontal pointer position over
 * a container: x = 0 → t = 0, x = container width → t = duration. The pointer
 * fraction maps to currentTime with NO spring/ease/smoothing — smoothing here
 * makes the video lag and "catch up" after the mouse stops. Seek smoothness
 * must come from the asset itself (all-intra re-encode, see
 * scripts/prepare-video.sh), never from input filtering.
 *
 * The source clip is a left-profile → neutral → right-profile sweep, so the
 * dead-center pointer position (fraction 0.5) lands on the neutral pose.
 */
export function useVideoScrubber() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  // Latest pointer position as a 0..1 fraction. Starts at the neutral midpoint.
  const targetFraction = useRef(0.5);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return undefined;

    const applySeek = () => {
      const { duration } = video;
      if (!Number.isFinite(duration) || duration <= 0) return;
      // Throttle: skip while a seek is still in flight; the `seeked` handler
      // below catches the video up to the latest pointer position.
      if (video.seeking) return;
      const target = targetFraction.current * duration;
      if (Math.abs(video.currentTime - target) < SEEK_EPSILON) return;
      video.currentTime = target;
    };

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0) return;
      const fraction = (event.clientX - rect.left) / rect.width;
      targetFraction.current = Math.min(1, Math.max(0, fraction));
      applySeek();
    };

    // When an in-flight seek finishes, re-apply the latest target so updates
    // skipped by the `seeking` guard still land on the final pose.
    const onSeeked = applySeek;

    const onLoadedMetadata = () => {
      video.pause();
      applySeek();
    };

    container.addEventListener("pointermove", onPointerMove);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onLoadedMetadata();

    return () => {
      container.removeEventListener("pointermove", onPointerMove);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  return { containerRef, videoRef };
}
