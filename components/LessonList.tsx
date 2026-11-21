"use client";

import Link from "next/link";
import { lessonKey } from "@/lib/progress";
import { useProgress } from "@/components/useProgress";

type LessonListProps = {
  track: string;
  lessons: { slug: string; title: string; chapter: number }[];
};

/** Chapter rows plus the part's reading count, both driven by stored progress. */
export function LessonList({ track, lessons }: LessonListProps) {
  const { read } = useProgress();
  const readKeys = new Set(read);
  const done = lessons.filter((lesson) => readKeys.has(lessonKey(track, lesson.slug))).length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <>
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

      <div className="lesson-list">
        {lessons.map((lesson) => (
          <Link
            key={lesson.slug}
            className="lesson-row"
            href={`/lessons/${track}/${lesson.slug}`}
            data-read={readKeys.has(lessonKey(track, lesson.slug))}
          >
            <span className="lesson-row__index">
              <span className="lesson-row__dot" />
              {String(lesson.chapter).padStart(2, "0")}
            </span>
            <span className="lesson-row__title">{lesson.title}</span>
            <span className="lesson-row__arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
