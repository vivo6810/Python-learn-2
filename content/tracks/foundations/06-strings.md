---
title: Manipulating Strings
---

Text is the format most data arrives in: log lines, form fields, spreadsheets exported as comma-separated values, responses from a web page. Being fluent with strings is most of the difference between a script that works on your one example and one that works on the thousand you did not see.

## Quotes and escapes

Single and double quotes are equivalent. Use one kind to wrap the other without escaping:

```python
print('He said "hello".')
print("It's fine.")
```

Backslash escapes special characters: `\n` for a new line, `\t` for a tab, `\'` and `\"` for quotes, `\\` for a literal backslash. A raw string, prefixed with `r`, keeps backslashes as typed — essential for regular expressions and Windows paths.

```python
print("line one\nline two")
print(r"C:\Users\name")
```

Triple quotes span lines and keep the line breaks:

```python
note = """first line
second line"""
```

An unterminated string is a `SyntaxError`, and so is a backslash at the very end of a line. The error message points at the end of the line, not at the opening quote, which sends you looking in the wrong place.

## Indexing and slicing

Strings behave like lists of characters, with the same zero-based indexes, negative indexes, and slices. They differ in one important way: they are immutable. No method changes a string in place; every method returns a new one.

```python
word = "automate"

print(word[0])    # a
print(word[-1])   # e
print(word[0:4])  # auto
print(len(word))  # 8
```

Slicing a string returns a new string, and `word[:]` is a copy. `word[1:1]` is `""`, not an error. An index past the end raises `IndexError`, but a slice past the end is clamped.

Because strings are immutable, this does nothing:

```python
word.upper()        # returns a new string, discarded
word = word.upper() # rebinds the name
```

Strings are iterable, so `for char in word:` works, and `list(word)` turns one into a list of characters.

## Searching

```python
line = "ERROR 2024-05-01 disk full"

print("ERROR" in line)          # True
print(line.startswith("ERROR")) # True
print(line.find("2024"))        # 6
print(line.count(" "))          # 4
```

`find()` returns `-1` when the text is absent; `index()` raises instead. Both are useful depending on whether absence is a normal outcome.

`in` is the readable test and the one to reach for. For a prefix or suffix, `startswith()` and `endswith()` accept a tuple of options:

```python
if line.startswith(("ERROR", "FATAL")):
    print("problem")
```

`rfind()` searches from the right, which is how you get the last path segment of a URL without splitting the whole thing.

## Case and classification

```python
print("ada lovelace".title())   # Ada Lovelace
print("ADA".lower())            # ada
print("ada".upper())            # ADA
print("Ada".swapcase())         # aDA
print("Ada".casefold())         # ada, aggressive lower for comparisons
```

`isupper()`, `islower()`, and `istitle()` report on the whole string; a string with no letters returns `False` for all three. Comparing user input case-insensitively is `answer.lower() == "yes"`, and `casefold()` is the version that handles accents and non-Latin scripts.

The `is*` methods validate shape:

```python
print("123".isdigit())    # True
print("abc".isalpha())    # True
print("abc123".isalnum()) # True
print("   ".isspace())    # True
print("Hello".isupper())  # False
```

These are handy for validating input, but be careful: `"½".isdigit()` is `True` and `int("½")` fails. For real validation, try the conversion and handle the error.

## Cleaning and shaping

```python
raw = "   Ada Lovelace   "

print(raw.strip())              # 'Ada Lovelace'
print(raw.strip().lower())      # 'ada lovelace'
print("a,b,c".split(","))       # ['a', 'b', 'c']
print("-".join(["a", "b"]))     # 'a-b'
```

`split()` without an argument splits on any run of whitespace, which is the right choice for parsing prose. With an argument it splits on that exact string, and consecutive separators produce empty strings:

```python
print("a,,b".split(","))     # ['a', '', 'b']
print("a  b".split())        # ['a', 'b']
print("a  b".split(" "))     # ['a', '', 'b']
```

`split(maxsplit=1)` limits the number of splits, which is how you separate a command from its arguments. `rsplit` splits from the right.

`join()` is the inverse, and it is the only correct way to build a string from many pieces.

```python
words = ["spam", "eggs", "ham"]
print(", ".join(words))         # spam, eggs, ham
```

`join()` requires every item to be a string; a list of numbers raises `TypeError`, and `"".join(str(n) for n in numbers)` is the fix. Repeated `+` in a loop creates a new string each pass and is quadratic on large input; collect into a list and join once.

`strip()` removes whitespace from both ends; `lstrip()` and `rstrip()` one end each. They also take characters to remove, which is easy to misread as a substring:

```python
print("xxhelloxx".strip("x"))   # hello
print("report.csv".rstrip(".csv"))  # 'report' — strips any of c, s, v, .
```

That second result surprises people. For a suffix, use `removesuffix(".csv")` instead.

## Padding and aligning

