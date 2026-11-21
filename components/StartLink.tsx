"use client";

import Link from "next/link";
import { useProgress } from "@/components/useProgress";

type StartLinkProps = {
  /** The course's first lesson, used when nothing has been opened yet. */
  first: { track: string; slug: string };
};

/** Resumes the last opened chapter; falls back to the first one. */
export function StartLink({ first }: StartLinkProps) {
  const { last } = useProgress();
  const [track, slug] = last ? last.split("/") : [];
  const href = track && slug ? `/lessons/${track}/${slug}` : `/lessons/${first.track}/${first.slug}`;

  return (
    <Link className="btn" href={href}>
      <span>Start</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </Link>
  );
}
