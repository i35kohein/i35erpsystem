import { useEffect, useState } from 'react';

/**
 * Detect iPad hardware (iPadOS 13+ Safari reports as Macintosh with touch).
 * Used to gate the "clean iPad" UI (filters in drawer, minimal toolbars)
 * while keeping the original desktop layout for real desktops.
 *
 * LANDSCAPE iPads report as desktops (Ko Hein 2026-08-09): iPad landscape
 * (>=1024px wide) uses the exact same desktop navbar/layout; only PORTRAIT
 * iPads keep the clean drawer UI.
 */
export function useIsIpad(): boolean {
  const [isIpad, setIsIpad] = useState(false);
  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent;
      const hasIpadToken = /iPad/i.test(ua);
      // iPadOS 13+ masquerades as macOS Safari — the giveaway is multi-touch
      // on a "Macintosh" platform (real Macs have maxTouchPoints 0/1).
      const isIPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsIpad((hasIpadToken || isIPadOS) && !isLandscape);
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);
  return isIpad;
}
