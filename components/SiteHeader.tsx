"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteSearch } from "@/components/SiteSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SearchEntry } from "@/lib/content";

type SiteHeaderProps = {
  searchIndex: SearchEntry[];
};

export function SiteHeader({ searchIndex }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="header" data-scrolled={scrolled}>
      <Link className="wordmark" href="/" aria-label="pyflow, home">
        pyflow<span className="wordmark__dot" aria-hidden="true" />
      </Link>
      <div className="header__tools">
        <SiteSearch entries={searchIndex} />
        <ThemeToggle />
      </div>
    </header>
  );
}
