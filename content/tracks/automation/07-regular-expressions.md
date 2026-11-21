---
title: Pattern Matching with Regular Expressions
---

Searching for a literal string is easy. Searching for "a phone number, whatever the area code" is not: the digits change every time. A regular expression is a pattern that describes a family of strings, so one search can match all of them.

You have already met a tiny version of this idea with `in`, `startswith()`, and `endswith()`. A regex is the general form: match a shape, not an exact string.

## Raw strings and compile

Always write patterns as raw strings, prefixed with `r`. Backslashes are meaningful in patterns, and `r` stops Python from interpreting them first.

```python
import re

pattern = re.compile(r"\d{3}-\d{3}-\d{4}")
print(pattern.search("Call 415-555-1234 now.").group())
```

`search()` returns a match object or `None`. `.group()` gives the text that matched. Compiling once and reusing the object is both faster and clearer than repeating the pattern string.

The `re` module also has module-level functions — `re.search(pattern, text)` — which compile and cache the pattern for you. Both are fine; compiling makes the pattern a named value and reads better once it appears twice.

A match object is truthy, so `if pattern.search(text):` is a valid test. Calling `.group()` on `None` raises `AttributeError`, which is the most common regex crash:

```python
match = pattern.search("no number here")
if match:
    print(match.group())
else:
    print("nothing found")
```

## The building blocks

| Pattern | Means |
| --- | --- |
| `\d` | one digit |
| `\w` | one word character: letter, digit, underscore |
| `\s` | one whitespace character |
| `.` | any character except a newline |
| `[aeiou]` | one character from the set |
| `[^aeiou]` | one character not in the set |
| `[a-z0-9]` | one character from a range |
| `\d{3}` | exactly three digits |
| `\d{3,5}` | three to five digits |
| `\d{3,}` | three or more |
| `\d*` | zero or more |
| `\d+` | one or more |
| `\d?` | zero or one |
| `(ab)+` | a group, repeated |
| `a\|b` | a or b |

```python
re.compile(r"\d+")            # one or more digits
re.compile(r"\d\d\d-\d\d\d\d") # same as \d{3}-\d{4}
re.compile(r"[A-Z][a-z]+")     # a capitalised word
re.compile(r"cat|dog")         # either word
```

The uppercase versions negate: `\D` is a non-digit, `\W` a non-word character, `\S` a non-space. That is handy for splitting on "anything that is not a letter".

Quantifiers bind to the thing immediately before them. `ab+` is an `a` followed by one or more `b`s, not one or more `ab`s; parentheses change that. `(ab)+` repeats the pair.

## Greedy and lazy

By default a quantifier is greedy: it takes as much as it can and still lets the rest of the pattern match. That is why `r"<.*>"` on `<b>bold</b>` matches the whole string rather than the first tag.

Adding `?` after a quantifier makes it lazy: it takes as little as possible.

```python
greedy = re.compile(r"<.*>")
lazy = re.compile(r"<.*?>")

print(greedy.search("<b>bold</b>").group())   # <b>bold</b>
print(lazy.search("<b>bold</b>").group())     # <b>
```

Greediness is not a bug; it is usually what you want when the delimiters are unambiguous. When a pattern returns too much, the fix is nearly always a lazy quantifier or a narrower character class.

## Anchors

`^` anchors to the start of the string, `$` to the end. Without them, a pattern matches anywhere inside the text.

```python
re.compile(r"^\d+$")  # the whole string is digits
```

`re.fullmatch()` is the clearer way to say the same thing: it requires the entire string to match. Use it for validation and anchors for searching inside a larger text.

With `re.MULTILINE`, `^` and `$` also match at the start and end of each line, which is how you find lines in a log:

```python
errors = re.compile(r"^ERROR: (.*)$", re.MULTILINE)
print(errors.findall(log_text))
```

`\b` matches a word boundary, so `r"\bcat\b"` finds `cat` but not `concatenate`. It is the tool for whole-word searches.

## Flags

Flags change how matching works: `re.IGNORECASE` ignores case, `re.DOTALL` lets `.` match newlines, and `re.VERBOSE` lets you spread a pattern over several lines with comments.

```python
re.compile(r"error", re.IGNORECASE)
re.compile(r"start.*end", re.DOTALL)
```

Flags combine with `|`:

```python
pattern = re.compile(r"""
    \d{3}      # area code
    -          # separator
    \d{3}      # exchange
    -          # separator
    \d{4}      # line number
""", re.VERBOSE)
```

That is the same phone pattern as before, and it is readable. For anything longer than a line, `VERBOSE` is worth the extra characters.

