---
title: Flow Control
---

Straight-line code runs once and stops. Real programs decide, repeat, and quit early. That is flow control, and it rests on one small idea: a condition is either true or false, and Python will only run the block you point it at.

## Booleans

`True` and `False` are values, spelled with capital letters. Comparison operators produce them.

```python
>>> 42 == 42
True
>>> 42 != 42
False
>>> 10 > 3
True
>>> "a" < "b"
True
```

`==` compares; `=` assigns. Mixing them up produces either a `SyntaxError` or a condition that is always true, and both are worth recognising on sight.

Strings compare alphabetically by character code, so uppercase sorts before lowercase: `"Z" < "a"` is `True`. Numbers and strings never compare equal, and `<` between them raises `TypeError` rather than guessing.

Every value has a truthiness. `0`, `0.0`, `""`, `[]`, `{}`, `None`, and `False` are falsy; almost everything else is truthy. That is why `if items:` is the idiomatic test for a non-empty list.

```python
name = ""
if name:
    print("hello", name)
else:
    print("no name given")
```

Combine conditions with `and`, `or`, and `not`. `and` needs both sides true, `or` needs one, `not` flips a single value. Comparison chains read naturally in Python:

```python
age = 17
print(age >= 13 and age < 20)  # True
print(not age == 17)           # False
```

`and` and `or` short-circuit: the right side is not evaluated when the left already decides. That is what makes `if items and items[0] == "x":` safe — the index is never reached for an empty list.

Python also allows the chain `13 <= age < 20`, which means exactly what it says and evaluates `age` once.

## Blocks and indentation

Python uses indentation to define a block. Four spaces, consistently, and the block ends when the indentation drops back. There are no braces to forget, but a stray space is a syntax error.

```python
password = "swordfish"

if password == "swordfish":
    print("Access granted.")
else:
    print("Access denied.")
```

Tabs and spaces look identical and are not. Configure the editor to insert spaces for Tab and the problem never appears; mix them once and Python raises `TabError` with a message that is unusually clear about it.

`if` runs its block when the condition is true. `else` runs when it is not. `elif` adds another test without nesting, and the first true branch wins:

```python
score = 78

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(grade)  # C
```

Order matters. Put `score >= 70` first and every score above 70 becomes a C, because the first match wins and the rest are skipped. The branches should be arranged from most specific to least.

An `if` with no `else` is fine; nothing happens when the condition is false. A block cannot be empty, so use `pass` as a placeholder while you are sketching:

```python
if not ready:
    pass   # TODO: handle the retry
```

## while loops

`while` repeats a block as long as its condition holds. Every pass must move the program toward the exit, or it runs forever — interrupt it with `Ctrl-C`.

```python
total = 0
number = 1

while number <= 100:
    total = total + number
    number = number + 1

print(total)  # 5050
```

The usual bug is forgetting the increment. The second usual bug is incrementing in a branch that does not always run, which produces a loop that hangs only for some inputs.

A `while True:` loop with a `break` is clearer when the exit condition is in the middle:

```python
while True:
    answer = input("Type 'quit' to stop: ")
    if answer == "quit":
        break
    print("you typed", answer)
```

`break` leaves the loop immediately. `continue` skips to the next pass. Both are useful, and both make a loop harder to read, so prefer a clear condition when one will do.

## for loops and range

`for` repeats once per item in a sequence. `range()` produces numbers on demand: `range(5)` is 0 to 4, `range(2, 6)` is 2 to 5, and `range(10, 0, -2)` counts down by twos.

```python
for i in range(3):
    print("attempt", i + 1)
```

`range()` stops before its end value. That off-by-one is deliberate, and it is the reason `range(len(items))` covers every index of a list.

`range()` is lazy: it does not build a list, it yields numbers one at a time. `list(range(5))` materialises it when you want to see it, and for a loop you never need to.

The loop variable survives the loop, holding the last value. That is occasionally useful and more often a source of confusion when the loop ran zero times:

```python
for item in []:
    pass

# print(item) would raise NameError
```

## Importing modules

The standard library is a set of modules you import. `import random` puts the module in a name; `from random import randint` puts one function in a name.

```python
import random
import sys

print(random.randint(1, 6))
```

Imports go at the top of the file, one per line, in the order: standard library, third-party, your own. That ordering is a convention, and it makes a file's dependencies readable at a glance.

`sys.exit()` ends the program immediately, with an optional status. Zero means success; anything else means failure and is visible to whatever started the script.

```python
import sys

if len(sys.argv) < 2:
    print("usage: script.py FILE")
    sys.exit(1)
```

## Putting it together

```python
import random

secret = random.randint(1, 20)

for attempt in range(1, 6):
    guess = int(input("Guess a number from 1 to 20: "))

    if guess < secret:
        print("Higher.")
    elif guess > secret:
        print("Lower.")
    else:
        print("Got it in", attempt, "tries.")
        break
else:
    print("Out of tries. The number was", secret)
```

That final `else` belongs to the `for`, not to an `if`: it runs only when the loop finished without hitting `break`. It is a neat trick, and a good reminder that indentation is structure.

