"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchEntry } from "@/lib/content";

type SiteSearchProps = {
  entries: SearchEntry[];
};

const MAX_RESULTS = 8;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokensOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Higher score ranks first; -1 means the chapter cannot match every word. */
function score(entry: SearchEntry, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const headings = entry.headings.join(" ").toLowerCase();
  const description = entry.description.toLowerCase();
  let total = 0;

  for (const token of tokens) {
    if (title.split(/\s+/).some((word) => word.startsWith(token))) total += 6;
    else if (title.includes(token)) total += 4;
    else if (headings.includes(token)) total += 2;
    else if (description.includes(token)) total += 1;
    else return -1;
  }

  return total;
}

function highlight(text: string, tokens: string[]) {
  if (!tokens.length) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");

  return text
    .split(pattern)
    .map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : part));
}

export function SiteSearch({ entries }: SiteSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const tokens = useMemo(() => tokensOf(query), [query]);

  const results = useMemo(() => {
    if (!tokens.length) return [];

    return entries
      .map((entry) => ({ entry, rank: score(entry, tokens) }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.entry.chapter - b.entry.chapter)
      .slice(0, MAX_RESULTS)
      .map((item) => item.entry);
  }, [entries, tokens]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const visible = open && tokens.length > 0;

  return (
    <div className="search" ref={ref}>
      <label className="search__form" htmlFor="course-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id="course-search"
          className="search__input"
          type="search"
          placeholder="Search"
          aria-label="Search the course"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setOpen(false);
              event.currentTarget.blur();
            }
          }}
        />
      </label>

      {visible ? (
        <div className="search__panel" role="listbox" aria-label="Chapters">
          {results.length ? (
            results.map((entry) => (
              <Link
                key={`${entry.track}/${entry.slug}`}
                className="search__hit"
                href={`/lessons/${entry.track}/${entry.slug}`}
                onClick={() => setOpen(false)}
              >
                <span className="search__hit-num">{String(entry.chapter).padStart(2, "0")}</span>
                <span className="search__hit-body">
                  <span className="search__hit-title">{highlight(entry.title, tokens)}</span>
                  <span className="search__hit-desc">{highlight(entry.description, tokens)}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="search__empty">No chapters</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
