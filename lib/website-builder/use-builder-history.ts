"use client";

import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

export function useBuilderHistory<T>(initial: T) {
  const [state, setStateInternal] = useState(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false });

  const refreshFlags = useCallback(() => {
    setHistoryFlags({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  const setState = useCallback(
    (next: T | ((prev: T) => T), options?: { skipHistory?: boolean }) => {
      setStateInternal((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (!options?.skipHistory) {
          pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
          futureRef.current = [];
        }
        refreshFlags();
        return value;
      });
    },
    [refreshFlags]
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    setStateInternal((current) => {
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [current, ...futureRef.current];
      refreshFlags();
      return previous;
    });
  }, [refreshFlags]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    setStateInternal((current) => {
      const next = future[0];
      futureRef.current = future.slice(1);
      pastRef.current = [...pastRef.current, current];
      refreshFlags();
      return next;
    });
  }, [refreshFlags]);

  const resetHistory = useCallback(
    (value: T) => {
      pastRef.current = [];
      futureRef.current = [];
      setStateInternal(value);
      refreshFlags();
    },
    [refreshFlags]
  );

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: historyFlags.canUndo,
    canRedo: historyFlags.canRedo,
    resetHistory,
  };
}
