---
title: Reading and Writing Files
---

Variables disappear when the program ends. Files do not. Once a script can read input from disk and write results back, it can work on data that is larger than one screen and keep what it produced.

Two ideas carry the chapter: a path names a file, and a file handle is a stream you read from or write to.

## Paths

A path is either relative to the current working directory or absolute from the root. `os.path.join()` builds paths that work on every platform, and `os.getcwd()` tells you where relative paths will start.

```python
import os

print(os.getcwd())

folder = os.path.join("data", "reports")
print(folder)  # data/reports on macOS and Linux, data\reports on Windows

print(os.path.exists(folder))
print(os.path.abspath("notes.txt"))
```

The current working directory is a property of the process, not of the script. Running `python3 tools/report.py` from your home folder makes relative paths resolve against your home folder, not against `tools/`. That is why scripts that work in the editor fail from a scheduler.

`os.makedirs(path, exist_ok=True)` creates a folder and every missing parent, and does nothing if it already exists.

```python
os.makedirs(os.path.join("data", "reports", "2026"), exist_ok=True)
```

The pieces of a path have names worth knowing:

```python
path = "/home/me/data/report.csv"

print(os.path.basename(path))   # report.csv
print(os.path.dirname(path))    # /home/me/data
print(os.path.splitext(path))   # ('/home/me/data/report', '.csv')
print(os.path.getsize(path))    # bytes
```

`split()` splits a path into folder and name; `splitext()` splits off only the extension. Neither touches the disk, so they work on paths that do not exist yet.

The `pathlib` module does the same work with objects, and is the modern preference:

```python
from pathlib import Path

data = Path("data") / "reports" / "report.csv"
print(data.name, data.suffix, data.parent)
print(data.exists(), data.stat().st_size if data.exists() else 0)
```

Both styles appear in real code. `os.path` is older and everywhere; `Path` is tidier with `/` and has `read_text()` and `write_text()` for one-liners.

## Opening a file

`open()` returns a file object. The mode decides what you can do with it: `"r"` reads, `"w"` writes and truncates, `"a"` appends, `"x"` creates and fails if the file exists, and adding `"b"` works in bytes.

```python
with open("notes.txt", "w", encoding="utf-8") as file:
    file.write("first line\n")
    file.write("second line\n")
```

Always use `with`. It closes the file even if an exception is raised inside the block, which `file.close()` does not guarantee.

Always pass `encoding="utf-8"` too. Python's default depends on the platform and locale, so the same script can read a file correctly on one machine and raise `UnicodeDecodeError` on another. Being explicit is one extra argument and removes the whole class of problem.

`"x"` is the safe way to create a file that must not overwrite an existing one:

```python
try:
    with open("report.txt", "x", encoding="utf-8") as file:
        file.write("new report\n")
except FileExistsError:
    print("already there")
```

## Reading

```python
with open("notes.txt", encoding="utf-8") as file:
    text = file.read()

print(text)

with open("notes.txt", encoding="utf-8") as file:
    for line in file:
        print(line.rstrip())
```

`read()` gives you the whole file as one string. Iterating gives you one line at a time, including its trailing newline, which is why `.rstrip()` appears so often. For a large file, iterate: `read()` loads all of it into memory.

`readlines()` returns a list of lines. `readline()` reads a single line and returns `""` at the end of the file.

```python
with open("notes.txt", encoding="utf-8") as file:
    first = file.readline()
    rest = file.readlines()

print(len(rest), "more lines")
```

`read(100)` reads 100 characters, not lines, which is how you preview a large file without loading it.

Newlines are a small trap. `"\n"` is not the only line ending you will meet; old files use `"\r\n"`. Opening in text mode translates them to `"\n"` for you, and `newline=""` turns that translation off when you need the exact bytes — which is exactly what the `csv` module wants.

## Writing without destroying

`"w"` erases the file before writing. That is correct for a report you regenerate, and catastrophic for a log. `"a"` appends instead:

```python
with open("run.log", "a", encoding="utf-8") as file:
    file.write("job finished\n")
```

`write()` returns the number of characters written and does not add a newline for you. `print(..., file=file)` does, which is often more convenient.

`writelines()` writes a list of strings and adds nothing between them, including no newlines. The name is misleading; it is a loop, not a formatter.

```python
lines = ["alpha\n", "beta\n"]
with open("letters.txt", "w", encoding="utf-8") as file:
    file.writelines(lines)
```

Binary files use `"rb"` and `"wb"`, and read and write `bytes`:

```python
with open("logo.png", "rb") as source:
    data = source.read()

with open("copy.png", "wb") as target:
    target.write(data)
```

A `bytes` object written in text mode raises `TypeError`, and a `str` written in binary mode does the same. That error is a useful signal that you opened the file in the wrong mode.

## Copying and moving

```python
import shutil

shutil.copy("notes.txt", "notes.backup.txt")
shutil.move("notes.backup.txt", os.path.join("data", "notes.txt"))
```

