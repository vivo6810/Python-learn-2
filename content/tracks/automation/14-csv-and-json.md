---
title: Working with CSV Files and JSON Data
---

Two plain-text formats carry most of the world's structured data. CSV is rows and columns for spreadsheets; JSON is nested values for APIs and configuration. Both are text, so you can read them, diff them, and store them in version control.

They are also the two formats you will convert between most often, usually to move data from a spreadsheet into a program and back again.

## CSV is not just commas

A CSV file is a table written out line by line, with a separator between fields and a newline between rows. The separator is usually a comma, sometimes a semicolon in Europe, sometimes a tab. Fields that contain the separator, a quote, or a newline are wrapped in double quotes, and a literal quote inside them is doubled.

That quoting is the whole reason to use the `csv` module. `line.split(",")` is wrong the moment an address contains a comma, and silently wrong when a quoted field spans two lines.

```python
import csv

with open("sales.csv", newline="", encoding="utf-8") as file:
    rows = list(csv.reader(file))

print(rows[0])   # ['date', 'region', 'amount']
print(rows[1])   # ['2024-05-01', 'north', '120']
```

`newline=""` is required. Without it, the module's own newline handling and Python's text-mode translation fight, and Windows produces blank rows between records. The `csv` documentation asks for it explicitly, and it is correct on every platform.

Every value is a string. Convert numbers and dates yourself, and expect failures when a cell is empty.

```python
for date, region, amount in rows[1:]:
    print(region, float(amount))
```

`float("")` raises `ValueError`, and a stray space produces the same. Strip before converting, and decide what an empty cell means — zero, skip, or error — before writing the loop.

## Dictionaries per row

`DictReader` maps each row to the header names, which is far more readable than counting columns.

```python
with open("sales.csv", newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        print(row["region"], float(row["amount"]))
```

The header row is consumed automatically and becomes the keys. `row` is an ordinary dictionary, so `row.get("discount", "0")` works for an optional column. `restkey` and `restval` handle rows with too many or too few fields instead of raising.

`DictWriter` goes the other way. Give it the field names first, write the header, then write dictionaries.

```python
with open("summary.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=["region", "total"])
    writer.writeheader()
    writer.writerow({"region": "north", "total": 120})
```

A dictionary with a key that is not in `fieldnames` raises `ValueError` by default; `extrasaction="ignore"` drops it instead. Order in `fieldnames` is the column order in the file, so sorting the list is how you sort the columns.

Always pass `newline=""` when opening a CSV file, for writing as much as for reading. Without it, Windows line endings produce blank rows.

## Dialects and other separators

A semicolon file or a tab file is one argument away. `delimiter` sets the separator, `quotechar` the quoting character, and `quoting` how aggressively to quote.

```python
with open("export.csv", newline="", encoding="utf-8") as file:
    reader = csv.reader(file, delimiter=";")
    rows = list(reader)
```

`csv.Sniffer` guesses the dialect from a sample, which is useful when users upload files you have never seen:

```python
sample = open("unknown.csv", encoding="utf-8").read(2048)
dialect = csv.Sniffer().sniff(sample)
print(dialect.delimiter)
```

It is a guess, and it fails on single-column files where every candidate separator looks equally absent. Fall back to a comma.

`quoting=csv.QUOTE_ALL` writes every field quoted, which some importers require. `QUOTE_MINIMAL` is the default and the right choice almost always.

## Excel, encodings, and numbers

Excel on Windows opens a plain UTF-8 CSV as mojibake, because it assumes the local codepage. Writing with `encoding="utf-8-sig"` adds a byte-order mark that Excel respects, at the cost of a BOM character at the start of the first header for every other reader.

```python
with open("for-excel.csv", "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.writer(file)
    writer.writerow(["name", "city"])
```

Leading zeros disappear when a spreadsheet reopens a CSV, because it interprets `007` as a number. There is no fix inside CSV; the value has to be quoted or the file has to be `.xlsx`. The same applies to long numbers: a 16-digit identifier loses its last digits to floating-point precision.

## Grouping and totalling

This is the work CSV was made for: read rows, accumulate by key, write the result.

```python
import csv
from collections import defaultdict

totals = defaultdict(float)

with open("sales.csv", newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        totals[row["region"]] += float(row["amount"])

with open("totals.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["region", "total"])
    for region, total in sorted(totals.items()):
        writer.writerow([region, round(total, 2)])
```

`defaultdict(float)` starts every new key at `0.0`, which removes the `get(key, 0)` dance. Sorting before writing gives a stable file you can diff between runs.

Reading the whole file into memory is fine for thousands of rows and wrong for millions. The pattern above streams: it never holds more than one row and the totals.

## JSON

JSON looks like Python literals, with one important difference: the words are lowercase — `true`, `false`, `null` — and keys are always strings. The `json` module translates between the two.

```python
import json

data = {
    "name": "Ada",
    "scores": [93, 97],
    "active": True,
}

text = json.dumps(data, indent=2)
print(text)

restored = json.loads(text)
print(restored["scores"][0])
```

`dumps()` and `loads()` work with strings. `dump()` and `load()` work with files.

```python
with open("config.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=2)

with open("config.json", encoding="utf-8") as file:
    config = json.load(file)
```

`indent=2` makes the file readable and diffable. `sort_keys=True` makes it stable across runs, which matters if it lives in version control. `ensure_ascii=False` writes real accented characters instead of `\u00e9` escapes.

```python
json.dump(data, file, indent=2, sort_keys=True, ensure_ascii=False)
```

A trailing comma is not legal JSON, and a comment is not either. If you need comments in configuration, use TOML or YAML; do not teach your parser to ignore them.

