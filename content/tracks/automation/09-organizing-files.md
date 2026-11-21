---
title: Organizing Files
---

Folders accumulate. Downloads full of duplicates, screenshots named `Screenshot 2024-05-01 at 09.14.22.png`, project directories with three versions of the same document. This is exactly the kind of tidying a script does better than a person.

The tools are small: `shutil` moves bytes, `os` walks and renames, `zipfile` packs. The risk is not in the code — it is in the paths.

## Walking a tree

`os.walk()` yields three values for every folder it visits: the folder path, its subfolder names, and its file names.

```python
import os

for folder, subfolders, files in os.walk("downloads"):
    for name in files:
        path = os.path.join(folder, name)
        print(path, os.path.getsize(path))
```

That covers everything below `downloads`, at any depth. `pathlib` offers the same idea with objects and `rglob`, if you prefer that style.

```python
from pathlib import Path

for path in Path("downloads").rglob("*"):
    if path.is_file():
        print(path, path.stat().st_size)
```

`os.walk(topdown=False)` visits subfolders before their parent, which is what you want when deleting empty folders from the bottom up. You can also prune the walk by editing `subfolders` in place:

```python
for folder, subfolders, files in os.walk("."):
    subfolders[:] = [name for name in subfolders if name != ".git"]
```

The slice assignment is deliberate; rebinding `subfolders` to a new list does not affect the walk.

## Finding files by pattern

`glob` matches names with shell-style wildcards. Use it when you want files matching a shape rather than a whole tree.

```python
import glob

for path in glob.glob("downloads/*.png"):
    print(path)

for path in glob.glob("downloads/**/*.csv", recursive=True):
    print(path)
```

`**` with `recursive=True` searches subfolders. `*.png` matches only the end of the name, so `report.png.bak` is not included.

`glob` returns paths as strings in whatever order the filesystem gives, which is not sorted. `sorted(glob.glob(...))` makes runs reproducible, and reproducibility is most of what makes a file script trustworthy.

`fnmatch` tests a single name against a pattern without touching the disk, useful when the names come from somewhere else:

```python
import fnmatch

print(fnmatch.fnmatch("report-2026.csv", "report-*.csv"))   # True
```

## Copying, moving, renaming

```python
import shutil

shutil.copy("report.txt", "archive/report.txt")        # contents
shutil.copy2("report.txt", "archive/report.txt")       # contents and metadata
shutil.copytree("project", "project-backup")
shutil.move("project/notes.txt", "archive/notes.txt")
```

`copy()` duplicates the contents; `copy2()` also keeps timestamps and permissions, which is what a backup should do. `copytree()` copies a folder recursively and refuses to merge into an existing destination unless you pass `dirs_exist_ok=True`.

`shutil.move()` is rename when the destination is on the same filesystem and copy-then-delete when it is not. That means moving to a network drive is slow, and moving a folder across filesystems takes twice the space mid-operation.

A rename is `os.rename()` or `os.replace()`:

```python
import os

os.rename("old.txt", "new.txt")
os.replace("new.txt", "final.txt")   # overwrites an existing target
```

`rename()` raises `FileExistsError` on Windows when the target exists and silently replaces it on macOS and Linux. `replace()` overwrites everywhere — predictable, and dangerous for that reason. Check first when the target might be real:

```python
if not os.path.exists(new):
    os.rename(old, new)
else:
    print("skipped, exists:", new)
```

On case-insensitive filesystems — the default on macOS — renaming `Report.txt` to `report.txt` can appear to do nothing. Rename through a temporary name when only the case changes.

## Deleting

```python
import os
import shutil

os.unlink("notes.txt")               # one file
shutil.rmtree("project-backup")       # a folder and everything in it
```

`unlink()` raises `FileNotFoundError` if the file is already gone; `missing_ok=True` makes it a no-op. `rmtree()` deletes a folder and everything inside it, permanently. There is no undo and no recycle bin. Before you run it on anything you care about, print the paths you are about to delete and read them. For everyday tidying, the `send2trash` package moves items to the system trash instead.

```python
import send2trash

send2trash.send2trash("old-drafts")
```

Never build a delete path from a variable you have not checked. A trailing slash, an empty string, or a relative path resolved from the wrong folder can turn a cleanup into a disaster. Two guards catch most of it:

```python
def safe_delete(folder):
    target = os.path.abspath(folder)
    if target in ("/", os.path.expanduser("~")) or len(target) < 12:
        raise ValueError(f"refusing to delete {target}")
    if not os.path.isdir(target):
        raise ValueError(f"not a folder: {target}")
    shutil.rmtree(target)
```

That is not a security boundary, but it stops the obvious accident.

## Archives

`zipfile` reads and writes `.zip` archives without any extra software. Each name inside the archive is a path, and paths can climb out of the folder you extract into, so check names before extracting.

```python
import zipfile

with zipfile.ZipFile("reports.zip", "w") as archive:
    archive.write("report.txt", arcname="report.txt")

with zipfile.ZipFile("reports.zip") as archive:
    print(archive.namelist())
    archive.extractall("reports")
```

`write()` takes the real path and an optional `arcname`, the name it will have inside the archive. Without `arcname`, the full path is stored, and extraction recreates it — which is not what you want when zipping `/home/me/reports`.

`compression=zipfile.ZIP_DEFLATED` shrinks text and code substantially; the default stores files uncompressed.

Reading a single member without extracting is one call:

