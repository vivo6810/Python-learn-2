---
title: Dictionaries and Structuring Data
---

A list answers "what is at position three?". A dictionary answers "what is the value for this key?" — which is usually the question you actually have. Names, counts, settings, records: anything you would look up rather than count through.

## Keys and values

A dictionary maps keys to values. Keys are unique and immutable, most often strings or numbers. Values can be anything.

```python
cat = {
    "name": "Zophie",
    "age": 7,
    "colour": "black",
}

print(cat["name"])   # Zophie
print(len(cat))      # 3
```

Reading a missing key raises `KeyError`. `get()` avoids that by returning a fallback instead:

```python
print(cat.get("weight"))          # None
print(cat.get("weight", 0))       # 0
```

`get()` never adds the key; it only answers the question. That distinction matters when you use it in a loop and expect the dictionary to grow — it will not.

A key must be hashable: strings, numbers, and tuples qualify; lists and dictionaries do not, because they can change. Using a list as a key raises `TypeError: unhashable type`.

## Adding, changing, deleting

Assigning to a key adds it if it is new and overwrites it if it exists. `del` removes a key and its value.

```python
cat["age"] = 8
cat["weight"] = 4.2
del cat["colour"]

print(cat)  # {'name': 'Zophie', 'age': 8, 'weight': 4.2}
```

`pop(key)` removes and returns the value, with an optional default that prevents the `KeyError`:

```python
weight = cat.pop("weight", None)
```

`in` tests keys, never values. `keys()`, `values()`, and `items()` give you views of the contents; `items()` yields `(key, value)` pairs, which is what you want in a loop.

```python
for key, value in cat.items():
    print(key, "=", value)
```

The views are live: they reflect changes made while iterating. Changing the dictionary's size during a loop raises `RuntimeError`, so collect the keys first with `list(cat.keys())` and loop over that.

## Counting with get

The most common dictionary pattern is a tally. `get()` with a default of zero makes it a single line:

```python
message = "the quick brown fox jumps over the lazy dog"
counts = {}

for word in message.split():
    counts[word] = counts.get(word, 0) + 1

print(counts["the"])  # 2
```

`collections.Counter` does the same thing in one call when you do not need the loop for anything else.

`setdefault()` is the other one-liner, for a dictionary of lists:

```python
by_initial = {}

for name in ["Ada", "Alan", "Grace"]:
    by_initial.setdefault(name[0], []).append(name)

print(by_initial)   # {'A': ['Ada', 'Alan'], 'G': ['Grace']}
```

It sets the key to `[]` only when it is absent, then returns the list — which is why the `append` works whether or not this is the first name with that initial.

A dictionary preserves insertion order, so iterating gives keys in the order they were added. That is guaranteed in modern Python and is why a dictionary is a fine substitute for an ordered record.

## Pretty-printing

`pprint` formats nested structures so a human can read them, which is invaluable when dumping a dictionary to a log:

```python
import pprint

data = {"users": [{"name": "Ada", "roles": ["admin"]}], "page": 1}
pprint.pprint(data, width=50)
```

Without it, a nested dictionary prints as one enormous line that wraps wherever the terminal ends. `pprint.pformat()` returns the string, which is what you want for a log message or a file.

`json.dumps(data, indent=2)` is the other formatting option, and it is the right one when the structure is JSON-compatible and you want to see it that way.

## Nesting

Values can be lists or dictionaries, which is how real data is shaped. Reach into it one key at a time.

```python
inventory = {
    "rope": {"count": 1, "weight": 1.5},
    "torch": {"count": 6, "weight": 0.5},
    "gold": {"count": 42, "weight": 0.1},
}

total_weight = 0
for item, details in inventory.items():
    total_weight += details["count"] * details["weight"]
    print(item, details["count"])

print("Total weight:", total_weight)
```

That is the shape of JSON, configuration files, and API responses: dictionaries of dictionaries, with lists where order matters.

The classic nested structure is a list of dictionaries, one per record:

```python
people = [
    {"name": "Ada", "hobbies": ["chess", "poetry"]},
    {"name": "Grace", "hobbies": ["sailing", "chess"]},
]

for person in people:
    if "chess" in person["hobbies"]:
        print(person["name"])
```

Two levels of indexing, one loop, no surprises. When the nesting gets deeper than three, the structure is probably wrong — or it is time for a small class.

## A project: a tic-tac-toe board

A board is a dictionary from position name to mark, and the win check is a list of lines.