```python
print("right".rjust(12))
print("left".ljust(12, "."))
print("mid".center(12, "-"))
```

```plaintext
       right
left........
----mid-----
```

These are the tools for text tables, along with width specifiers in f-strings:

```python
for name, score in [("Ada", 93), ("Grace", 7)]:
    print(f"{name:<10}{score:>3}")
```

`<` left-aligns, `>` right-aligns, `^` centres, and the number is the total width. The f-string version is shorter than chaining `ljust`, and it converts numbers for free.

## Replacing

```python
print("hello world".replace("world", "there"))
print("a-b-c".replace("-", "+", 1))   # 'a+b-c'
```

`replace()` returns a new string and replaces every occurrence unless `count` is given. Chaining is common for cleanup:

```python
clean = text.replace("\t", " ").replace("\r", "").strip()
```

For anything pattern-shaped — several spaces, optional punctuation — a regular expression is the right tool, which is the next track's first chapter.

## A project: a password generator

A password is a string built from a pool, and `random.choice` picks from it:

```python
import random
import string

letters = string.ascii_letters
digits = string.digits
symbols = "!@#$%^&*"

pool = letters + digits + symbols
password = "".join(random.choice(pool) for _ in range(16))

print(password)
print(len(password))
```

For anything a person will actually use, `secrets` is the correct module — it draws from the operating system's random source rather than a predictable seed:

```python
import secrets
import string

alphabet = string.ascii_letters + string.digits
password = "".join(secrets.choice(alphabet) for _ in range(20))
```

The rest of the program is validation: require a length, reject a pool that is too small, and never print the password into a log.

## Numbers as text

Formatting is where readable output is won. The spec after a colon controls width, alignment, precision, and grouping, and it works with any f-string.

```python
amount = 1234.5

print(f"{amount:.2f}")        # 1234.50
print(f"{amount:,.2f}")       # 1,234.50
print(f"{0.256:.1%}")         # 25.6%
print(f"{1234567:,}")         # 1,234,567
print(f"{7:03d}")             # 007
print(f"{255:x} {255:b}")     # ff 11111111
```

`d` is a whole number, `f` a fixed-point decimal, `%` multiplies by a hundred and adds the sign, `x` and `b` are hexadecimal and binary. The zero before `3d` pads with zeros instead of spaces, which is how you get `007` or a fixed-width timestamp.

Width and alignment combine in one spec: `{name:<12}` left-aligns in twelve characters, `{score:>5}` right-aligns, `{value:^9}` centres. For numbers, `>` is the default, which is why a column of scores lines up without asking.

Rounding at print time is not rounding in the data. `f"{2.675:.2f}"` prints `2.67`, because the stored float is slightly below 2.675. If a total must match to the cent, do the arithmetic in `Decimal` and format that:

```python
from decimal import Decimal

total = Decimal("0.10") + Decimal("0.20")
print(f"{total:.2f}")   # 0.30
```

`Decimal` takes strings, not floats — `Decimal(0.1)` carries the float's error into the decimal. It is slower than a float and worth it for money and anything that must reconcile.

## Encoding: text is bytes with a rule

A string is a sequence of characters; a file or a socket carries bytes. The encoding is the rule that maps between them, and `utf-8` is the one to use unless something forces otherwise.

```python
text = "café"

data = text.encode("utf-8")
print(data)                    # b'caf\xc3\xa9'
print(data.decode("utf-8"))    # café
```

Encoding always works for valid text in UTF-8. Decoding can fail, because the bytes may come from something that used a different rule:

```python
print(b"caf\xe9".decode("utf-8", errors="replace"))   # caf�
```

`errors="replace"` substitutes a marker instead of raising. `errors="ignore"` drops the bytes silently, which is usually the wrong choice: the text looks fine until a name or a price disappears. `latin-1` decodes any byte sequence without complaint, which makes it useful for diagnosis and dangerous as a default.

Always name the encoding when opening a text file:

```python
with open("notes.txt", encoding="utf-8") as handle:
    text = handle.read()
```

Without it, Python uses the platform default, which differs between machines. A file that reads correctly on your laptop and mojibakes on a server is almost always this line.

A byte-order mark at the start of a file — common in exports from Windows software — appears as `\ufeff` in the first string and breaks comparisons. Read with `encoding="utf-8-sig"` to strip it.

`width` in formatting counts characters, not bytes, so `len("café")` is 4 while its UTF-8 form is 5 bytes. Text columns may still look ragged in a terminal because some characters are displayed two cells wide; for table output, that is a limitation to live with or a library to reach for.

## Try it

- Take a sentence, strip it, title-case it, and print it with the words reversed.
- Print a table of three names and ages aligned in columns using width specifiers.
- Count the vowels in a paragraph, ignoring case.
- Clean a pasted list of emails: split on commas or newlines, strip each, lowercase it, drop empties, and join with `"; "`.
- Generate a 20-character password with `secrets` and report whether it contains a digit and a symbol.
