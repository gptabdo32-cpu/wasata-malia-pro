import { useEffect, useRef, useState } from "react";

export type BehavioralBiometricsSnapshot = {
  mouseMoves: number;
  keyPresses: number;
  lastActivityAt: number | null;
};

export function useBehavioralBiometrics() {
  const [snapshot, setSnapshot] = useState<BehavioralBiometricsSnapshot>({
    mouseMoves: 0,
    keyPresses: 0,
    lastActivityAt: null,
  });
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    if (typeof window === "undefined") return;
    mountedRef.current = true;

    let lastMoveAt = 0;
    let lastKeyAt = 0;

    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveAt < 100) return;
      lastMoveAt = now;
      setSnapshot((current) => ({
        ...current,
        mouseMoves: current.mouseMoves + 1,
        lastActivityAt: now,
      }));
    };

    const onKeyDown = () => {
      const now = Date.now();
      if (now - lastKeyAt < 50) return;
      lastKeyAt = now;
      setSnapshot((current) => ({
        ...current,
        keyPresses: current.keyPresses + 1,
        lastActivityAt: now,
      }));
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      mountedRef.current = false;
    };
  }, []);

  return snapshot;
}
