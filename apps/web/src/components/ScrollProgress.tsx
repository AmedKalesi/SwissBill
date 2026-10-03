import { useEffect, useState } from "react";

/**
 * Thin brand-coloured reading-progress bar pinned to the very top of the page.
 *
 * Uses a passive scroll listener + `requestAnimationFrame` throttle so it never
 * blocks scrolling. The bar is purely decorative (`aria-hidden`) and is hidden
 * entirely when the user prefers reduced motion, since it is a motion cue.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const value = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
      setProgress(value);
      setVisible(doc.scrollTop > 8);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
