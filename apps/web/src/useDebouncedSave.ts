import { useCallback, useRef } from "react";

export function useDebouncedSave<Args extends unknown[]>(
  save: (...args: Args) => void,
  delay = 400,
) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  return useCallback(
    (key: string, ...args: Args) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => save(...args), delay),
      );
    },
    [save, delay],
  );
}
