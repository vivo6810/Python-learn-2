"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PythonRunner } from "@/components/PythonRunner";

function decodeBase64(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Chapter pages render python code blocks as highlighted figures carrying the raw
 * source in `data-code-b64`. With JS available we swap those figures for live,
 * editable Python work environments; without JS the highlighted code remains.
 */
export function RunnableExamples({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scope = ref.current;
    if (!scope) return;

    const figures = Array.from(scope.querySelectorAll<HTMLElement>("figure.code--runnable[data-code-b64]"));
    const mounted: { figure: HTMLElement; originalHTML: string; root: Root }[] = [];

    figures.forEach((figure, index) => {
      const b64 = figure.dataset.codeB64;
      if (!b64) return;
      let code: string;
      try {
        code = decodeBase64(b64);
      } catch {
        return; // malformed figure — leave the static rendering alone
      }
      const originalHTML = figure.innerHTML;
      figure.replaceChildren();
      figure.classList.add("code--live");
      const root = createRoot(figure);
      root.render(<PythonRunner initialCode={code} variant="example" fileName={`example-${index + 1}.py`} />);
      mounted.push({ figure, originalHTML, root });
    });

    return () => {
      for (const { figure, originalHTML, root } of mounted) {
        root.unmount();
        figure.classList.remove("code--live");
        figure.innerHTML = originalHTML;
      }
    };
  }, []);

  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}
