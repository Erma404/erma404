import { useEffect, useState } from "react";

/**
 * Scrubbing is only offered when the user has NOT asked for reduced motion
 * and the device has a persistent fine pointer (a mouse/trackpad). On touch
 * devices or under prefers-reduced-motion the app shows the static neutral
 * frame instead of the video.
 *
 * Returns null until the first client-side evaluation so the initial render
 * can stay neutral (the static image), then true/false.
 */
export function useCanScrub() {
  const [canScrub, setCanScrub] = useState(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    const update = () => {
      setCanScrub(!reducedMotion.matches && finePointer.matches);
    };
    update();

    reducedMotion.addEventListener("change", update);
    finePointer.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
      finePointer.removeEventListener("change", update);
    };
  }, []);

  return canScrub;
}
