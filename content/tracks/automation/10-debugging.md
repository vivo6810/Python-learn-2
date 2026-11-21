---
title: Debugging
---

Programs fail. The useful skill is not avoiding failure but reading it: the error message tells you what went wrong, the traceback tells you where, and a few disciplined habits tell you why.

Debugging is a loop: observe, form one hypothesis, test it, repeat. The tools in this chapter shorten each trip around that loop.

## Reading a traceback

```plaintext
Traceback (most recent call last):
  File "report.py", line 12, in <module>
    total = add(items)
  File "report.py", line 6, in add
    return sum(values) / len(values)
ZeroDivisionError: division by zero
```

Read it from the bottom up. The last line is the exception type and message. The frame above it is where it was raised. Above that is the call that led there. The line numbers are exact, and the code shown is the line as Python saw it.

Common exceptions are specific and worth recognising: `NameError` for a name that does not exist, `TypeError` for the wrong kind of value, `KeyError` for a missing dictionary key, `IndexError` for a position past the end, `AttributeError` for a method that type does not have.

Three more deserve names. `ValueError` is the right type but an impossible value — `int("abc")`. `FileNotFoundError` is a path problem, almost always the working directory. `ModuleNotFoundError` means the package is not installed in the interpreter that is running the script, which is not always the one you installed it into.

The "most recent call last" line is not decoration. In a deep stack, the top of the trace is the entry point and the bottom is the crime scene; read backwards and stop at the first frame that is yours.

## Printing is a technique

The oldest debugger is a print statement, and it is still the fastest for small problems. Print the value just before the line that fails, and the contradiction usually becomes obvious.

```python
items = [3, 0, 4]

print("items:", items)
print("length:", len(items), "sum:", sum(items))

print(sum(items) / len(items))
```

Print types as well as values when the output looks impossible. `type(x)` turns `'3'` versus `3` from a mystery into a fact.

Print the repr, not the string, when whitespace might be involved: `print(repr(line))` shows `'total: 3 \n'` where `print(line)` shows nothing suspicious.

When a loop misbehaves, print the iteration number and the state at the top of the body, not at the bottom. The first wrong pass is the one that matters, and by the bottom it may already have been overwritten.

## Raising your own errors

When a function receives something it cannot work with, fail immediately with a clear message rather than returning a wrong answer that breaks something later.

```python
def average(values):
    if not values:
        raise ValueError("average() needs at least one value")
    return sum(values) / len(values)
```

The message should say what was expected and what arrived. `raise ValueError(f"expected a list of numbers, got {values!r}")` saves the next person — often you, next month — a trip through the source.

Re-raising keeps the original traceback:

```python
try:
    config = load("settings.json")
except OSError as error:
    raise RuntimeError("could not load configuration") from error
```

The `from error` line chains the two exceptions, and Python prints both, which is far more useful than a fresh error with no history.

## Asserts

`assert` states an assumption during development. It is a debugging tool, not input validation: `python -O` removes asserts entirely.

```python
assert len(rows) > 0, "no rows were parsed"
```

Use it for things that should be impossible if the code above is correct, and never for checking user input — under `-O` the check disappears and the bad value flows on. The second expression is the message and is only evaluated when the assertion fails, which is why it can be an expensive f-string without cost in the passing case.

## Handling errors

`try` runs code that might fail. `except` handles a specific exception. `else` runs when no exception occurred, and `finally` always runs.

```python
def read_count(path):
    try:
        with open(path, encoding="utf-8") as file:
            return int(file.read().strip())
    except FileNotFoundError:
        return 0
    except ValueError:
        print(f"{path} did not contain a number")
        return 0
    finally:
        print("finished", path)
```

Catch the narrowest exception you can. A bare `except:` also catches `KeyboardInterrupt` and typos inside your own function, which turns a clear crash into silent wrong behaviour.

