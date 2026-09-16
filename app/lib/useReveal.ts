"use client";

/* Marks an element the first time a fifth of it is on screen.

   The landing's motion is all opacity and transform, driven by one
   attribute: `.reveal` and `.rule-draw` in globals.css read `data-in`
   and nothing else. The hook sets it once and disconnects, so scrolling
   back up never replays anything, and a user who has asked the system
   to stop moving things gets the finished state from the stylesheet's
   reduced-motion block without this hook knowing. */

import { useEffect, useRef, useState } from "react";

export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.setAttribute("data-in", ""); return; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { el.setAttribute("data-in", ""); io.disconnect(); }
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/* The same trigger as a value rather than as an attribute, for the few
   places where the reveal has to run JavaScript: a figure that counts
   up cannot be expressed in a stylesheet. Fires once, then disconnects. */
export function useInView<T extends Element>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, seen]);
  return [ref, seen] as const;
}

/* Counts to a number once, easing out so it slows into place rather
   than stopping dead. Reduced motion gets the number, not the count. */
export function useCountUp(to: number, go: boolean, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, go, ms]);
  return n;
}