```python
board = {
    "top-L": " ", "top-M": " ", "top-R": " ",
    "mid-L": " ", "mid-M": " ", "mid-R": " ",
    "bot-L": " ", "bot-M": " ", "bot-R": " ",
}

def show(board):
    print(board["top-L"] + "|" + board["top-M"] + "|" + board["top-R"])
    print("-+-+-")
    print(board["mid-L"] + "|" + board["mid-M"] + "|" + board["mid-R"])
    print("-+-+-")
    print(board["bot-L"] + "|" + board["bot-M"] + "|" + board["bot-R"])

lines = [
    ("top-L", "top-M", "top-R"),
    ("mid-L", "mid-M", "mid-R"),
    ("bot-L", "bot-M", "bot-R"),
    ("top-L", "mid-L", "bot-L"),
    ("top-M", "mid-M", "bot-M"),
    ("top-R", "mid-R", "bot-R"),
    ("top-L", "mid-M", "bot-R"),
    ("top-R", "mid-M", "bot-L"),
]

def winner(board, mark):
    return any(all(board[spot] == mark for spot in line) for line in lines)

board["mid-M"] = "X"
show(board)
print(winner(board, "X"))   # False
```

The board could be a list of nine cells, and the whole program would be shorter. The dictionary earns its place when positions are named and the code reads like the game.

## Validating a structure

When a dictionary arrives from a file or a form, check its shape before using it. A missing key found at the point of use is a bug a long way from its cause.

```python
def require(config, *keys):
    for key in keys:
        if key not in config:
            raise ValueError(f"missing {key!r} in config")
```

For data that is nested and optional, `get()` chains are the pragmatic tool: `config.get("db", {}).get("host", "localhost")`. For anything larger, a schema library is worth the dependency.

## Copying and merging

`=` gives a dictionary a second name, not a second dictionary. `copy()` makes a new outer dictionary, and `|` or `update()` merges one into another.

```python
base = {"host": "localhost", "port": 8000}
overrides = {"port": 9000, "debug": True}

settings = base | overrides
print(settings)   # {'host': 'localhost', 'port': 9000, 'debug': True}
print(base)       # unchanged
```

`|` produces a new dictionary and the right side wins on duplicate keys. `base |= overrides` updates `base` in place; `base.update(overrides)` does the same thing with a method. All three leave `overrides` alone.

The shallow copy matters exactly as it does with lists:

```python
config = {"jobs": {"retries": 3}}
copy = config.copy()
copy["jobs"]["retries"] = 5
print(config["jobs"]["retries"])   # 5 — the inner dict is shared
```

`copy.deepcopy()` is the fix when the structure is nested. For a two-level settings dictionary, the better fix is often to keep values immutable: numbers, strings, and tuples cannot surprise you this way.

`fromkeys()` builds a dictionary from a list of keys, and it shares one value between all of them:

```python
scores = dict.fromkeys(["ada", "grace"], 0)
print(scores)   # {'ada': 0, 'grace': 0}

broken = dict.fromkeys(["ada", "grace"], [])
broken["ada"].append(1)
print(broken)   # both lists are the same object
```

That second example is the mutable-default trap again. Use a comprehension — `{name: [] for name in names}` — whenever the value is mutable.

## Counting with Counter

`collections.Counter` is a dictionary specialised for tallies, and it removes the most repeated four lines in data work.

```python
from collections import Counter

words = "the quick brown fox jumps over the lazy dog the end".split()
counts = Counter(words)

print(counts["the"])          # 3
print(counts.most_common(2))  # [('the', 3), ('quick', 1)]
```

A missing key returns zero instead of raising `KeyError`, which is the whole point. `most_common()` sorts by count descending, and ties keep the order they were first seen.

Counters add and subtract, which makes them useful for comparing two collections:

```python
before = Counter("aab")
after = Counter("abbc")

print(after - before)   # Counter({'b': 1, 'c': 1})
print(before + after)   # combined counts
print(before & after)   # the smaller count of each key
```

Subtraction drops zero and negative results, so `after - before` answers "what is new", not "what changed". For a signed difference, use a plain dictionary and subtract values yourself.

For text, `Counter` counts characters or words; for records, count a field:

```python
rows = [{"city": "Oslo"}, {"city": "Bergen"}, {"city": "Oslo"}]
print(Counter(row["city"] for row in rows).most_common())
```

That generator expression is the pattern to remember: feed `Counter` the thing you want counted, not the container it lives in.

## Try it

- Count how many times each letter appears in a sentence, ignoring spaces.
- Merge two dictionaries, letting the second win on duplicate keys.
- Store three people, each with a name and a list of hobbies, then print everyone who lists `"chess"`.
- Build an index of words to the line numbers they appear on, using `setdefault`.
- Add a `total` key to every inner dictionary of an inventory and pretty-print the result.