## Groups

Parentheses capture parts of a match, which is how you extract rather than merely detect.

```python
phone = re.compile(r"(\d{3})-(\d{3}-\d{4})")
match = phone.search("Call 415-555-1234 now.")

if match:
    print(match.group(0))  # 415-555-1234
    print(match.group(1))  # 415
    print(match.group(2))  # 555-1234
```

`group(0)` is the whole match and `group(n)` is the nth pair of parentheses, numbered from one by their opening bracket. `groups()` returns them all as a tuple.

Groups can be named with `(?P<area>\d{3})` and read with `match.group("area")`. Named groups survive an edit that inserts a new pair of parentheses:

```python
phone = re.compile(r"(?P<area>\d{3})-(?P<rest>\d{3}-\d{4})")
match = phone.search("Call 415-555-1234 now.")
print(match.group("area"), match.group("rest"))
```

`(?:...)` groups without capturing, which is how you repeat a sequence without adding a number to the list.

Inside `sub()`, groups are referenced as `\1` or `\g<name>`:

```python
phone.sub(r"(\1) \2", "Call 415-555-1234 now.")
```

## Finding every match

`findall()` returns a list of strings — or a list of tuples when the pattern has groups. `finditer()` returns match objects one at a time, which is better when you need positions or groups.

```python
text = "Reach me at 415-555-1234 or 212-555-9876."

for match in re.finditer(r"\d{3}-\d{3}-\d{4}", text):
    print(match.group(), "at", match.start())
```

The tuple rule surprises people. `r"(\d{3})-(\d{4})"` with `findall` gives `[("415", "1234")]`, not `["415-1234"]`. If you want strings, use one group or `finditer`.

`match.start()` and `match.end()` give character offsets, which is how you rewrite part of a text without disturbing the rest.

## Replacing

`sub()` replaces every match. Because the replacement can reference captured groups, it can restructure text rather than just erase it.

```python
messy = "2024-05-01"
tidy = re.sub(r"(\d{4})-(\d{2})-(\d{2})", r"\3/\2/\1", messy)
print(tidy)  # 01/05/2024
```

The `count` argument limits replacements: `sub(pattern, repl, text, count=1)` fixes only the first. `subn()` returns the new string and the number of replacements, which is useful for a report of what changed.

The replacement can be a function, called with the match object, for anything that needs logic:

```python
def redact(match):
    return match.group()[:2] + "*" * 6

print(re.sub(r"\d{8}", redact, "id 12345678 ok"))
```

Removing a pattern is `sub(pattern, "")`. Removing surrounding whitespace left behind is a second `sub`. Two passes are normal.

## Escaping

Characters like `.`, `*`, `?`, `+`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|`, and `\` mean something in a pattern. To match one literally, prefix it with a backslash, or run the text through `re.escape()`:

```python
needle = "3.14 (approx)"
print(re.escape(needle))   # 3\.14\ \(approx\)
```

This matters whenever the pattern contains user input or a filename. An unescaped `.` matches any character, so a search for `report.csv` also finds `reportXcsv`.

## A pattern worth keeping

Email addresses are the standard example, and the honest lesson is that a regex cannot validate one properly. It can find the common shape:

```python
email = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

found = email.findall("write to ada@example.com or grace@navy.mil")
print(found)   # ['ada@example.com', 'grace@navy.mil']
```

Strip trailing punctuation before trusting the match — `"grace@navy.mil."` ends with a period that belongs to the sentence. The full RFC is enormous; the practical pattern above is deliberately loose and good enough for extraction.

## Looking without consuming

A lookahead checks what comes next without including it in the match. A lookbehind checks what came before. Both are zero-width: they assert a position and leave the text where it was.

```python
import re

prices = "coffee 3 USD, tea 2 EUR, cake 5 USD"

