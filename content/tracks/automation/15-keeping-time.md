---
title: Keeping Time, Scheduling Tasks, and Launching Programs
---

A computer will happily wait. Timing turns that patience into something useful: a program that runs at 3am, a reminder that fires in ten minutes, a backup script a scheduler starts every night.

Three tools cover almost all of it. `time` measures and pauses, `datetime` does calendar arithmetic, and either `threading` or the operating system starts work later.

## Clocks

`time.time()` is a float counting seconds since the epoch — 1 January 1970, UTC. It is the number to store and compare, because it never needs a time zone or a month name.

```python
import time

now = time.time()
print(now)                 # 1789000000.4213
print(round(now, 2))       # 1789000000.42
```

`round()` is there because the raw float carries more precision than any display needs, and because a timestamp with seven decimals is hard to read in a log.

The epoch number is useful for arithmetic and useless for humans. `time.time() - start` gives you a duration in seconds; `strftime` turns an instant into a date. Keep the two uses separate and time zones stop being frightening.

`time.sleep()` pauses the program, and nothing else runs during that pause. Two seconds is literal, not approximate.

```python
import time

for i in range(3, 0, -1):
    print(i)
    time.sleep(1)

print("Liftoff")
```

`sleep` accepts a float, so `time.sleep(0.5)` is legal. It blocks the whole process: no other code in that program runs, which is exactly what you want in a countdown and exactly what you do not want in a window that must stay responsive.

## Dates as objects

`datetime` turns the float into something you can reason about: year, month, day, hour, minute, second, microsecond. Construct one, compare two, add a span.

```python
import datetime

start = datetime.datetime(2026, 11, 21, 14, 30)
print(start.year, start.hour)

later = start + datetime.timedelta(days=1000)
print(later)                        # 2029-08-17 14:30:00
print(later - start)                # 1000 days, 0:00:00
```

The constructor takes them in order — year, month, day, hour, minute, second, microsecond — and an out-of-range value such as month 13 raises `ValueError` immediately. That is a feature: a typo fails at the line that caused it.

`datetime.datetime.now()` reads the system clock as local time. `datetime.datetime.today()` does nearly the same thing and returns the same type; `now()` is the conventional call. For the current instant in UTC, pass the zone explicitly:

```python
import datetime

print(datetime.datetime.now(datetime.UTC))   # 2026-11-21 19:30:07.441+00:00
```

Datetimes are naive unless you attach a zone. Naive objects have no `tzinfo`, so Python assumes they are all in the same unnamed zone and compares them happily — even when one came from a server in another country. For scripts that run on one machine and compare against that machine's clock, naive local time is fine. For anything that crosses a server boundary, use aware datetimes and convert at the edges.

## Timedeltas

`timedelta` accepts days, seconds, microseconds, milliseconds, minutes, hours, and weeks. Differences between two datetimes give you one back, which is how you measure how long something took:

```python
started = datetime.datetime.now()
time.sleep(1.5)
elapsed = datetime.datetime.now() - started
print(elapsed.total_seconds())
```

`total_seconds()` is the number to log; the timedelta itself prints as `0:00:01.500421`, which is readable but awkward to compare. You can also build a timedelta from several units at once — `timedelta(days=1, hours=6)` — and Python normalises the result.

Arithmetic with timedeltas is calendar-aware for days but not for months or years: a month has no fixed length, so `timedelta(months=1)` does not exist. For "one month from now", compute the month yourself or use `dateutil.relativedelta`. Adding a day across a daylight-saving boundary gives 23 or 25 hours of real time, which is correct for a calendar and surprising for a stopwatch.

## Formatting and parsing

Formatting is a language of percent codes. `strftime` writes a datetime out; `strptime` reads one back.

```python
stamp = datetime.datetime.now()
print(stamp.strftime("%Y-%m-%d %H:%M:%S"))   # 2026-11-21 14:30:07
print(stamp.strftime("%A, %d %B"))           # Saturday, 21 November

parsed = datetime.datetime.strptime("2026-11-21", "%Y-%m-%d")
print(type(parsed))                           # <class 'datetime.datetime'>
```

The codes worth memorising:

| Code | Meaning | Example |
| --- | --- | --- |
| `%Y` | four-digit year | 2026 |
| `%m` | month, zero-padded | 11 |
| `%d` | day of the month | 21 |
| `%H` | hour, 24-hour clock | 14 |
| `%M` | minute | 30 |
| `%S` | second | 07 |
| `%A` | weekday name | Saturday |
| `%B` | month name | November |
| `%p` | AM or PM | PM |
| `%f` | microseconds | 441233 |

`strptime` needs the format to match the string exactly, including separators. `"21/11/2026"` parsed with `"%Y-%m-%d"` raises `ValueError`. That strictness is useful: it is how you validate a date typed into a form. Catch the error and ask again.

For filenames, `%Y-%m-%d` sorts correctly as text, which is the main reason to prefer it over `%d-%m-%Y`. A folder of `2026-11-21.log` files lists in chronological order; a folder of `21-11-2026.log` files does not.

## Timers and threads

A program stops at `sleep`, which is no good for a reminder you want while other work continues. A timer runs a function later, in the background:

```python
import threading

def remind():
    print("Stand up and stretch.")

timer = threading.Timer(5, remind)
timer.start()

print("The rest of the program keeps running.")
```

`Timer(interval, function)` waits, then calls. Extra positional arguments and keywords are passed through: `threading.Timer(5, remind, args=("water",), kwargs={"loud": True})`.

Without something keeping the program alive, it exits before the timer fires. A loop with `try`/`except KeyboardInterrupt` holds the process open and lets you stop it cleanly:

```python
timer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    timer.cancel()
    print("Stopped.")
```

`cancel()` stops a timer that has not fired yet; calling it after the function ran does nothing. Timer threads are non-daemon by default, so Python waits for them at exit — a timer set for an hour keeps a script alive for an hour even after `main` returns. `timer.daemon = True` changes that, at the cost of the reminder vanishing when the main program ends.

Threads are the same mechanism for longer work: `threading.Thread(target=function).start()` and the rest of the program carries on.

```python
import threading
import time

def download(name, seconds):
    print("start", name)
    time.sleep(seconds)
    print("done", name)

workers = [
    threading.Thread(target=download, args=("report", 2)),
    threading.Thread(target=download, args=("chart", 1)),
]

for worker in workers:
    worker.start()

for worker in workers:
    worker.join()

print("all finished")
```

`join()` waits for a thread to finish. Without it, `"all finished"` may print before the downloads do. Keep threads to independent, fire-and-forget tasks; sharing data between them needs locks, and a queue is usually a better design than a lock.

## Starting other programs

`subprocess.Popen` launches a program and returns immediately, leaving it running alongside yours. The first argument is a list of the program and its arguments.

```python
import subprocess

subprocess.Popen(["C:\\Windows\\System32\\calc.exe"])
subprocess.Popen(["/usr/bin/gedit", "notes.txt"])

subprocess.Popen("open -a TextEdit notes.txt", shell=True)
```

A string command only works with `shell=True`, and a shell re-interprets characters, so keep user input out of it. The list form is safer and portable. On Windows, a program that lives on the `PATH` can be named without its full path; `Popen(["notepad.exe"])` works because Windows searches for it.

`Popen` gives you a process object with a `pid`, and methods worth knowing:

```python
process = subprocess.Popen(["gedit", "notes.txt"])
print(process.pid)

process.wait(timeout=30)     # block until it exits
print(process.poll())        # None while running, exit code afterwards
process.terminate()          # ask it to stop
```

`wait()` blocks, which defeats the purpose of starting it in the background; `poll()` is the non-blocking check. For a command whose output you want, `subprocess.run([...], capture_output=True, text=True)` is simpler than `Popen` — it waits, and hands you `stdout` and `stderr` as strings.

`webbrowser` is the shortcut for URLs and files:

```python
import webbrowser

webbrowser.open("https://pypi.org")
webbrowser.open("file:///Users/me/report.html")
```

New browser tabs, one per call. For a folder of links, add `time.sleep(2)` between them or you will drown the machine. The same module has `open_new_tab()` and `open_new()`, which are more explicit than `open()` when you care whether an existing window is reused.

