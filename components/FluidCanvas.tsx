"use client";

import { useEffect, useRef } from "react";

type Blob = {
  x: number;
  y: number;
  r: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  phase: number;
  depth: number;
  color: number;
  alpha: number;
};

const BLOBS: Blob[] = [
  { x: 0.22, y: 0.32, r: 0.52, ax: 0.1, ay: 0.08, sx: 0.21, sy: 0.17, phase: 0.4, depth: 0.06, color: 0, alpha: 0.72 },
  { x: 0.72, y: 0.24, r: 0.46, ax: 0.12, ay: 0.1, sx: 0.16, sy: 0.23, phase: 2.1, depth: 0.1, color: 1, alpha: 0.6 },
  { x: 0.52, y: 0.7, r: 0.55, ax: 0.14, ay: 0.07, sx: 0.13, sy: 0.19, phase: 4.2, depth: 0.08, color: 0, alpha: 0.62 },
  { x: 0.88, y: 0.68, r: 0.34, ax: 0.08, ay: 0.12, sx: 0.24, sy: 0.15, phase: 1.2, depth: 0.14, color: 1, alpha: 0.45 },
  { x: 0.12, y: 0.82, r: 0.36, ax: 0.09, ay: 0.09, sx: 0.18, sy: 0.2, phase: 3.3, depth: 0.12, color: 0, alpha: 0.42 },
];

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  const numeric = Number.parseInt(full, 16);
  if (!Number.isFinite(numeric)) return `rgba(15, 95, 82, ${alpha})`;

  return `rgba(${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}, ${alpha})`;
}

function readPalette(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return ["--field-1", "--field-2"].map(
    (name) => styles.getPropertyValue(name).trim() || "#0f5f52",
  );
}

/** The liquid backdrop: five soft colour fields drifting on a slow sine field, pulled toward the pointer. */
export function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0.5, y: 0.45, targetX: 0.5, targetY: 0.45 };
    let palette = readPalette();
    let dark = document.documentElement.dataset.theme === "dark";
    let width = 0;
    let height = 0;
    let frame = 0;
    let start = performance.now();
    let hiddenAt: number | null = null;
    let visible = true;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function paint(time: number) {
      if (!context) return;
      const elapsed = (time - start) / 1000;
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = dark ? "lighter" : "source-over";

      const size = Math.max(width, height);

      for (const blob of BLOBS) {
        const x = (blob.x + Math.sin(elapsed * blob.sx + blob.phase) * blob.ax + (pointer.x - 0.5) * blob.depth) * width;
        const y = (blob.y + Math.cos(elapsed * blob.sy + blob.phase) * blob.ay + (pointer.y - 0.5) * blob.depth) * height;
        const radius = blob.r * size * (1 + Math.sin(elapsed * 0.35 + blob.phase) * 0.07);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        const color = palette[blob.color] ?? "#ef501c";

        gradient.addColorStop(0, hexToRgba(color, blob.alpha));
        gradient.addColorStop(0.55, hexToRgba(color, blob.alpha * 0.4));
        gradient.addColorStop(1, hexToRgba(color, 0));
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
    }

    function loop(time: number) {
      frame = 0;
      if (!visible) return;
      paint(time);
      if (!reduced) frame = requestAnimationFrame(loop);
    }

    function schedule() {
      if (frame || reduced || !visible) return;
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) paint(performance.now());
      schedule();
    });
    observer.observe(canvas);

    const onPointer = (event: PointerEvent) => {
      pointer.targetX = event.clientX / window.innerWidth;
      pointer.targetY = event.clientY / window.innerHeight;
    };

    const onVisibility = () => {
      const hidden = document.hidden;
      if (hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt !== null) {
        // Shift the clock forward by the time the tab was hidden, so the field
        // continues from where it paused instead of jumping to an initial frame.
        start += performance.now() - hiddenAt;
        hiddenAt = null;
      }
      visible = !hidden;
      schedule();
    };

    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      dark = document.documentElement.dataset.theme === "dark";
      if (reduced) paint(performance.now());
    });

    resize();
    if (reduced) paint(performance.now());
    schedule();

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />;
}
