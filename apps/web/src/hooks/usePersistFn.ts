import { useRef } from "react";

type AnyFn = (...args: readonly unknown[]) => unknown;

/**
 * Stable callback wrapper that preserves the original function signature.
 */
export function usePersistFn<T extends AnyFn>(fn: T): T {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (!persistFn.current) {
    persistFn.current = ((...args: Parameters<T>) => {
      const current = fnRef.current!;
      return current(...args);
    }) as T;
  }

  return persistFn.current as T;
}