Order matters: the first matching `except` wins, so put `FileNotFoundError` before `OSError`, and `ValueError` before `Exception`. A bare `except Exception as error` at the top level of a script is reasonable — it logs and exits — but inside a function it hides bugs.

`else` is worth knowing even if it is rare: code there runs only when the `try` block finished without raising, so it is the place for the follow-up that should not be protected by the same handlers.

## Logging

When a program runs unattended, printing to the screen is not enough. `logging` adds timestamps, levels, and a destination you can change without touching the calls.

```python
import logging

logging.basicConfig(
    filename="run.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logging.info("starting")
logging.warning("three rows were skipped")
logging.error("could not reach the server")
```

Use `debug` for detail you will not want in production, `info` for milestones, `warning` for recoverable surprises, and `error` for failures.

The level is a threshold, not a filter you apply by hand: setting `level=logging.WARNING` hides every `info` and `debug` call without editing them. `logging.debug` in a hot loop then costs almost nothing.

A file grows forever. `RotatingFileHandler` keeps a few files of a fixed size:

```python
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler("run.log", maxBytes=1_000_000, backupCount=3)
logging.basicConfig(handlers=[handler], level=logging.INFO)
```

`logging.exception("...")` inside an `except` block logs the message and the full traceback, which is exactly what you want at the point of failure:

```python
try:
    risky()
except Exception:
    logging.exception("risky() failed")
    raise
```

## A debugger

`breakpoint()` drops you into `pdb` at that line. The program stops, and you can look around instead of guessing.

```python
def total(rows):
    breakpoint()
    return sum(row["amount"] for row in rows)
```

The commands worth memorising: `n` for next line, `s` to step into a call, `c` to continue, `p expression` to print, `l` to list the surrounding code, `q` to quit. `w` shows the call stack, which is how you find out who called the function with the wrong value.

In an editor, the same thing is a click: a breakpoint in the gutter, a variables pane, a watch expression. The advantage over printing is that you can inspect anything without editing the file — and then remove the breakpoint instead of hunting for stray `print` calls.

## When it still makes no sense

Explain the code out loud, line by line, to an imaginary colleague. The bug is usually found in the sentence where you say "and then it obviously..." and it is not obvious.

Then reduce it. Delete half the script; if the bug remains, delete half of what is left. A twenty-line reproduction is a question someone can answer; four hundred lines is a request for a volunteer.

Finally, read the error message properly. `TypeError: unsupported operand type(s) for +: 'int' and 'str'` names the operation, both types, and the line. Most bugs are described accurately by the message and ignored by the reader.

## Logging that survives a crash

A `print` disappears when the terminal closes. Logging writes where you can find it later, with a timestamp and a level that says how much attention the line deserves.

```python
import logging

logging.basicConfig(
    filename="job.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logging.info("started with %s files", count)
logging.warning("skipping %s", path)
```

`basicConfig` configures the root logger once. If a handler already exists, the call does nothing — which is why a log file set up twice in one program seems to be ignored.

Use the levels as a filter, not as decoration. `debug` is for values you need while developing, `info` for the milestones a normal run should record, `warning` for something survived, `error` for a failure that was handled, and `exception` inside an `except` block. Set the level with an environment variable so the same code runs quiet in production and loud on your machine:

```python
import os

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
```

Lazy formatting matters: `logging.info("item %s", item)` builds the message only if the line will be written. `logging.info(f"item {item}")` builds the string every time, including when the level would have discarded it.

The most useful call is the one that records a traceback:

```python
try:
    process(path)
except Exception:
    logging.exception("failed on %s", path)
    raise
```

`exception` logs at `error` level and appends the current traceback. Without it, a log file says a failure happened and nothing about where. The bare `raise` re-raises the same exception, so the crash still happens and the log still explains it.

A job that runs for days needs a size limit, or the log becomes the disk problem:

```python
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler("job.log", maxBytes=1_000_000, backupCount=3)
```

