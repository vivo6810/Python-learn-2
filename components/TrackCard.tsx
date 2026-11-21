"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent } from "react";
import { lessonKey } from "@/lib/progress";
import { useProgress } from "@/components/useProgress";

type TrackCardProps = {
  slug: string;
  title: string;
  part: string;
  chapters: number;
  lessonSlugs: string[];
  index: number;
};

export function TrackCard({ slug, title, part, chapters, lessonSlugs, index }: TrackCardProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const { read } = useProgress();
  const done = lessonSlugs.filter((lesson) => read.includes(lessonKey(slug, lesson))).length;

  function trackPointer(event: PointerEvent<HTMLAnchorElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <Link
      ref={ref}
      href={`/tracks/${slug}`}
      className="track-card"
      style={{ "--i": index } as CSSProperties}
      onPointerMove={trackPointer}
    >
      <span className="track-card__index">Part {part}</span>
      <h3 className="track-card__title">{title}</h3>
      <span className="track-card__foot">
        <span>
          {done} / {chapters} read
        </span>
        <span className="track-card__arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
