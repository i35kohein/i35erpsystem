import { useEffect, useState } from 'react';

/**
 * Detect iPad hardware (iPadOS 13+ Safari reports as Macintosh with touch).
 * Used to gate the "clean iPad" UI (filters in drawer, minimal toolbars)
 * while keeping the original desktop layout for real desktops.
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
      setIsIpad(hasIpadToken || isIPadOS);
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);
  return isIpad;
}