Opening a file with whatever application owns it — a PDF in a viewer, a spreadsheet in a spreadsheet program — is platform-specific:

```python
import os
import subprocess
import sys

def open_file(path):
    if sys.platform.startswith("win"):
        os.startfile(path)
    elif sys.platform == "darwin":
        subprocess.Popen(["open", path])
    else:
        subprocess.Popen(["xdg-open", path])
```

That three-way branch is the price of portability. Wrap it in a function once and the rest of your scripts stop caring which machine they are on.

## Scheduling for real

A timer belongs to a running process. A schedule belongs to the operating system: Task Scheduler on Windows, `cron` on macOS and Linux, or `systemd` timers. Write the script, make it runnable from the command line, then hand it to the scheduler with an absolute path to the interpreter and the script — schedulers start with a minimal environment and none of your shell's aliases.

A cron line is five fields and a command:

```plaintext
30 3 * * * /usr/bin/python3 /home/me/scripts/backup.py >> /home/me/backup.log 2>&1
```

That runs at 03:30 every day, appends both output streams to a log, and inherits almost no environment. If the script needs a variable, set it inside the script or in the crontab, not in your shell profile. On Windows, Task Scheduler's "Start a program" field wants the same absolute paths, and "Run whether user is logged on or not" is the setting that makes a nightly job actually nightly.

Always log. An unattended script that fails silently is worse than one that never ran, because you will assume it worked.

## Project: a stopwatch and a countdown

A stopwatch is two calls and a subtraction. A countdown is a loop around `sleep`. Put them in one script with `sys.argv` to choose.

```python
import sys
import time

mode = sys.argv[1] if len(sys.argv) > 1 else "stopwatch"

if mode == "stopwatch":
    input("Press Enter to start.")
    started = time.time()
    input("Press Enter to stop.")
    print(f"Elapsed: {time.time() - started:.2f} seconds")
else:
    minutes = float(sys.argv[2]) if len(sys.argv) > 2 else 1
    end = time.time() + minutes * 60
    while time.time() < end:
        left = int(end - time.time())
        print(f"\r{left // 60:02d}:{left % 60:02d}", end="", flush=True)
        time.sleep(1)
    print("\r00:00  time")
```

The `\r` returns the cursor to the start of the line, so the countdown rewrites itself instead of scrolling. `flush=True` forces the line out immediately. Both are small details that separate a toy from something you would actually leave running.

## Time zones

A naive datetime has no time zone. An aware one knows which zone it is in, and the difference is the source of most date bugs that survive testing.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

local = datetime.now(ZoneInfo("Europe/Oslo"))
utc = local.astimezone(ZoneInfo("UTC"))
print(local.isoformat())   # 2024-05-01T09:30:00+02:00
print(utc.isoformat())     # 2024-05-01T07:30:00+00:00
```

`isoformat()` writes the offset, which makes the value unambiguous to every program that reads it. A naive `2024-05-01T09:30:00` means nine-thirty somewhere, and whoever reads it will assume their own somewhere.

Store and compare in UTC; convert to a zone only for display.

```python
stamp = datetime.now(ZoneInfo("UTC"))
print(stamp.astimezone(ZoneInfo("America/New_York")))
```

Converting between zones is arithmetic, so it is reliable. Creating a local time is not: during the hour that repeats when daylight saving ends, `datetime(2024, 11, 3, 1, 30, tzinfo=ZoneInfo("America/New_York"))` is ambiguous, and Python picks the first occurrence unless `fold=1` says otherwise. During the hour that is skipped in spring, the time does not exist at all.

Adding to an aware datetime has the same trap. `stamp + timedelta(days=1)` adds twenty-four hours, which may be 23:30 or 00:30 by the local clock on a daylight-saving change. If "tomorrow at nine" is the requirement, build tomorrow's date and attach the time and zone, rather than adding a day to a timestamp.

`zoneinfo` ships with Python 3.9 and reads the system's time-zone database. On a stripped-down container that database may be missing; `tzdata` is the package that provides it. A `ZoneInfoNotFoundError` in production and not on your laptop is that missing package.

## Parsing dates from the wild

`strptime` needs the exact format. Exports rarely agree with each other, so a small list of formats tried in order is the pragmatic parser.

```python
from datetime import datetime

FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d %b %Y", "%Y-%m-%d %H:%M:%S"]

def parse_date(value):
    text = value.strip()
    for fmt in FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    raise ValueError(f"unrecognised date: {value!r}")
```

Order matters, and the list is evidence of a decision. `01/02/2024` is the first of February in most of the world and the second of January in the United States. If the data comes from one known source, keep only that source's format and reject everything else — a permissive parser that guesses will silently swap days and months for the ambiguous rows.

For genuinely mixed input, `dateutil.parser.parse` handles many shapes, including time-zone names and relative words in some modes:

```python
from dateutil.parser import parse

print(parse("Tue, 01 May 2024 09:30:00 +0200"))
```

It is a convenience, not an authority: it will also invent a date from `"2024"` and interpret `"01/02/2024"` by its own default. Validate the result against the original — check that the day and month you got back appear in the text — when the data matters.

Two habits prevent most of this. Accept ISO 8601 in anything you design, and store timestamps as ISO strings with an offset or as Unix seconds. Both sort correctly as text or numbers, both survive a trip through JSON, and neither needs a format string to be read back.

## Doubts worth settling

**Is `datetime.now()` timezone-aware?** No, it is naive: it holds a wall-clock reading with no
zone attached. `datetime.now(timezone.utc)` is aware. Mixing the two raises `TypeError` when you
subtract them, which is Python refusing to guess where you are.

**Why does subtracting two dates give a strange number?** Because a `timedelta` stores days,
seconds, and microseconds, not just days. Use `.total_seconds()` for a float, or `.days` when you
only care about whole days. `timedelta(days=1) * 3` is three days, and `str()` formats it for print.

**What is `strftime` versus `strptime`?** `f` is format: date to text. `p` is parse: text to date.
The memory aid is that `strftime` produces a string, `strptime` needs one. Both use the same `%`
codes, so a mistake in one usually shows up in the other.

**How do I stop `strptime` guessing the wrong day from `03/04/2026`?** You cannot — the format is
ambiguous. Parse with the format you know, and if input is human, try a list of formats in order and
reject what does not fit. Never let a silent guess reorder month and day.

**Do I need a library for time zones?** Python 3.9+ ships `zoneinfo`, which uses the system's time
zone data. For a fixed offset, `timezone(timedelta(hours=2))` is enough. For anything with daylight
saving rules, use a named zone such as `ZoneInfo("Europe/Oslo")` — an offset cannot know about
summer.

**Why do timestamps sort badly in files?** Human formats mix widths and month names. Store ISO 8601
— `2026-03-04T09:15:00+01:00` — and the text sorts chronologically as well as parses cleanly.

**Why does my stopwatch drift?** Because `time.sleep` only guarantees a minimum. Measure elapsed
time with `time.perf_counter()` and sleep the difference to the next target, rather than adding a
fixed delay each pass.

## A slow read of one script

```python
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

start = datetime(2026, 3, 4, 9, 15, tzinfo=ZoneInfo("Europe/Oslo"))
review = start + timedelta(days=30)
print(review.isoformat())
print((review - start).days, "days")
print(start.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
```

Attaching the zone at construction means every later operation knows what the clock meant. Adding
`timedelta(days=30)` is calendar arithmetic that keeps the local time of day, which is usually what
a deadline means. `isoformat()` is the format to store, because it keeps the offset. `astimezone`
converts the same instant for display without changing it, and the final `strftime` labels the zone
so nobody has to guess.

## Practice questions

- Why store an instant as `time.time()` rather than as a formatted string?
- What does `datetime.timedelta(hours=3) + datetime.datetime.now()` give you?
- Why does a program with only a `threading.Timer` sometimes exit before the timer fires?
- What is the difference between `wait()` and `poll()` on a process object?
- Why must a cron job use absolute paths, and where should its output go?
- Launch a text editor with a file, wait five seconds, then close it by process object.
- Write a countdown that plays one reminder every ten minutes for an hour.