Bad input raises `json.JSONDecodeError`, which is a subclass of `ValueError` and carries the line and column:

```python
try:
    config = json.loads(text)
except json.JSONDecodeError as error:
    print("bad JSON at", error.lineno, "column", error.colno)
    print(error.msg)
```

That message is worth surfacing to a user. A truncated download and a hand-edited typo produce the same generic failure otherwise.

## Nested shapes and missing keys

Real JSON is dictionaries of dictionaries, with lists where order matters. Reach in one key at a time, and use `get()` for anything optional.

```python
payload = {
    "user": {"name": "Ada", "roles": ["admin", "editor"]},
    "meta": {"page": 2, "total": 41},
}

print(payload["user"]["roles"][0])
print(payload.get("meta", {}).get("next"))
```

Chained indexing raises `KeyError` at the first missing step; chained `get()` returns `None` and lets the script decide. A small helper makes deep reads tolerable:

```python
def dig(data, *path, default=None):
    for key in path:
        if not isinstance(data, dict) or key not in data:
            return default
        data = data[key]
    return data

print(dig(payload, "meta", "total", default=0))
```

When you control the schema, validate it on the way in. A missing key discovered at the point of use is a bug a long way from its cause.

## Which to use

Use CSV when the shape is a rectangle: one header row, one record per line, values that fit in cells. Use JSON when the shape branches: lists inside objects, optional fields, nested records.

Converting between them is a common task — a CSV becomes a list of dictionaries, which `json.dump` writes directly.

```python
with open("sales.csv", newline="", encoding="utf-8") as file:
    records = list(csv.DictReader(file))

with open("sales.json", "w", encoding="utf-8") as file:
    json.dump(records, file, indent=2)
```

Going the other way needs the union of all keys, because JSON records are not required to share a schema:

```python
records = [
    {"name": "Ada", "score": 93},
    {"name": "Grace", "score": 97, "note": "retake"},
]

fields = sorted({key for record in records for key in record})

with open("people.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
```

`DictWriter` fills missing keys with `restval`, which defaults to the empty string. That is the right cell value for a spreadsheet.

For logs, one JSON object per line — "JSON Lines" — is often better than one array: it appends without rewriting, and streams line by line.

## Streaming files larger than memory

`readlines()` on a two-gigabyte export is a good way to lose the machine. `csv` is built for streaming: hand it a file object and it yields one row at a time.

```python
import csv

total = 0

with open("sales.csv", encoding="utf-8", newline="") as handle:
    for row in csv.DictReader(handle):
        total += float(row["amount"])

print(total)
```

Memory stays flat no matter how long the file is. The `newline=""` is not optional: without it, quoted fields containing line breaks are read incorrectly on some platforms.

Writing works the same way, and the pattern is to read, transform, and write in one pass:

```python
with open("in.csv", encoding="utf-8", newline="") as source, \
     open("out.csv", "w", encoding="utf-8", newline="") as target:
    reader = csv.DictReader(source)
    writer = csv.DictWriter(target, fieldnames=["id", "total"])
    writer.writeheader()
    for row in reader:
        writer.writerow({"id": row["id"], "total": row["amount"]})
```

That also solves the "write at the end" problem: if the job crashes halfway, the output is incomplete but valid up to that point, rather than empty.

JSON is different. `json.load` reads the whole document, because a JSON document is one value and cannot be parsed incrementally without a streaming parser. Two answers exist. For a large array of records, use JSON Lines — one self-contained object per line — and read it line by line:

```python
import json

with open("events.jsonl", encoding="utf-8") as handle:
    for line in handle:
        event = json.loads(line)
        print(event["type"])
```

JSON Lines is not valid JSON as a whole, and it is what log pipelines and data exports actually use, because it streams and appends. For a genuinely huge JSON array, the `ijson` package walks it without loading it.

Whichever format, sort large files on disk with the `sort` command or process them in chunks. A dictionary of a million rows in memory is fine on a laptop and not fine on a small server.

## Cleaning passes

Real exports are messier than the examples. A short cleaning pass catches most of it, and doing it once, near the input, keeps the mess out of everything downstream.

```python
def clean_row(row, row_number):
    errors = []
    key = (row.get("email") or "").strip().lower()
    if "@" not in key:
        errors.append("email")

    try:
        amount = float(row["amount"])
    except (KeyError, TypeError, ValueError):
        errors.append("amount")
        amount = None

    return {"email": key, "amount": amount}, errors, row_number
```

Returning the errors instead of raising lets one pass report every bad row rather than stopping at the first. Write the rejects to a separate file with the row number and the reason; that file is what the person who sent the data needs.

Four cleaning steps cover most cases:

- **Headers.** Strip spaces and lowercase them before matching. `" Total "` and `"total"` are the same column to a human.
- **Empties.** `None`, `""`, `"N/A"`, and `"-"` all mean missing. Decide once, in one function.
- **Types.** Convert numbers and dates at the boundary, and record failures rather than letting them reach a calculation as strings.
- **Duplicates.** A set of primary keys turns "sent twice" from a silent double count into a visible decision.

A cleaning pass should be idempotent: running it on already-clean data changes nothing. If it renames a column on every run, or doubles a value, it will destroy the file the second time someone runs it.

Finally, keep the raw file. Cleaned data is a claim about the original; when the numbers look wrong a week later, the original is the only way to tell whether the cleaning was at fault.

## Try it

- Read a CSV of names and email addresses, keep only addresses at one domain, and write them to a new file.
- Read a semicolon-separated export, detect the delimiter, and rewrite it as a comma-separated file.
- Convert a JSON list of records into a CSV with one column per key.
- Add a `total` key to each record in a JSON file and save it back with indentation.
- Write a function that turns a CSV into JSON Lines, one object per line.