Three files of a megabyte each, oldest dropped. For long-term records, `TimedRotatingFileHandler` rotates on a schedule instead — midnight, usually.

## Finding the slow line

Guessing where a program spends its time is reliably wrong. Measure instead; two tools cover almost everything.

For one suspicious operation, `time.perf_counter()` is a stopwatch with the highest resolution available:

```python
from time import perf_counter

start = perf_counter()
rows = [parse(line) for line in lines]
print(f"parsed {len(rows)} rows in {perf_counter() - start:.3f}s")
```

Use `perf_counter` for durations and `time.time` for wall-clock timestamps; the first is monotonic and immune to the system clock changing under you.

To compare two implementations, `timeit` runs each many times and reports the best:

```python
import timeit

print(timeit.timeit("'-'.join(words)", setup="words = ['a'] * 1000", number=1000))
```

Small differences in a micro-benchmark rarely survive contact with real data. Measure the real job on real input before rewriting anything.

For a whole program, `cProfile` records every call and how long it took:

```python
import cProfile

cProfile.run("main()", sort="cumulative")
```

Read `cumtime` first: it is the total time spent in a function including what it called, so the biggest number near the top is usually the real cost. `tottime` excludes callees and finds a function that is itself slow. A function called a million times with a tiny `tottime` is still a target — the fix there is usually to call it once per batch instead of once per item.

The most common result of profiling is that the program is waiting, not computing: a network call inside a loop, a file opened and closed repeatedly, a database query per row. No amount of rewriting the inner arithmetic fixes a round trip. Move the I/O out of the loop and the numbers change by an order of magnitude.

## Doubts worth settling

**Where do I start with a traceback?** At the bottom. The last line names the error and often the
cause; the line above it is the exact statement that failed, and the frames above that are the path
that got you there. Read upward only as far as your own code.

**What is the difference between an exception and a bug?** An exception is Python telling you
something failed in a defined way — you can catch it. A bug is your program doing something wrong
happily. Catching an exception you do not understand hides bugs; print it first, decide later.

**Why does the error appear somewhere else?** Because a value went bad earlier and only crashed at
use. Print or assert the value where it is created, then follow it. Assertions document what must
be true: `assert len(rows) > 0, "no rows parsed"`.

**What does `breakpoint()` do?** It drops you into `pdb` at that line: `p` prints a value, `n` runs
the next line, `s` steps into a call, `c` continues. It is faster than ten prints and leaves nothing
behind when you delete the line.

**Do I need `try` around everything?** No. Let errors surface while developing; catch them where
you can actually do something — retry, use a default, report to the user. A bare `except:` that
swallows everything is how a silent failure becomes a mystery.

**Why is my log empty?** Because the script wrote to stderr, or because buffering held the output.
Check both streams, and flush when the process may be killed: `print(..., flush=True)`.

## A slow read of one script

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
rows = []
for number, line in enumerate(open("data.csv", encoding="utf-8"), start=1):
    parts = line.strip().split(",")
    if len(parts) != 3:
        logging.warning("line %s has %s fields", number, len(parts))
        continue
    rows.append(parts)
logging.info("kept %s rows", len(rows))
```

Logging replaces scattered prints with levels you can switch off. The warning names the line number
and the count, which is what you need when a file misbehaves at row 4,102. Skipping the bad row and
continuing is a policy decision; collecting them into a list of problems is the better one when the
report matters. Logging with `%s` and arguments rather than an f-string keeps formatting deferred
and the output cheap when the level is disabled.

## Try it

- Break a working script on purpose in three different ways and read each traceback aloud before fixing it.
- Add validation to a function that divides, raising `ValueError` for a zero divisor.
- Replace every `print()` in a script with `logging.info()` and send the output to a file.
- Set a `breakpoint()` in a loop, step through three iterations, and print a variable at each.
- Catch `OSError` around a file read, log the exception with `logging.exception`, and re-raise.
