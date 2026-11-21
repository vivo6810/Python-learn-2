import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";

const TRACKS_DIR = path.join(process.cwd(), "content", "tracks");
const LESSON_FILE = /^(\d{2})-([a-z0-9-]+)\.md$/;

export type LessonMeta = {
  slug: string;
  title: string;
  track: string;
  position: number;
  /** Number in the course as a whole, counted across parts. */
  chapter: number;
};

export type Lesson = LessonMeta & {
  body: string;
};

export type SearchEntry = {
  track: string;
  part: string;
  slug: string;
  title: string;
  chapter: number;
  description: string;
  headings: string[];
};

export type Track = {
  slug: string;
  title: string;
  /** Part numeral, as printed in the book's table of contents. */
  part: string;
  order: number;
  lessons: LessonMeta[];
};

type TrackFile = {
  slug: string;
  title: string;
  part: string;
  order: number;
};

function readTrackFile(dir: string): TrackFile {
  const raw = fs.readFileSync(path.join(dir, "track.json"), "utf8");
  const data = JSON.parse(raw) as Partial<TrackFile>;

  if (!data.slug || !data.title || !data.part || typeof data.order !== "number") {
    throw new Error(`Invalid track.json in ${dir}`);
  }

  return { slug: data.slug, title: data.title, part: data.part, order: data.order };
}

function readLessons(dir: string, track: string): Lesson[] {
  return fs
    .readdirSync(dir)
    .flatMap((file) => {
      const match = LESSON_FILE.exec(file);
      if (!match) return [];

      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);

      if (typeof data.title !== "string" || !data.title) {
        throw new Error(`Missing title in ${file}`);
      }

      return [
        {
          slug: match[2],
          title: data.title,
          track,
          position: Number(match[1]),
          chapter: 0,
          body: content.trim(),
        },
      ];
    })
    .sort((a, b) => a.position - b.position);
}

/** Reads every track, sorts them, and numbers the chapters continuously from 1. */
const loadTracks = cache((): Track[] => {
  const tracks = fs
    .readdirSync(TRACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(TRACKS_DIR, entry.name);
      const meta = readTrackFile(dir);

      return {
        slug: meta.slug,
        title: meta.title,
        part: meta.part,
        order: meta.order,
        lessons: readLessons(dir, meta.slug).map(({ body: _body, ...lesson }) => lesson),
      };
    })
    .sort((a, b) => a.order - b.order);

  let chapter = 0;

  return tracks.map((track) => ({
    ...track,
    lessons: track.lessons.map((lesson) => ({ ...lesson, chapter: ++chapter })),
  }));
});

const loadLessons = cache((track: string): Lesson[] => {
  const dir = path.join(TRACKS_DIR, track);
  if (!fs.existsSync(dir)) return [];
  return readLessons(dir, track);
});

export function getTracks(): Track[] {
  return loadTracks();
}

export function getTrack(slug: string): Track | undefined {
  return getTracks().find((track) => track.slug === slug);
}

export function getLesson(track: string, lesson: string): Lesson | undefined {
  const meta = getTrack(track)?.lessons.find((item) => item.slug === lesson);
  const body = loadLessons(track).find((item) => item.slug === lesson)?.body;

  if (!meta || body === undefined) return undefined;

  return { ...meta, body };
}

const MARKDOWN_INLINE = /`{1,3}|!\[[^\]]*\]\([^)]*\)|\[([^\]]+)\]\([^)]*\)|[*_]{1,2}/g;

/** Markdown, reduced to the words a reader sees. */
function plainText(text: string): string {
  return text
    .replace(MARKDOWN_INLINE, (_match, link: string | undefined) => link ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function describe(body: string): string {
  const first = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !/^(#{1,6} |```|\||>|[-*+] |\d+\. )/.test(block));

  const text = plainText(first ?? "");
  if (text.length <= 170) return text;

  const cut = text.slice(0, 170);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function headings(body: string): string[] {
  return [...body.matchAll(/^## +(.+)$/gm)].map((match) => plainText(match[1]));
}

/** Everything the header search needs, small enough to ship with every page. */
export function getSearchIndex(): SearchEntry[] {
  return getTracks().flatMap((track) => {
    const bodies = new Map(loadLessons(track.slug).map((lesson) => [lesson.slug, lesson.body]));

    return track.lessons.map((lesson) => {
      const body = bodies.get(lesson.slug) ?? "";

      return {
        track: track.slug,
        part: track.part,
        slug: lesson.slug,
        title: lesson.title,
        chapter: lesson.chapter,
        description: describe(body),
        headings: headings(body),
      };
    });
  });
}

export function getLessonNeighbours(
  track: string,
  lesson: string,
): { previous?: LessonMeta; next?: LessonMeta } {
  const lessons = getTrack(track)?.lessons ?? [];
  const index = lessons.findIndex((item) => item.slug === lesson);

  if (index === -1) return {};

  return { previous: lessons[index - 1], next: lessons[index + 1] };
}