The program also has a real flaw worth noticing: `int(input(...))` crashes on anything that is not a number. A `try` around the conversion, or a loop that keeps asking, is the fix — and that is a topic for the next chapter.

## Nested loops

A loop inside a loop runs the inner one completely for every pass of the outer one. That multiplication is the source of most slow scripts that look innocent.

```python
for row in range(1, 4):
    line = ""
    for column in range(1, 4):
        line += f"{row * column:3}"
    print(line)
```

```plaintext
  1  2  3
  2  4  6
  3  6  9
```

Three passes of the outer loop, three of the inner: nine total. Ten by ten is a hundred, and a thousand by a thousand is a million, which is why a nested loop over real data needs a moment's thought before you write it.

`break` leaves only the loop it is inside. To stop both, use a flag or a function that returns:

```python
def find(board, mark):
    for row in board:
        for cell in row:
            if cell == mark:
                return True
    return False
```

`continue` skips the rest of the current pass. In a nested loop it affects the inner loop only, which is easy to forget when a `continue` sits three indents deep.

The loop variable of the inner loop is reassigned on every pass, so do not read it after the loop and expect anything meaningful. If you need a value out of a loop, assign it to a name declared before the loop.

## Random choices

`random` produces pseudo-random numbers: a deterministic sequence that looks unpredictable and can be reproduced from a seed.

```python
import random

random.seed(42)                 # optional: makes the run repeatable
print(random.randint(1, 6))     # whole number, both ends included
print(random.random())          # float from 0.0 up to 1.0
print(random.choice(["yes", "no", "maybe"]))
print(random.sample(range(1, 50), 6))   # six distinct numbers
```

`randint(a, b)` includes both ends, unlike `range`. `randrange(a, b)` stops before `b` and takes a step, so `randrange(0, 100, 5)` gives multiples of five. `shuffle()` reorders a list in place and returns `None`:

```python
cards = ["A", "K", "Q", "J"]
random.shuffle(cards)
print(cards)
```

Seeding is for tests and demonstrations, not for production. A fixed seed makes a bug reproducible; leaving the seed alone means every run differs. For passwords, tokens, and anything security-shaped, use `secrets` instead — `random` is predictable enough to be guessed by someone who knows the seed.

A loop that keeps choosing until it hits a particular value is a legitimate pattern but needs a limit, because a typo in the condition produces an infinite loop that looks like a frozen terminal:

```python
for _ in range(1000):
    roll = random.randint(1, 6)
    if roll == 6:
        print("six after", _ + 1, "rolls")
        break
else:
    print("no six in a thousand rolls")
```

That `else` runs only when the loop never broke, which is exactly the "give up" branch you want.

## Doubts worth settling

**What counts as true?** Empty things are false: `0`, `0.0`, `""`, `[]`, `{}`, `None`, and `False`.
Everything else is true, including the string `"False"` and the list `[0]`. That surprises people
every time. When a condition feels wrong, print the value itself, not just the branch it took.

**Why is `while` stuck forever?** Something inside the loop must move the condition toward false.
If the loop body changes nothing the condition reads, the loop repeats exactly as before. Add a
`print` of the counter at the top of the body once; if it never changes, you have found the bug.

**Does `else` belong to `if` only?** No — `for` and `while` can have an `else` that runs only when
the loop finishes without `break`. It is the clean way to say "searched everything, found nothing":

```python
for guess in guesses:
    if guess == secret:
        print("found")
        break
else:
    print("not in the list")
```

**When should I use `break` instead of a flag?** A flag keeps the loop readable when there is work
after the match; `break` stops immediately. Both are correct. The mistake is `break` inside a
nested loop expecting it to leave both — it leaves only the inner one.

**Why does comparing numbers to text fail silently?** `"10" < "9"` is true, because text is
compared character by character and `"1"` comes before `"9"`. Convert with `int(...)` before
comparing anything that came from a file or from `input`.

**Is `range(1, 5)` one to five?** It is 1, 2, 3, 4. The stop value is never included, which is why
`range(n)` pairs so neatly with indices `0 .. n-1`. For a countdown, step backwards:
`range(5, 0, -1)`.

## A slow read of one script

```python
attempts = 0
while attempts < 3:
    answer = input("Guess a number 1-10: ").strip()
    if not answer.isdigit():
        print("Digits only")
        continue
    if int(answer) == 7:
        print("Right")
        break
    attempts += 1
else:
    print("Out of tries")
```

Read the guard clauses in order. The loop condition caps the tries. The `isdigit` check runs before
`int`, so `int` can never see text it would choke on. `continue` skips the rest of the body, which
keeps a bad entry from using up an attempt — decide deliberately whether it should. `break` exits
when the guess is right, and because it does, the `else` is skipped. Only three wrong guesses reach
the `else`, and that is the exact sentence a reader wants there.

## Try it

- Print every number from 1 to 50 that is divisible by 3 but not by 5.
- Ask for a password three times, then stop asking whether or not it was correct.
- Write a loop that keeps doubling a number until it passes one million, then prints how many doublings it took.
- Print a triangle of stars whose height comes from `input()`.
- Write a `while` loop that reads words until `"stop"` and prints the longest one.
