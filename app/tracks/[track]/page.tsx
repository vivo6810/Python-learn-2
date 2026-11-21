import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonList } from "@/components/LessonList";
import { getTrack, getTracks } from "@/lib/content";

type TrackPageProps = {
  params: Promise<{ track: string }>;
};

/** Every part is generated at build time; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getTracks().map((track) => ({ track: track.slug }));
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { track: slug } = await params;
  const track = getTrack(slug);
  return track ? { title: track.title } : {};
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { track: slug } = await params;
  const track = getTrack(slug);

  if (!track) notFound();

  return (
    <>
      <div className="shell intro">
        <p className="intro__kicker">Part {track.part}</p>
        <h1 className="intro__title">{track.title}</h1>
      </div>

      <div className="shell track-page">
        <LessonList track={track.slug} lessons={track.lessons} />
      </div>
    </>
  );
}
