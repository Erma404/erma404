import { useCanScrub } from "./useCanScrub";
import { useVideoScrubber } from "./useVideoScrubber";

// Produced by scripts/prepare-video.sh — an all-intra (keyframe-every-frame)
// left-profile → neutral → right-profile sweep, plus its neutral midpoint
// frame as a still.
const SWEEP_VIDEO_SRC = "/cockatiel-sweep.mp4";
const NEUTRAL_FRAME_SRC = "/neutral.jpg";

function ScrubbableVideo() {
  const { containerRef, videoRef } = useVideoScrubber();

  return (
    <div ref={containerRef} className="stage">
      <video
        ref={videoRef}
        className="stage-media"
        src={SWEEP_VIDEO_SRC}
        poster={NEUTRAL_FRAME_SRC}
        muted
        playsInline
        preload="auto"
        autoPlay={false}
        loop={false}
        controls={false}
      />
    </div>
  );
}

function StaticFallback() {
  return (
    <div className="stage">
      <img
        className="stage-media"
        src={NEUTRAL_FRAME_SRC}
        alt="Cockatiel perched on a branch, facing the camera"
      />
    </div>
  );
}

export default function App() {
  const canScrub = useCanScrub();

  return (
    <main className="page">
      <h1>Cockatiel head-turn scrubber</h1>
      <p className="hint">
        {canScrub
          ? "Move the mouse left and right across the picture — the bird follows."
          : "Scrubbing needs a mouse; here is the resting pose."}
      </p>
      {canScrub ? <ScrubbableVideo /> : <StaticFallback />}
    </main>
  );
}
