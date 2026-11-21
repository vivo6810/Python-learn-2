"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PROGRESS,
  readProgress,
  subscribeProgress,
  type Progress,
} from "@/lib/progress";

/** Progress lives in localStorage, so it renders empty until the client reads it. */
export function useProgress(): Progress {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  useEffect(() => {
    setProgress(readProgress());
    return subscribeProgress(() => setProgress(readProgress()));
  }, []);

  return progress;
}
