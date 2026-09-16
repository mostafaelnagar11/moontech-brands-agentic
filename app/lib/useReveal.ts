"use client";

/* Marks an element the first time a fifth of it is on screen.

   The landing's motion is all opacity and transform, driven by one
   attribute: `.reveal` and `.rule-draw` in globals.css read `data-in`
   and nothing else. The hook sets it once and disconnects, so scrolling
   back up never replays anything, and a user who has asked the system
   to stop moving things gets the finished state from the stylesheet's
   reduced-motion block without this hook knowing. */

import { useEffect, useRef } from "react";

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