`copy()` keeps the original and duplicates the contents; `move()` takes the file away from its old location. Renaming is a move within the same folder.

`copy2()` also preserves timestamps and permissions, which matters for backups. `copytree()` copies a whole folder and fails if the destination exists unless you pass `dirs_exist_ok=True`.

## Shelves and pretty-printing

`shelve` stores Python objects in a file and reads them back by key, without you writing a serialisation format:

```python
import shelve

with shelve.open("state") as db:
    db["last_run"] = "2026-11-21"
    db["counts"] = {"errors": 2, "warnings": 14}

with shelve.open("state") as db:
    print(db["counts"]["errors"])
```

It is a dictionary on disk, good for a small cache or a script's memory between runs. It is not a database: no concurrent writers, no queries, and the file format is Python-specific. Deleting a key is `del db["last_run"]`; listing keys is `list(db.keys())`.

`pprint` formats nested data so a human can read it, which is invaluable when dumping a dictionary to a log:

```python
import pprint

data = {"users": [{"name": "Ada", "roles": ["admin"]}], "page": 1}
print(pprint.pformat(data, width=60))
```

`pprint.pp()` is the shorthand for printing directly. For debugging a nested structure, `pformat` into a log line usually beats `print`.

## Safety rails

Three habits prevent most file bugs:

- Check `os.path.exists()` before reading, and decide what to do when it is missing.
- Write to a temporary name and rename at the end, so a crash cannot leave a half-written file.
- Never build a path from untrusted text without checking that it stays inside the folder you intended.

```python
def read_lines(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as file:
        return [line.rstrip("\n") for line in file if line.strip()]
```

The atomic-write pattern is a few lines and worth having:

```python
def write_atomic(path, text):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as file:
        file.write(text)
    os.replace(temporary, path)
```

`os.replace` is atomic on the same filesystem: readers see either the old file or the new one, never a half-written one.

## Project: a random quiz file

Two files, one script. `capitals.txt` holds `state,capital` lines; the script generates a quiz and an answer key, with the questions shuffled.

```python
import random

with open("capitals.txt", encoding="utf-8") as file:
    pairs = [line.strip().split(",") for line in file if line.strip()]

random.shuffle(pairs)

with open("quiz.txt", "w", encoding="utf-8") as quiz, \
     open("answers.txt", "w", encoding="utf-8") as answers:
    for number, (state, capital) in enumerate(pairs[:10], start=1):
        quiz.write(f"{number}. What is the capital of {state}?\n")
        answers.write(f"{number}. {capital}\n")
```

The two open calls on one line need the backslash, or parentheses around the whole `with`. Numbering starts at one because that is what a reader expects, even though the list starts at zero.

## Encodings, newlines, and binary

Text mode decodes bytes into strings for you, using an encoding. Binary mode hands you the bytes untouched. The distinction decides which bugs you get.

```python
with open("notes.txt", "w", encoding="utf-8") as handle:
    handle.write("café\nsecond line\n")

with open("notes.txt", "rb") as handle:
    print(handle.read(6))     # b'caf\xc3\xa9\n'
```

Always pass `encoding="utf-8"` when reading or writing text. The default depends on the platform and the locale, so a script that works on your machine can fail on a server with a different default. If a file starts with a byte-order mark, `utf-8-sig` removes it; otherwise the first string carries an invisible `\ufeff` and comparisons fail for no visible reason.

Newline translation is the other hidden default. Text mode turns `\r\n` into `\n` on the way in and back on the way out on Windows. That is helpful for text and wrong for anything with a fixed format:

```python
with open("rows.csv", "w", encoding="utf-8", newline="") as handle:
    handle.write("a,b\r\n1,2\r\n")
```

`newline=""` turns translation off, which is what the `csv` module expects. Without it, a file written on one platform and parsed on another gains blank lines.

A file object is a cursor. `read()` consumes to the end, and calling it twice returns `""` the second time because the cursor is already there. `seek(0)` puts it back, and `tell()` reports where it is:

```python
with open("notes.txt", encoding="utf-8") as handle:
    first = handle.readline()
    position = handle.tell()
    rest = handle.read()
```

For large files, iterate the handle instead of calling `read()`: the file is read a line at a time and memory stays flat.

Binary mode is for images, archives, PDFs, and anything else that is not text. Copying one is a chunked loop, not a decode:

```python
with open("photo.jpg", "rb") as source, open("copy.jpg", "wb") as target:
    while chunk := source.read(65536):
        target.write(chunk)
```

That `:=` assigns and tests in one expression, stopping at the empty chunk that signals the end. `shutil.copyfile` does the same thing with more care about permissions and is the better choice in real scripts.

## Temporary files and directories

Half-written output is worse than no output. A temporary file lets you build the result somewhere private and move it into place only when it is complete.

```python
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as scratch:
    work = Path(scratch) / "report.txt"
    work.write_text("rows\n", encoding="utf-8")
    print(work.exists())     # True inside the block
```

