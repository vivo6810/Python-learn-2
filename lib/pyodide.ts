/**
 * Client-side Python execution via Pyodide (CPython compiled to WebAssembly),
 * hosted in a Web Worker so synchronous Python cannot freeze the page. The
 * worker fetches the pinned runtime from the CDN on first use and is cached;
 * code never leaves the user's machine. If a run hangs, call `stopPython()` —
 * the worker is terminated and a fresh one is spawned on the next run, without
 * reloading the page or touching the editor.
 */

export type RunResult = {
  /** Everything the program wrote to stdout, newline-terminated per write. */
  stdout: string;
  /** Everything the program wrote to stderr, with the exception message appended on failure. */
  stderr: string;
  /** False when the run raised (or was stopped); true otherwise. */
  ok: boolean;
};

type WorkerOutMessage =
  | { type: "stdout" | "stderr"; id: number; text: string }
  | { type: "stdin-request"; id: number }
  | { type: "done"; id: number; ok: boolean; error?: string }
  | { type: "fatal"; id: number; message: string };

const APPEND = (existing: string, text: string) =>
  existing + (text.endsWith("\n") ? text : `${text}\n`);

let worker: Worker | null = null;
let runId = 0;
let queue: Promise<void> = Promise.resolve();
let activeStop: (() => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./pyodide-worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

/**
 * Terminate the running worker (if any) and drop it; the next run spawns a
 * fresh one. Returns true when a run was actually stopped. The editor is
 * untouched — only the run is cut short.
 */
export function stopPython(): boolean {
  const active = activeStop;
  if (!worker && !active) return false;
  const current = worker;
  worker = null;
  current?.terminate();
  active?.();
  return true;
}

async function doRun(code: string): Promise<RunResult> {
  const id = ++runId;
  const w = getWorker();

  return new Promise<RunResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (result: RunResult) => {
      if (settled) return;
      settled = true;
      w.removeEventListener("message", onMessage);
      activeStop = null;
      resolve(result);
    };

    const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      if (!msg || msg.id !== id) return;

      switch (msg.type) {
        case "stdout":
          stdout = APPEND(stdout, msg.text);
          break;
        case "stderr":
          stderr = APPEND(stderr, msg.text);
          break;
        case "stdin-request": {
          // The prompt stays on the main thread (workers cannot show one);
          // cancelling yields an empty line.
          const line = window.prompt("Program input:") ?? "";
          w.postMessage({ type: "stdin-response", id, line });
          break;
        }
        case "fatal":
          settle({ stdout, stderr: msg.message, ok: false });
          break;
        case "done": {
          if (msg.ok) {
            settle({ stdout, stderr, ok: true });
          } else {
            // Keep whatever was written to stderr, then append the exception —
            // a program that warns on stderr and then raises shows both.
            const exception = msg.error ?? "Unknown error";
            const combined = stderr
              ? `${stderr.endsWith("\n") ? stderr : `${stderr}\n`}${exception}`
              : exception;
            settle({ stdout, stderr: combined, ok: false });
          }
          break;
        }
      }
    };

    w.addEventListener("message", onMessage);

    activeStop = () => {
      const stopped = stderr
        ? `${stderr.endsWith("\n") ? stderr : `${stderr}\n`}Stopped before it finished.`
        : "Stopped before it finished.";
      settle({ stdout, stderr: stopped, ok: false });
    };

    w.postMessage({ type: "run", id, code });
  });
}

/**
 * Browser entry point for the runner components. Runs are serialized through a
 * shared queue so overlapping runs cannot replace one another's stream
 * callbacks — each run gets exactly its own stdout/stderr/stdin.
 */
export function runPython(code: string): Promise<RunResult> {
  const run = queue.then(() => doRun(code));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
