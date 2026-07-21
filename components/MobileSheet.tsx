"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

// Fraction of the viewport the sheet occupies when fully expanded, and the
// visible fraction at the default "peek" snap (enough to read a panel's title,
// category, and the start of its content per requirement 3).
const FULL = 0.9;
const PEEK = 0.5;

// Phone-only swipe-up bottom sheet. Drag the grip handle to move the whole
// sheet between two snaps (peek / full); a downward fling or a drag well below
// peek dismisses it. Only the grip drives dragging
// — the content region below owns vertical scrolling. The rest of the screen is
// deliberately pointer-transparent so the 3D model remains available for orbit
// and pinch zoom without closing or resetting the active panel.
export function MobileSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [vh, setVh] = useState(0);
  const [offset, setOffset] = useState(0); // translateY in px from fully-expanded
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startOffset: number; lastY: number; lastT: number; v: number } | null>(null);

  const sheetHeight = vh * FULL;
  const peekOffset = vh * (FULL - PEEK);

  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Start each opening at the peek snap.
  useEffect(() => {
    if (open && vh) setOffset(peekOffset);
    // peekOffset is derived from vh; depending on [open, vh] is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vh]);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startY: e.clientY, startOffset: offset, lastY: e.clientY, lastT: performance.now(), v: 0 };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    const next = Math.min(Math.max(drag.current.startOffset + dy, 0), sheetHeight);
    const now = performance.now();
    drag.current.v = (e.clientY - drag.current.lastY) / Math.max(1, now - drag.current.lastT); // px/ms, +down
    drag.current.lastY = e.clientY;
    drag.current.lastT = now;
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { v } = drag.current;
    const cur = offset;
    drag.current = null;
    setDragging(false);
    if (v > 0.6 || cur > peekOffset + vh * 0.12) {
      onClose();
      return;
    }
    if (v < -0.4) {
      setOffset(0);
      return;
    }
    setOffset(cur < peekOffset / 2 ? 0 : peekOffset);
  };

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 sm:hidden">
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-ink-700 bg-ink-900 shadow-2xl shadow-black/40"
        style={{
          height: `${FULL * 100}dvh`,
          transform: `translateY(${offset}px)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2.5 active:cursor-grabbing"
        >
          <div className="h-1.5 w-10 rounded-full bg-ink-600" />
        </div>
        <div
          className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y"
          // At the peek snap, the sheet's lower portion sits below the
          // viewport. Matching bottom padding makes that hidden height part
          // of the scroll range, so a long panel's final cards can reach the
          // actually visible bottom edge instead of stopping underneath it.
          style={{ paddingBottom: offset }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
