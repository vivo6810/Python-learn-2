"use client";

import { useCallback, useRef, useState } from "react";
import { runPython } from "@/lib/pyodide";

export type PythonRunnerProps = {
  /** Code shown on first render; Reset restores it. */
  initialCode: string;
  /** `example` renders inside a chapter's code figure; `playground` fills its page. */
  variant?: "example" | "playground";
  /** Suggested filename for the downloaded .py file. */
  fileName?: string;
};

type Output = { stdout: string; stderr: string; ok: boolean } | null;

/**
 * A small, self-contained Python work environment: an editable program, a run
 * button, captured stdout/stderr, and .py import/export. The Python runtime is
 * downloaded on the first run, never on page load.
 */
export function PythonRunner({ initialCode, variant = "example", fileName = "example.py" }: PythonRunnerProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<Output>(null);
  const [running, setRunning] = useState(false);
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLoadingRuntime(true);
    setOutput(null);
    try {
      const result = await runPython(code);
      setOutput(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput({ stdout: "", stderr: message, ok: false });
    } finally {
      setRunning(false);
      setLoadingRuntime(false);
    }
  }, [code, running]);

  const reset = useCallback(() => {
    setCode(initialCode);
    setOutput(null);
  }, [initialCode]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the code stays selectable in the textarea.
    }
  }, [code]);

  const download = useCallback(() => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [code, fileName]);

  const upload = useCallback((file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCode(reader.result);
        setOutput(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    },
    [run],
  );

  const isExample = variant === "example";

  return (
    <div className={`pyrunner${isExample ? " pyrunner--example" : ""}`}>
      <div className="pyrunner__toolbar">
        <span className="pyrunner__lang">python</span>
        <div className="pyrunner__actions">
          <button type="button" className="pyrunner__btn pyrunner__btn--primary" onClick={() => void run()} disabled={running}>
            {running ? "Running…" : "Run"}
          </button>
          <button type="button" className="pyrunner__btn" onClick={reset} title="Restore the original example">
            Reset
          </button>
          <button type="button" className="pyrunner__btn" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="pyrunner__btn" onClick={download} title="Download as a .py file">
            Download
          </button>
          <button
            type="button"
            className="pyrunner__btn"
            onClick={() => fileInputRef.current?.click()}
            title="Open a .py file from your computer"
          >
            Open…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.txt,text/plain"
            className="pyrunner__file"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </div>
      </div>

      <textarea
        className="pyrunner__editor"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Python code"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        rows={isExample ? Math.min(28, Math.max(6, code.split("\n").length + 1)) : 18}
      />

      <div className="pyrunner__panel" aria-live="polite">
        {running ? (
          <p className="pyrunner__status">{loadingRuntime ? "starting python… first run downloads the runtime" : "running…"}</p>
        ) : output === null ? (
          <p className="pyrunner__status">Run the code to see its output here. Ctrl+Enter works too.</p>
        ) : (
          <>
            {output.stdout ? <pre className="pyrunner__out">{output.stdout}</pre> : null}
            {output.stderr ? (
              <pre className={`pyrunner__err${output.ok ? "" : " pyrunner__err--crash"}`}>{output.stderr}</pre>
            ) : null}
            {!output.stdout && !output.stderr ? <p className="pyrunner__status">done — nothing printed</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
