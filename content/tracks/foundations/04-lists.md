---
title: Lists
---

One variable holds one value. A list holds a sequence of them, in order, and lets you work with the whole sequence at once. Almost every program that handles more than a handful of things uses a list.

## Creating and indexing

```python
cats = ["Zophie", "Pooka", "Fat-tail"]

print(cats[0])   # Zophie
print(cats[-1])  # Fat-tail
print(len(cats)) # 3
```

Indexes start at zero. Negative indexes count from the end, so `-1` is always the last item. Asking for an index past the end raises `IndexError`.

A list can hold mixed types, and nothing stops you: `[1, "two", 3.0, [4]]` is legal. That flexibility is useful for records and a nuisance when a function assumes every item is a number.

The brackets are the literal; `list()` converts any iterable:

```python
print(list("abc"))            # ['a', 'b', 'c']
print(list(range(3)))         # [0, 1, 2]
print(list((1, 2, 3)))        # [1, 2, 3]
```

## Slicing

Slicing copies a range. The start is included, the end is not:

```python
print(cats[0:2])  # ['Zophie', 'Pooka']
print(cats[:2])   # ['Zophie', 'Pooka']
print(cats[1:])   # ['Pooka', 'Fat-tail']
print(cats[:])    # a copy of the whole list
```

A step is a third value: `cats[::2]` takes every second item, and `cats[::-1]` is the idiomatic reverse. Out-of-range slice bounds are clamped rather than raising, which is why `cats[0:100]` is safe.

`cats[:]` is a shallow copy — a new list with the same items. For a flat list of strings or numbers, that is a real copy. For a list of lists, the inner lists are shared, which the last section of this chapter explains.

## Changing a list

Lists are mutable. Assign to an index to replace an item, use `append()` to add one, and `del` or `remove()` to take one away.

```python
cats[0] = "Zoe"
cats.append("Mittens")
del cats[1]
cats.remove("Mittens")
print(cats)  # ['Zoe', 'Fat-tail']
```

`remove()` deletes the first matching value and raises `ValueError` if the value is absent. `pop()` returns the item it removes. `insert()` puts one at a position.

```python
last = cats.pop()          # removes and returns the last
first = cats.pop(0)        # removes and returns the first
cats.insert(1, "Pooka")    # insert before index 1
```

`append()` adds one item; `extend()` adds every item of another iterable; `+` creates a new list instead of changing either one:

```python
a = [1, 2]
a.append([3, 4])   # [1, 2, [3, 4]]
a.extend([3, 4])   # [1, 2, [3, 4], 3, 4]

b = [1, 2] + [3]   # [1, 2, 3], a new list
```

## Searching

```python
print(3 in numbers)     # True
print(numbers.index(4)) # 2
print(numbers.count(1)) # 2
```

`in` tests membership with `==`, comparing each item in turn; for a long list that is linear time, which matters when it runs inside another loop. `index()` raises `ValueError` when the value is absent, so guard it:

```python
if "Pooka" in cats:
    print(cats.index("Pooka"))
```

## Sorting and reversing

```python
numbers = [3, 1, 4, 1, 5]
numbers.sort()
print(numbers)          # [1, 1, 3, 4, 5]

numbers.sort(reverse=True)
print(numbers)          # [5, 4, 3, 1, 1]

numbers.reverse()
print(numbers)          # back in place
```

`sort()` changes the list in place and returns `None` — assigning its result gives you nothing. Use `sorted()` when you want a new list and want to keep the original order.

Sorting strings is alphabetical by character code, so `"Z"` comes before `"a"`. `key=str.lower` sorts case-insensitively, and `key=` accepts any function:

```python
names = ["ada", "Grace", "alan"]
print(sorted(names, key=str.lower))   # ['ada', 'alan', 'Grace']
```

`sort()` on a list of mixed types raises `TypeError` in Python 3; convert everything to a comparable type first.

## Looping over a list

```python
supplies = ["pens", "staplers", "flamethrowers"]

for item in supplies:
    print(item.upper())

for index, item in enumerate(supplies, start=1):
    print(index, item)
```

`enumerate()` is better than `range(len(...))` because it hands you the item and its position together.

`zip()` walks two lists in step, stopping at the shorter:

```python
for name, count in zip(["pens", "tape"], [3, 1]):
    print(name, count)
```

Removing items while looping over the same list skips elements, because the indexes shift underneath you. Loop over a copy, or build a new list:

```python
kept = [item for item in supplies if item != "pens"]
```

## Lists inside lists

A list can contain lists, which is how you represent a grid or a table.

```python
grid = [
    [".", ".", "."],
    [".", "X", "."],
    [".", ".", "."],
]

grid[1][1] = "O"

for row in grid:
    print("".join(row))
```

The first index picks the row, the second the cell inside it. There are no columns as such; a column is the same index taken from every row.

## Copies are shallow

`=` does not copy a list; it makes a second name for the same list. Changing one changes both. `copy()` gives you a new outer list, but nested lists are still shared.

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)  # [1, 2, 3, 4]

