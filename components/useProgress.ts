"use client";

import { useSyncExternalStore } from "react";
import {
  getProgressServerSnapshot,
  getProgressSnapshot,
  subscribeProgress,
  type Progress,
} from "@/lib/progress";

/**
 * Progress lives in localStorage, so the server snapshot is always empty and the
 * real value arrives from the client store — no setState-in-effect needed.
 */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, getProgressServerSnapshot);
}
