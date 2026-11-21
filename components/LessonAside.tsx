"use client";

import Link from "next/link";
import { useEffect } from "react";
import { lessonKey, markRead } from "@/lib/progress";
import { useProgress } from "@/components/useProgress";

type LessonAsideProps = {
  track: { slug: string; title: string; part: string };
  lessons: { slug: string; title: string; chapter: number }[];
  current: string;
};

/** The chapter sidebar; opening a chapter records it as read. */
export function LessonAside({ track, lessons, current }: LessonAsideProps) {
  const { read } = useProgress();
  const readKeys = new Set(read);
  const done = lessons.filter((lesson) => readKeys.has(lessonKey(track.slug, lesson.slug))).length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  useEffect(() => {
    markRead(lessonKey(track.slug, current));
  }, [track.slug, current]);

  return (
    <aside className="lesson__aside">
      <p className="lesson__aside-title">
        Part {track.part} · {track.title}
      </p>
      <div className="progress" aria-hidden="true">
        <span className="progress__label">
          <span>Read</span>
          <span>
            {String(done).padStart(2, "0")} / {String(lessons.length).padStart(2, "0")}
          </span>
        </span>
        <span className="progress__bar">
          <span className="progress__fill" style={{ width: `${percent}%` }} />
        </span>
      </div>
      <nav className="lesson__nav" aria-label={track.title}>
        {lessons.map((item) => (
          <Link
            key={item.slug}
            href={`/lessons/${track.slug}/${item.slug}`}
            aria-current={item.slug === current ? "page" : undefined}
            data-read={readKeys.has(lessonKey(track.slug, item.slug))}
          >
            <span className="lesson__nav-num">{String(item.chapter).padStart(2, "0")}</span>
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
