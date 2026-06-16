"use client";

import { useEffect } from "react";

function getMaxScrollY() {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
}

/**
 * On mobile, clamps document scroll past the last pixel of content and
 * eases back — similar to native app rubber-band at the bottom edge.
 * Prevents layout flicker when switching tabs at a scrolled position.
 */
export function MobileScrollSnapBack() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;

    let frame = 0;
    let snapping = false;

    const snapBack = () => {
      if (snapping) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = getMaxScrollY();
        const overflow = window.scrollY - max;

        if (overflow > 2) {
          snapping = true;
          window.scrollTo({ top: max, behavior: "smooth" });
          window.setTimeout(() => {
            snapping = false;
          }, 350);
        }
      });
    };

    window.addEventListener("scroll", snapBack, { passive: true });
    window.addEventListener("touchend", snapBack, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", snapBack);
      window.removeEventListener("touchend", snapBack);
    };
  }, []);

  return null;
}
