import Link from "next/link";
import { FluidCanvas } from "@/components/FluidCanvas";
import { Reveal } from "@/components/Reveal";
import { StartLink } from "@/components/StartLink";
import { TrackCard } from "@/components/TrackCard";
import { getTracks } from "@/lib/content";

export default function HomePage() {
  const tracks = getTracks();
  const topics = tracks.flatMap((track) => track.lessons.map((lesson) => lesson.title));
  const first = tracks[0]?.lessons[0];

  return (
    <>
      <section className="hero">
        <FluidCanvas />
        <h1 className="hero__title">
          <span className="hero__line hero__line--one">
            <span>learn</span>
          </span>
          <span className="hero__line hero__line--two">
            <span>
              python<em>.</em>
            </span>
          </span>
        </h1>
        <div className="hero__foot">
          {first ? <StartLink first={{ track: first.track, slug: first.slug }} /> : null}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div className="marquee__group" key={copy}>
              {topics.map((topic) => (
                <span key={`${copy}-${topic}`}>{topic}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="section shell">
        <Reveal className="section__head">
          <h2 className="section__title">Parts</h2>
          <span className="section__count">{String(tracks.length).padStart(2, "0")}</span>
        </Reveal>

        <div className="tracks">
          {tracks.map((track, index) => (
            <TrackCard
              key={track.slug}
              slug={track.slug}
              title={track.title}
              part={track.part}
              chapters={track.lessons.length}
              lessonSlugs={track.lessons.map((lesson) => lesson.slug)}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="section shell">
        <Reveal>
          <Link className="cta" href={first ? `/lessons/${first.track}/${first.slug}` : "/"}>
            <span>Write your first line</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 19 19 5M8 5h11v11" />
            </svg>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
