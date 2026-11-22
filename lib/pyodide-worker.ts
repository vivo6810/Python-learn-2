/**
 * Web Worker that hosts Pyodide (CPython → WASM) off the main thread, so a
 * learner's `while True: pass` cannot freeze the page. The runtime is loaded
 * from the pinned CDN on the first run and kept alive for later runs; the
 * main thread can terminate this worker mid-run and spawn a fresh one.
 *
 * Protocol (both directions):
 *   in : { type: "run", id, code }          start a run
 *   in : { type: "stdin-response", id, line } answer a pending input()
 *   out: { type: "stdout" | "stderr", id, text } streamed output chunks
 *   out: { type: "stdin-request", id }      a run wants one line of input()
 *   out: { type: "done", id, ok, error? }   run finished (or threw)
 *   out: { type: "fatal", id, message }     runtime could not start
 */

const PYODIDE_VERSION = "0.27.5";
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type PyodideLike = {
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  setStdin(options: { stdin: () => Promise<string> }): void;
  loadPackagesFromImports?(code: string): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
};

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  importScripts(...urls: string[]): void;
}

const scope = self as unknown as WorkerScope;

declare const loadPyodide: ((options: { indexURL: string }) => Promise<PyodideLike>) | undefined;

let pyodidePromise: Promise<PyodideLike> | null = null;
let pendingStdin: ((line: string) => void) | null = null;

function getPyodide(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      scope.importScripts(`${CDN_BASE}pyodide.js`);
      if (typeof loadPyodide !== "function") {
        throw new Error("The Python runtime failed to start.");
      }
      return loadPyodide({ indexURL: CDN_BASE });
    })();
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

scope.onmessage = async (event: MessageEvent) => {
  const msg = event.data as
    | { type: "run"; id: number; code: string }
    | { type: "stdin-response"; id: number; line: string };

  if (msg.type === "stdin-response") {
    const pending = pendingStdin;
    pendingStdin = null;
    pending?.(msg.line);
    return;
  }

  const { id, code } = msg;
  try {
    const pyodide = await getPyodide();

    pyodide.setStdout({ batched: (text) => scope.postMessage({ type: "stdout", id, text }) });
    pyodide.setStderr({ batched: (text) => scope.postMessage({ type: "stderr", id, text }) });
    pyodide.setStdin({
      stdin: () =>
        new Promise<string>((resolve) => {
          pendingStdin = resolve;
          scope.postMessage({ type: "stdin-request", id });
        }),
    });

    // Pre-download wheels matching the program's imports (numpy and friends)
    // so lesson examples using third-party packages work. Stdlib imports cost
    // nothing; a failure here is reported but the run is still attempted, so a
    // real ImportError is what surfaces.
    if (typeof pyodide.loadPackagesFromImports === "function") {
      try {
        await pyodide.loadPackagesFromImports(code);
      } catch (error) {
        scope.postMessage({
          type: "stderr",
          id,
          text: `note: could not preload packages (${errorMessage(error)})\n`,
        });
      }
    }

    await pyodide.runPythonAsync(code);
    scope.postMessage({ type: "done", id, ok: true });
  } catch (error) {
    if (!pyodidePromise) {
      scope.postMessage({ type: "fatal", id, message: errorMessage(error) });
    } else {
      scope.postMessage({ type: "done", id, ok: false, error: errorMessage(error) });
    }
  }
};