```python
with zipfile.ZipFile("reports.zip") as archive:
    text = archive.read("report.txt").decode("utf-8")
    info = archive.getinfo("report.txt")
    print(info.file_size, info.compress_size)
```

A "zip bomb" is a small archive that expands enormously; checking `file_size` against a limit before extracting is the standard defence. A member named `../../etc/passwd` is the other classic; rejecting names containing `..` or starting with `/` before `extractall` closes it.

## A useful rule

Write the command as a dry run first: list what would change, run it, look at the output. Only then remove the printing and let it act.

```python
def plan(folder):
    for name in sorted(os.listdir(folder)):
        if name.endswith(".jpeg"):
            print("rename", name, "->", name[:-5] + ".jpg")
```

The dry run is not bureaucracy. File operations are the one place where a loop runs a thousand times before you notice it is wrong.

## Project: American dates to European dates

Files named `report-05-01-2024.txt` in the American month-day-year order, and you want `report-2024-01-05.txt`. A regex finds the date, `groups()` splits it, an f-string rebuilds it.

```python
import os
import re
import shutil

date_pattern = re.compile(r"""^(.*?)          # anything before
    ((0|1)?\d)-                               # month
    ((0|1|2|3)?\d)-                           # day
    ((19|20)\d\d)                             # year
    (.*?)$                                    # anything after
""", re.VERBOSE)

for name in os.listdir("."):
    match = date_pattern.search(name)
    if not match:
        continue

    before, month, _, day, _, year, _, after = match.groups()
    new = f"{before}{year}-{month}-{day}{after}"

    if new == name:
        continue

    print(f"renaming {name} -> {new}")
    shutil.move(name, new)
```

Three details carry the script. `(.*?)` at both ends is lazy so it does not eat the date. The inner groups around the optional leading digits exist only for the alternation and are ignored with `_`. And the `new == name` check stops a file that is already correct from being "renamed" onto itself.

Run it with the `print` first. A rename loop is easy to write and hard to reverse.

## Timestamps and names that sort

Every file carries three timestamps: modified, accessed, and created (where the platform supports it). The modified time is the useful one, and it is how you find the newest report in a folder.

```python
import os
from datetime import datetime

newest = max(folder.iterdir(), key=os.path.getmtime)
stamp = datetime.fromtimestamp(os.path.getmtime(newest))
print(newest.name, stamp.strftime("%Y-%m-%d %H:%M"))
```

`strftime` with a year-first, zero-padded format gives names that sort correctly as text. That is worth choosing deliberately:

```python
name = f"report-{stamp:%Y-%m-%d-%H%M}.txt"
```

Avoid `:` and `/` in filenames. They are illegal on Windows, awkward in URLs, and a colon is how you separate a drive letter. `2024-05-01-0930` is unambiguous, sorts chronologically, and survives every filesystem.

Copying a file normally gives the copy a new modified time, which destroys the information you just used. `shutil.copystat(source, target)` copies the timestamps and permissions across. `shutil.copy2` does the copy and the metadata in one call.

Renaming inside a folder is `Path.rename`, and it fails if the target exists on Windows. `os.replace` overwrites atomically, which is what you want for a file you are regenerating, and not what you want when a name collision means two different files. Decide which of those you are doing before choosing:

```python
if target.exists():
    target = target.with_name(f"{target.stem}-2{target.suffix}")
source.rename(target)
```

Sorting a directory listing by name and by time gives two different orders, and neither is the order a file manager shows. If your script's output depends on order, sort explicitly with a key. `Path.iterdir()` order is whatever the filesystem returns.

## Archives beyond zip

`zipfile` handles `.zip`. The `tarfile` module handles `.tar`, `.tar.gz`, and `.tar.bz2`, which is what most Linux software ships as. `shutil` wraps both for the common cases.

```python
import shutil

shutil.make_archive("backup", "zip", folder)
shutil.make_archive("backup", "gzip", folder)   # backup.tar.gz
shutil.unpack_archive("backup.zip", "restored")
```

One call each way, and the format comes from the extension you pass. That covers a folder of text files and a one-off backup.

Reading a tar archive directly is the same shape as reading a zip:

```python
import tarfile

with tarfile.open("logs.tar.gz", "r:gz") as archive:
    for member in archive.getmembers():
        print(member.name, member.size)
    archive.extract("notes.txt", path="out")
```

The mode says how to read it: `r:gz` for gzipped tar, `r` for plain, `w:gz` to write. `tarfile` keeps permissions and symlinks, which zip does not, and that is exactly why extracting an untrusted archive is dangerous. A crafted archive can contain `../` paths or absolute paths and write outside the target directory.

Python 3.12 and later refuse unsafe members by default with `filter="data"`; older code needs it explicitly:

```python
with tarfile.open("logs.tar.gz") as archive:
    archive.extractall("out", filter="data")
```

Whichever module you use, list the members before extracting and check for anything that is not a plain relative path. An archive from a stranger deserves a look inside before it gets a directory of yours.

## Try it

- Find every file larger than 50 MB under your home folder and print the five largest.
- Rename a folder of images to `image-001.ext`, `image-002.ext`, and so on, preserving extensions.
- Write a dry-run script that sorts loose files into folders by extension, printing each move.
- Zip a folder with `ZIP_DEFLATED`, then list the members and their compressed sizes.
- Refuse to extract any archive member whose name contains `..`.
