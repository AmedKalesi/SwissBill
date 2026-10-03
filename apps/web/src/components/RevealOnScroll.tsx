import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper.
 *
 * Adds a subtle fade + rise as the element enters the viewport. The animation
 * itself lives in `index.css` (`.reveal` / `[data-revealed="true"]`) so it is
 * automatically neutralised by the global `prefers-reduced-motion` rule.
 *
 * The element is revealed immediately when:
 *  - IntersectionObserver is unavailable (very old browsers / SSR snapshots), or
 *  - the user prefers reduced motion.
 * That guarantees content is never stuck invisible.
 */
type RevealOnScrollProps = {
  children: ReactNode;
  /** Extra classes forwarded to the wrapper element. */
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  /** Render as a different element (defaults to `div`). */
  as?: "div" | "section" | "li" | "article";
};

export function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      // Trigger slightly before the element is fully in view so the motion
      // finishes as the user's eye arrives.
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-revealed={revealed ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}
