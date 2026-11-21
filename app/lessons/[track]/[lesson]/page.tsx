import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonAside } from "@/components/LessonAside";
import { Markdown } from "@/components/Markdown";
import { getLesson, getLessonNeighbours, getTrack, getTracks } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";

type LessonPageProps = {
  params: Promise<{ track: string; lesson: string }>;
};

/** Every chapter is generated at build time; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getTracks().flatMap((track) =>
    track.lessons.map((lesson) => ({ track: track.slug, lesson: lesson.slug })),
  );
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { track, lesson } = await params;
  const item = getLesson(track, lesson);
  return item ? { title: item.title } : {};
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { track: trackSlug, lesson: lessonSlug } = await params;
  const track = getTrack(trackSlug);
  const lesson = getLesson(trackSlug, lessonSlug);

  if (!track || !lesson) notFound();

  const { previous, next } = getLessonNeighbours(trackSlug, lessonSlug);

  return (
    <div className="shell lesson">
      <LessonAside
        track={{ slug: track.slug, title: track.title, part: track.part }}
        lessons={track.lessons}
        current={lesson.slug}
      />

      <article>
        <header className="lesson__head">
          <p className="intro__kicker">Chapter {String(lesson.chapter).padStart(2, "0")}</p>
          <h1 className="lesson__title">{lesson.title}</h1>
        </header>

        <Markdown html={renderMarkdown(lesson.body)} />

        <nav className="pager" aria-label="Chapters">
          {previous ? (
            <Link className="pager__link" href={`/lessons/${track.slug}/${previous.slug}`}>
              <span className="pager__label">Chapter {String(previous.chapter).padStart(2, "0")}</span>
              <span className="pager__title">{previous.title}</span>
            </Link>
          ) : (
            <span className="pager__spacer" />
          )}
          {next ? (
            <Link className="pager__link pager__link--next" href={`/lessons/${track.slug}/${next.slug}`}>
              <span className="pager__label">Chapter {String(next.chapter).padStart(2, "0")}</span>
              <span className="pager__title">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </article>
    </div>
  );
}