print(re.findall(r"\d+(?= USD)", prices))     # ['3', '5']
print(re.findall(r"\d+(?! USD)", prices))     # ['2']
print(re.findall(r"(?<=tea )\d+", prices))    # ['2']
print(re.findall(r"(?<!tea )\d+", prices))    # ['3', '5']
```

The number is matched; the currency is only required to be there. That difference matters when you replace: consuming ` USD` would delete it.

The canonical use is grouping digits in a long number, where the comma has to be inserted without touching the digits:

```python
print(re.sub(r"(?<=\d)(?=(\d{3})+$)", ",", "1234567"))   # 1,234,567
```

Lookbehind must be fixed width: `(?<=tea )` is fine, `(?<=tea\s+)` raises `error: look-behind requires fixed-width pattern`. The workaround is to capture the variable part in a group and rebuild the replacement instead of looking behind it.

Lookarounds are also how you avoid a common bug. `re.sub(r"^#\s*", "", line)` strips one leading hash; `re.sub(r"^(?=#+)", "", line)` would assert the hash is there and change nothing. Assertions are for conditions, consuming patterns are for edits.

If a lookaround is doing a lot of work, the pattern is probably doing two jobs. Splitting it into a match plus a check in ordinary Python is often easier to read and to debug.

## Recipes worth keeping

The same handful of patterns come up constantly. Keep them small and test them on your real data before trusting them.

```python
import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
DATE = re.compile(r"(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})")
PHONE = re.compile(r"\+?(\d[\s.-]?){7,15}")
```

Compile once at module level when the pattern is used more than a few times; `re` caches patterns internally, but naming one documents its purpose and keeps the flags with it.

Normalising a phone number is a two-step job: find the digits, then format them.

```python
digits = re.sub(r"\D", "", "+1 (555) 123-4567")
print(digits)                       # 15551234567
print(f"+{digits[0]} ({digits[1:4]}) {digits[4:7]}-{digits[7:]}")
```

Dates parsed with a named pattern come out readable:

```python
match = DATE.fullmatch("2024-05-01")
print(match.groupdict() if match else "no match")   # {'year': '2024', 'month': '05', 'day': '01'}
```

`fullmatch` is the validator; `search` is the extractor. Using `search` where you meant `fullmatch` is how `"2024-05-01 extra text"` gets accepted as a date.

Two jobs should not be given to a regex. Validating an email address properly is not possible with a pattern short enough to read — the specification allows comments and quoted local parts. Match the loose shape, then send a confirmation. Parsing HTML with a regex fails on nesting; use a parser, which the scraping chapter does.

Finally, print the pattern and the input side by side when it will not match. Most failures are an unescaped `.`, a missing `re.MULTILINE`, or a trailing newline that `$` does not allow for.

## Doubts worth settling

**Why does `re.match` fail on text that clearly contains the pattern?** `match` only looks at the
start. Use `search` to look anywhere, or `findall` to collect every occurrence. `fullmatch` is the
strict one: the whole string must fit the pattern.

**When do I need a raw string?** Whenever the pattern contains a backslash. `"\d"` is a Python
escape that happens to mean the same thing today; `r"\d"` says what you mean. `r"\bword\b"` is
unambiguous where a normal string would turn `\b` into a backspace.

**Why is my pattern matching too much?** Quantifiers are greedy by default, so `.*` runs to the end
of the line and backtracks. A trailing `?` makes it lazy: `<b>.*?</b>` stops at the first closing
tag. When a regex works on one line and fails on a paragraph, greed is usually the reason.

**What does `re.escape` do?** It neutralises characters that have regex meaning, so you can build a
pattern from user text such as a filename or a search phrase. Forgetting it is how a literal `+`
becomes a quantifier.

**Why do I get `None` instead of an error?** No match is not exceptional in `re` — `search` returns
`None` and `group()` on `None` raises `AttributeError`. Check the result first:
`if match := pattern.search(text):` then use `match.group()`.

**Are groups numbered from zero?** Group 0 is the whole match; numbered groups start at 1, and
named groups are clearer: `(?P<year>\d{4})` read back as `match.group("year")`. Named groups survive
edits to the pattern, which numbered ones do not.

## A slow read of one script

```python
import re

line = "Order 4471 shipped 2026-03-04 to Oslo"
pattern = re.compile(r"Order (?P<number>\d+).*?(?P<date>\d{4}-\d{2}-\d{2})")
match = pattern.search(line)
if match:
    print(match.group("number"), match.group("date"))
else:
    print("no order")
```

Compiling once keeps the pattern readable and reusable. `\d+` takes as many digits as exist, so a
five-digit order number works without changing anything. `.*?` is lazy so the date group is allowed
to match the first date rather than the last. Naming both groups means the print line says what each
value is, and a later added group cannot shift the numbering. The `if match` branch is the habit to
build: `re` reports absence with `None`, not with an exception.

## Try it

- Match every date written as `YYYY-MM-DD` in a block of text and print them one per line.
- Extract all email addresses, then replace each domain with `example.com`.
- Validate that a string is a whole number of at most four digits, using anchors.
- Find every repeated word in a paragraph with `r"\b(\w+)\s+\1\b"`.
- Rewrite a log line's timestamp into a different format with `sub` and named groups.