c = a.copy()
c.append(5)
print(a)  # [1, 2, 3, 4]
```

The shallow part bites with nesting:

```python
grid = [[0, 0], [0, 0]]
copy = grid.copy()
copy[0][0] = 9
print(grid)   # [[9, 0], [0, 0]]
```

The inner list is the same object in both. Use `copy.deepcopy()` from the `copy` module when the structure is nested and you need a real duplicate.

This aliasing also shows up in arguments: a function that appends to a list parameter changes the caller's list. That is sometimes the point and often a surprise.

## Tuples and other sequences

A tuple is an immutable list, written with parentheses. It cannot be changed after creation, which makes it the right type for fixed records:

```python
point = (3, 4)
x, y = point
print(x, y)

# point[0] = 9 raises TypeError
```

A one-item tuple needs a trailing comma: `(3,)`. Without it, the parentheses are just grouping and you have an integer.

Strings are sequences too, with indexing, slicing, `in`, and `len` — everything except mutation. That shared behaviour is why `for char in word:` works without conversion.

## A program: the magic 8 ball

```python
import random

answers = [
    "It is certain.",
    "Without a doubt.",
    "Reply hazy, try again.",
    "Don't count on it.",
    "My sources say no.",
]

question = input("Ask a yes or no question: ")
print(answers[random.choice(range(len(answers)))])
```

`random.choice(answers)` does the same job in one call. The longer version is here to show that a list index is just an integer, and `random.choice` is `answers[random.randrange(len(answers))]` written once so you do not have to.

## Comprehensions

A list comprehension builds a list from a loop in one expression. The loop and the `append` are still happening; they are just implied.

```python
prices = [3, 5, 12]
doubled = [price * 2 for price in prices]
print(doubled)          # [6, 10, 24]

long_names = [name for name in ["ada", "grace", "alan"] if len(name) > 3]
print(long_names)       # ['grace', 'alan']
```

The part before `for` is the expression put into the new list. The optional `if` filters, and it runs before the expression, so the expression never sees a rejected item.

Transform and filter can be combined, and the result can be transformed again:

```python
words = ["  Ada ", "grace", "", "ALAN"]
clean = [word.strip().title() for word in words if word.strip()]
print(clean)   # ['Ada', 'Grace', 'Alan']
```

Nested comprehensions follow the order of the loops they replace, read left to right:

```python
rows = [[1, 2], [3, 4]]
flat = [cell for row in rows for cell in row]
print(flat)   # [1, 2, 3, 4]
```

That reads well at two levels. At three it becomes a puzzle, and the plain loop is clearer.

Comprehensions are for building a list, not for side effects. `[print(item) for item in items]` works and returns a list of `None`, and every reviewer will ask you to replace it with a `for` loop. Use a comprehension when you want the result; use a loop when you want the doing.

A related form builds a set or a dictionary:

```python
unique = {name.lower() for name in ["Ada", "ada", "ALAN"]}
squares = {n: n * n for n in range(4)}
print(unique)    # {'ada', 'alan'}
print(squares)   # {0: 0, 1: 1, 2: 4, 3: 9}
```

A set removes duplicates for free, which is often the actual goal.

## Built-ins that replace a loop

Many loops are a built-in trying to get out. `sum` totals numbers, and `min` and `max` pick an extreme:

```python
scores = [72, 91, 60]
print(sum(scores), len(scores), sum(scores) / len(scores))
print(min(scores), max(scores))
```

`min` and `max` accept `key=` like `sort`, which answers "which item is the longest" without a loop and without the item's length leaking into the result:

```python
names = ["ada", "grace", "alan"]
print(max(names, key=len))                 # grace
print(max(scores, default=None))           # safe on an empty list
```

Without `default`, `max([])` raises `ValueError`. That is the correct behaviour when an empty list means a bug, and the wrong behaviour when it means "nothing to do yet".

`any` and `all` collapse a list of conditions into one boolean:

```python
ages = [12, 15, 19]
print(any(age >= 18 for age in ages))   # True
print(all(age >= 18 for age in ages))   # False
```

The generator expression inside means the check stops at the first decisive value: `any` returns as soon as it finds `True`, `all` as soon as it finds `False`. Over ten thousand items that early exit is the difference between fast and slow.

`sorted` with a key sorts records by a field, and a tuple key sorts by several fields in order:

```python
people = [("Ada", 36), ("Grace", 45), ("Alan", 41)]
print(sorted(people, key=lambda person: person[1]))
print(sorted(people, key=lambda person: (-person[1], person[0])))
```

Negating a number is the quick way to reverse one field while keeping the rest ascending. Add `reverse=True` only when every field should flip.

## Try it

- Build a list of five names, print it in reverse without changing it, then sort it in place.
- Write a loop that prints the total of a list of prices and the average.
- Turn a grid of characters into a string with one row per line, then replace one cell and print it again.
- Shuffle a list with `random.shuffle`, deal it into two hands, and print both sorted.
- Show that `a = b` and `a = b.copy()` behave differently for a nested list.
