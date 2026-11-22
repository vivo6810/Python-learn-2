/**
 * Client-side Python execution via Pyodide (CPython compiled to WebAssembly).
 * Runs entirely in the browser — no server, no accounts, no upload of the code.
 * The runtime is fetched from the pinned CDN version on first use and cached
 * by the browser for subsequent runs.
 */

const PYODIDE_VERSION = "0.27.5";
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type PyodideLike = {
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  setStdin(options: { stdin: () => string }): void;
  runPythonAsync(code: string): Promise<unknown>;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideLike>;
  }
}

let pyodidePromise: Promise<PyodideLike> | null = null;

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the Python runtime. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

/** Lazily downloads and starts the Python runtime; subsequent calls reuse it. */
export function getPyodide(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      if (!window.loadPyodide) {
        await loadScript(`${CDN_BASE}pyodide.js`);
      }
      const load = window.loadPyodide;
      if (!load) throw new Error("The Python runtime failed to start.");
      return load({ indexURL: CDN_BASE });
    })();
    // If the first attempt fails, allow a retry instead of caching the failure forever.
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

export type RunResult = {
  /** Everything the program wrote to stdout, newline-terminated per write. */
  stdout: string;
  /** Everything the program wrote to stderr, or the exception text on failure. */
  stderr: string;
  ok: boolean;
};

/**
 * Runs `code` in the given runtime instance and captures output. `input()` is
 * served by a browser prompt, which keeps the examples that read from stdin
 * usable; cancelling the prompt yields an empty line.
 */
export async function executePython(
  pyodide: PyodideLike,
  code: string,
  stdin: () => string,
): Promise<RunResult> {
  let stdout = "";
  let stderr = "";

  pyodide.setStdout({
    batched: (text) => {
      stdout += text.endsWith("\n") ? text : `${text}\n`;
    },
  });
  pyodide.setStderr({
    batched: (text) => {
      stderr += text.endsWith("\n") ? text : `${text}\n`;
    },
  });
  pyodide.setStdin({ stdin });

  try {
    await pyodide.runPythonAsync(code);
    return { stdout, stderr, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { stdout, stderr: stderr || message, ok: false };
  }
}

/** Browser entry point for the runner components. */
export async function runPython(code: string): Promise<RunResult> {
  const pyodide = await getPyodide();
  return executePython(pyodide, code, () => window.prompt("Program input:") ?? "");
}