The directory and everything in it is removed when the block ends, even if an exception is raised. That makes it the right home for intermediate images, unzipped archives, and anything a failed run should not leave behind.

For a single file, `NamedTemporaryFile` gives you a path and a handle:

```python
with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as handle:
    handle.write("a,b\n1,2\n")
    path = handle.name

print(path)   # e.g. /tmp/tmp8k2j1.csv, yours to move or delete
```

`delete=False` means the file survives the `with`, which is the point when the whole job is producing a file. You now own its cleanup, and a stray temporary file is the polite failure mode.

Two rules make temporary files safe. Move the finished file into place with `os.replace()`, which is atomic on the same filesystem; and keep the temporary file in the destination directory, not in `/tmp`, so the move stays on one filesystem. `tempfile.mkstemp(dir=folder)` does exactly that, and it is the difference between a reader seeing the old report or the new one — never half of each.

## Reading like a data pipeline

Most scripts that touch a file are the same three moves: open the file, walk it one line at a
time, keep the bits that matter. Doing it this way instead of `read()`ing the whole file keeps
memory flat no matter how big the input gets, and it makes the program's shape visible.

```python
def count_errors(path):
    errors = 0
    total = 0
    with open(path, encoding="utf-8", errors="replace") as handle:
        for line in handle:
            total += 1
            if line.startswith("ERROR"):
                errors += 1
    return errors, total

errors, total = count_errors("server.log")
print(f"{errors} errors in {total} lines ({errors / total:.1%})")
```

The loop variable is a line, newline included, so everything you do with it usually starts with
`line.strip()`. `errors="replace"` is a pragmatic choice for log files you did not create: a
single corrupt byte should not stop a count of ten thousand lines, and the replacement character
shows up exactly where the damage is.

That same skeleton generalises directly: filter the lines with `if`, transform them with a method
or a function, accumulate into a list, counter, or dictionary. If a file needs more than one pass,
say so in a comment at the top, open it twice, and let each pass be obviously simple. Clever
one-pass programs that interleave two jobs are where subtle miscounts hide.

The one rule that never changes: never catch the exception by ignoring the file instead. An
empty file and an unreadable file must not look the same to the caller, so check
`path.exists()` / let the `open` raise, and let the program fail loudly with a message that names
the file.

## Doubts worth settling

**Where does a relative path point?** At the current working directory, which is the folder you
started Python from, not the folder the script lives in. That is why the same script works in the
editor and fails from a shortcut. Build paths from the script's own location:
`Path(__file__).parent / "data.txt"`.

**Why is my file empty after writing?** Because the write never reached the disk. Using `with`
closes the file at the end of the block, and closing flushes. A file object opened without `with`
and left unclosed can lose its buffer when the program ends abruptly.

**What does `w` do to an existing file?** It empties it before writing. `a` appends, `x` refuses to
overwrite, `r+` edits in place. Choosing the mode is choosing the risk; `x` is the safest default
when you mean to create something new.

**Why do I see `\n` twice or blank lines between rows?** On Windows, text mode translates `\n` to
`\r\n`. Writing `\r\n` yourself in text mode produces `\r\r\n`. Write plain `\n` and let Python
translate, or open with `newline=""` when you must control bytes exactly.

**Is reading a whole file into memory fine?** For notes and configuration, yes. For a log that could
be a gigabyte, iterate the file object instead: `for line in handle:` reads one line at a time, and
the memory cost stays flat.

**Why does `open` fail with `UnicodeDecodeError`?** The bytes are not UTF-8. Files from older
systems are often `cp1252` or `latin-1`. Name the encoding explicitly — `encoding="utf-8"` on every
open you write — and fall back to another encoding only after reading the error.

## A slow read of one script

```python
from pathlib import Path

folder = Path("notes")
folder.mkdir(exist_ok=True)
path = folder / "todo.txt"

with path.open("a", encoding="utf-8") as handle:
    handle.write("buy milk\n")

with path.open(encoding="utf-8") as handle:
    for number, line in enumerate(handle, start=1):
        print(number, line.rstrip())
```

`mkdir(exist_ok=True)` makes the script safe to run twice. The `a` mode adds a line without erasing
the list, and the explicit encoding means the file reads the same on every machine. The second block
opens for reading with no mode argument, which defaults to `r`. `rstrip()` removes the trailing
newline that would otherwise add a blank line to the output, and `enumerate(..., start=1)` numbers
lines the way a person counts them.

## Try it

- Write a script that copies every `.txt` file in a folder into a `backup` subfolder.
- Append a timestamped line to a log each time the script runs.
- Count the words in a text file without loading it entirely into memory.
- Save a dictionary with `shelve`, reopen it in a second run, and print one key.
- Write `write_atomic` and confirm a crash mid-write leaves the old file intact.
- Count the ERROR and WARNING lines in a large log file without loading it into memory, printing a percentage.
- Write a function that returns the three longest lines of a file, one pass only, and explain why the approach runs in constant memory.
