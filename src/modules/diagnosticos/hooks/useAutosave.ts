import { useCallback, useEffect, useRef, useState } from "react";

type Saver = () => Promise<void>;
export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave. Each key keeps only its latest pending save;
 * all pending saves flush together after `delay` ms of inactivity.
 */
export function useAutosave(delay = 800) {
  const pending = useRef(new Map<string, Saver>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SaveState>("idle");

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const jobs = [...pending.current.values()];
    pending.current.clear();
    if (!jobs.length) return;
    setState("saving");
    try {
      await Promise.all(jobs.map((j) => j()));
      setState("saved");
    } catch {
      setState("error");
    }
  }, []);

  const schedule = useCallback(
    (key: string, saver: Saver) => {
      pending.current.set(key, saver);
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      void flush();
    };
  }, [flush]);

  return { schedule, flush, state, setState };
}
