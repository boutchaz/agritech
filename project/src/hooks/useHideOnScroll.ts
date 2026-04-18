import { useEffect, useRef, useState } from 'react';

interface UseHideOnScrollOptions {
  /** Only hide when scrolled past this many pixels from the top. Default 64. */
  threshold?: number;
  /** Ignore scroll deltas smaller than this to avoid flicker. Default 6. */
  delta?: number;
  /** Disable the hook entirely (e.g. on desktop). Default false. */
  disabled?: boolean;
}

/**
 * YouTube-style header auto-hide. Returns `true` when the page is
 * scrolled down past the threshold AND the user is currently scrolling
 * down; `false` while scrolling up or near the top.
 *
 * Small delta filter keeps the header from flickering on momentum
 * scrolls and on Safari's rubber-band overscroll.
 */
export function useHideOnScroll({
  threshold = 64,
  delta = 6,
  disabled = false,
}: UseHideOnScrollOptions = {}): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef<number>(0);

  useEffect(() => {
    if (disabled) return;

    // The authenticated shell scrolls its `<main data-main-scroll>`
    // element, not the window. Fall back to window if we can't find it
    // (public / auth routes).
    const target: HTMLElement | (Window & typeof globalThis) =
      document.querySelector<HTMLElement>('[data-main-scroll]') ?? window;
    const getY = () =>
      target === window
        ? window.scrollY
        : (target as HTMLElement).scrollTop;

    lastYRef.current = getY();
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = getY();
        const diff = y - lastYRef.current;

        if (Math.abs(diff) < delta) return;

        if (y < threshold) {
          setHidden(false);
        } else if (diff > 0) {
          setHidden(true);
        } else {
          setHidden(false);
        }
        lastYRef.current = y;
      });
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [disabled, delta, threshold]);

  // When disabled flips on (e.g. breakpoint change to desktop), force
  // the header visible without doing setState inside the effect.
  return disabled ? false : hidden;
}
