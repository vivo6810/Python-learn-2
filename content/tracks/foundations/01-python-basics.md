---
title: Python Basics
---

A program is a list of instructions, and Python is unusually honest about that. You type an expression, Python evaluates it, and you see the result. Everything bigger — a script that renames a thousand files, a bot, a game — is built from that same loop.

This chapter is the vocabulary: values, operators, names, and the two functions that let a program talk to a person.

## Expressions and operators

Python ships with an interactive shell. Type `python` in a terminal (or open IDLE) and you get a `>>>` prompt. Whatever you type there is evaluated immediately.

```python
>>> 2 + 2
4
>>> 2 ** 8
256
>>> 22 % 8
6
>>> 22 // 8
2
>>> 22 / 8
2.75
```

The operators are ordinary arithmetic, with two twists. `**` is exponentiation, not xor. `//` is floor division, which throws away the remainder instead of giving you a fraction. `%` is the remainder itself.

`/` always produces a float, even when the division is exact: `4 / 2` is `2.0`, not `2`. That is deliberate, and it is why `//` exists for the cases where you want an integer.

Precedence follows mathematics: `**` first, then `*`, `/`, `//`, `%` from left to right, then `+` and `-`. Parentheses override everything, so use them whenever the line would need a second read.

```python
>>> 2 + 3 * 6
20
>>> (2 + 3) * 6
30
>>> (5 - 1) * ((7 + 1) / (3 - 1))
16.0
```

`**` groups to the right: `2 ** 3 ** 2` is `2 ** 9`, or 512, not 64. It is the one operator where the usual left-to-right reading is wrong, and a good reason to add parentheses in anything you will read twice.

## Values and types

Every value has a type. The three you will meet first are integers, floating-point numbers, and strings.

```python
>>> type(2)
<class 'int'>
>>> type(2.0)
<class 'float'>
>>> type("2")
<class 'str'>
```

An integer has no size limit in Python; it grows as needed. A float is a 64-bit approximation, which is why `0.1 + 0.2` prints `0.30000000000000004`. For money, work in cents or use `decimal.Decimal`; for everything else, the imprecision is far below what matters.

A string is text inside quotes — single or double, whichever keeps the line readable. `len()` counts its characters.

```python
>>> len("hello")
5
>>> len("")
0
>>> len("hello world")
11
```

The space counts. That sounds obvious until a form field arrives with three trailing spaces and a comparison fails.

`str()`, `int()`, and `float()` convert between types, which matters constantly because `input()` always hands you a string.

```python
>>> int("42") + 1
43
>>> str(42) + "1"
'421'
>>> float("3.5") * 2
7.0
```

`int("3.5")` raises `ValueError`; convert to float first if decimals are possible. `int(3.9)` truncates toward zero rather than rounding, so `int(3.9)` is `3` and `int(-3.9)` is `-3`. Use `round()` when you want rounding.

## Strings, joined and repeated

Strings combine with `+` and repeat with `*`. Note that `"4" + "2"` is `"42"`: joining text is not the same as adding numbers.

```python
>>> "Alice" + "Bob"
'AliceBob'
>>> "Hello" * 3
'HelloHelloHello'
>>> "Hello" + 3
TypeError: can only concatenate str (not "int") to str
```

That `TypeError` is the most common beginner error, and the fix is `str(3)`. The message is precise: it names both types and the operation, which is more than most languages manage.

## Names

A name stores a value. `=` assigns, and the name keeps pointing at whatever you last gave it.

```python
spam = 42
spam = spam + 1
print(spam)  # 43
```

The right side is evaluated first, then bound to the name. That is why `spam = spam + 1` is not circular: it reads the old value, adds one, and rebinds.

Names are case-sensitive, cannot contain spaces, cannot start with a digit, and cannot be one of Python's reserved words. `my_name`, `myName`, and `MY_NAME` are all fine; pick one style and keep it. Snake case is the Python convention.

You can assign several names at once, and it is legal (if rarely useful) to swap two values without a temporary variable:

```python
a, b = 1, 2
a, b = b, a
print(a, b)  # 2 1
```

The swap works because the right side is a tuple built before any assignment happens. The same trick unpacks a pair returned by a function.

A name that has never been assigned raises `NameError`. The message names the missing variable, and nine times out of ten the cause is a typo or a variable defined inside a function you are trying to use outside it.

## Comments

A `#` starts a comment, and everything after it on the line is ignored.

```python
# price in cents, to avoid float rounding
price = 1299
```

Comments explain why, not what. `# add one to spam` above `spam = spam + 1` is noise; `# the API counts from one` above an index adjustment is a gift to the next reader.

## Printing

`print()` writes to the screen. Give it several values separated by commas and it inserts a space between them.

```python
print("Hello", "world")          # Hello world
print("a", "b", sep="-")         # a-b
print("no newline", end="")      # stays on the line
print(42, 3.5, True)             # 42 3.5 True
```

`sep` and `end` are keyword arguments with defaults of `" "` and `"\n"`. They are the whole formatting system for simple output; f-strings handle the rest.

Printing an expression you have not stored is a legitimate way to inspect it:

```python
print(2 + 2, "is four")
```

The commas accept any values and convert them for display, which is why `print` never raises a `TypeError` for mixing types the way `+` does.

## Reading input

`input()` reads a line and always returns a string, even when the line contains digits. Convert it before doing arithmetic.

```python
name = input("Name: ")
age = int(input("Age: "))
print("Hello, " + name + ".")
print("You have been alive for roughly " + str(age * 365) + " days.")
```

The prompt is printed to the same line, with no newline, which is why the user types after the colon rather than below it. `input()` blocks until Enter is pressed; there is no timeout and no way to read a single key without extra libraries.

An empty answer is `""`, and `int("")` raises `ValueError`. If the number matters, check before converting:

```python
answer = input("Age: ").strip()
if answer.isdigit():
    age = int(answer)
else:
    print("that is not a number")
```

Running that program twice with different answers is the whole idea of a program: same code, different data.

## Errors are normal

Three kinds appear constantly at this stage:

- `SyntaxError` — the line is not valid Python. A missing quote or bracket, usually, and the caret points at where the parser gave up, which is often just after the real mistake.
- `NameError` — a name that was never assigned, or assigned in a different scope.
- `ValueError` — the right type, impossible value: `int("hello")`.

Read the last line first, then the line number. The traceback is not a scolding; it is the most specific bug report you will get all day.

## The shell, the file, the script

The `>>>` prompt is for testing one line at a time. Anything you want to keep goes in a file ending `.py`, and you run it with `python`:

```bash
python hello.py
```

There is no compile step and no project file. A text file and an interpreter are the whole toolchain. Save the file, run it, read the output, edit it.

Two things about running a file are worth knowing immediately. First, the **working directory** matters: a relative path like `data.txt` is resolved from where you typed the command, not from where the script lives. Second, a script does nothing visible until it prints something, so a file that runs cleanly and shows nothing is usually working exactly as written.

```python
# hello.py
name = input("Name: ")
print(f"Hello, {name}.")
```

The same script can start with a shebang, which lets a Unix system run it directly:

```python
#!/usr/bin/env python3
```

Mark the file executable (`chmod +x hello.py`) and `./hello.py` works. The line is a comment to Python and an instruction to the shell.

When a script grows, put the work in functions and add this at the bottom:

```python
def main():
    print("work happens here")

if __name__ == "__main__":
    main()
```

`__name__` is `"__main__"` when the file was run directly and the module's name when it was imported. The guard means importing the file for testing does not start the program.

To see how a script ended, check its exit code. `sys.exit(1)` reports failure; success is zero. Shells, schedulers, and CI systems read that number, and ignoring it is how a broken job looks green.

## Numbers worth knowing about

`/` gives a float, `//` floors, and `%` keeps the remainder. The last two are more useful together than apart:

```python
>>> divmod(22, 8)
(2, 6)
>>> hours, minutes = divmod(137, 60)
>>> print(hours, minutes)
2 17
```

`divmod` computes both at once, which is how you turn a duration into hours and minutes without doing the same division twice.

`//` rounds toward negative infinity, not toward zero. `-7 // 2` is `-4`, and `-7 % 2` is `1`, because Python keeps the sign of the divisor. That is consistent and occasionally surprising when you port code from a language that truncates.

`round()` rounds to the nearest even number when a value sits exactly halfway, so `round(2.5)` is `2` and `round(3.5)` is `4`. That is not a bug; it avoids bias when rounding many values. Pass a second argument to round to decimal places:

```python
>>> round(3.14159, 2)
3.14
>>> round(1299 / 100, 2)
12.99
```

`abs()` returns a distance from zero, and the `math` module adds the rest of the toolbox:

```python
import math

print(math.floor(3.9))   # 3
print(math.ceil(3.1))    # 4
print(math.sqrt(81))     # 9.0
print(math.pi)           # 3.141592653589793
```

`math.floor` and `//` agree for positive numbers and differ in type: `floor` returns an integer, `//` a float when one side is a float.

Large integers are exact, floats are not. A price stored as `0.1 + 0.2` will not compare equal to `0.3`, and a loop that adds `0.1` a hundred times will not land on ten exactly. Keep money in whole cents (`price_cents = 1299`) or use `decimal.Decimal` when fractions of a cent are real. For display, never rely on `print` alone:

```python
print(f"{12.9:.2f}")     # 12.90
print(f"{1234567:,}")     # 1,234,567
```

Those format specifiers round and group at print time, leaving the stored value untouched — the right division of labour between arithmetic and presentation.

## A first real program, end to end

Vocabulary only goes so far. Here is a complete, small program that uses almost everything from
this chapter, followed by a reading of it line by line.

```python
# unit.py: converts kilometres to miles
km = float(input("Kilometres: "))
miles = km * 0.621371
print(f"{km:.1f} km is {miles:.2f} miles")
```

Every line earns its place. The comment says what the file is for, which is the only comment a
file needs at the top. `input()` returns text, so `float()` does the conversion before any
arithmetic can misfire — enter `ten` and the traceback points at this exact line. The multiplier
`0.621371` converts kilometres to miles. The f-string keeps the output tidy: one decimal for the
input, two for the result.

Now make it honest. Input from a person can be empty, negative, or not a number at all, and a
program that crashes on the first typo is not finished, it is a prototype:

```python
def to_float(text):
    try:
        return float(text)
    except ValueError:
        return None

raw = input("Kilometres (blank to quit): ").strip()
while raw:
    km = to_float(raw)
    if km is None:
        print("That is not a number; try again.")
    else:
        print(f"{km:.1f} km is {km * 0.621371:.2f} miles")
    raw = input("Kilometres (blank to quit): ").strip()

print("done")
```

`try`/`except` is the subject of a later chapter, but even in outline it reads like what it does:
*try* to change the text into a float, and *if that fails*, return `None` instead of blowing up.
The `while` loop turns a one-shot conversion into a tool the user can use repeatedly, and the blank
answer gives them a way out. The `done` at the end proves the loop ended and the program did not
die silently.

Three habits in that short program matter more than any single construct: convert input at the
boundary, handle the bad case explicitly, and print something unmistakable when the program ends.
Everything else in this course is a bigger version of the same skeleton.

## Doubts worth settling

**Does `x = 5` mean x equals five?** No. It means the name `x` points at the number 5. A second
`x = 7` does not change the 5, it moves the label. If something else was pointing at 5, it still
is.

**Why does `print("5")` show `5` while `print(5)` also shows `5`?** They look alike on screen but
are different things. `"5"` is text, so `"5" + "5"` gives `"55"`. The number 5 is arithmetic, so
`5 + 5` gives `10`. When a result puzzles you, check `type(...)` before anything else.

**What is `None`?** The value that means "nothing here". Functions that only print return `None`.
It is not `0`, not `""`, and it is not an error — but `None + 1` is, because you cannot add to
nothing.

**Why does an indentation error appear on a line that looks fine?** Python reads indentation as
structure, so a stray space at the start of a line is a statement about where that line belongs.
Ask your editor to show whitespace once, and pick four spaces forever.

**Why does `input("Age: ") + 1` fail?** `input` always returns text, even when the text looks like
a number. Convert first: `int(input("Age: "))`. If the person types `twenty`, you get a
`ValueError`, which is the next chapter's problem and the reason real scripts check their input.

**Is `/` different from `//`?** `/` is division and produces a float: `7 / 2` is `3.5`. `//` throws
away the remainder: `7 // 2` is `3`. The `%` operator gives you the remainder itself,
`7 % 2` is `1`. Those three together cover almost every counting problem you will meet.

## A slow read of one script

```python
name = input("Your name: ").strip()
celsius = float(input("Temperature in C: "))
fahrenheit = celsius * 9 / 5 + 32
print(f"{name}, it is {fahrenheit:.1f} F")
```

Line one asks for a name and strips the spaces someone types out of habit. Line two converts the
answer to a float immediately, before it can be used by mistake as text. Line three applies the
formula in the order Python would anyway — multiply, divide, add — so the parentheses are optional
and the meaning is unambiguous. Line four is an f-string: the `:.1f` inside the braces means "one
digit after the point", which keeps `62.60000000000001` from reaching the reader.

Now break it on purpose. Give a name with trailing spaces and see `.strip()` remove them. Enter
`ten` as the temperature and read the traceback from the bottom up: the last line names the error,
the line above it names your line. Enter `-40` and check both scales agree, which is the cheapest
proof that a formula is right.

## Try it

- Evaluate `2 ** 3 ** 2` and explain the result. Then force the other grouping with parentheses.
- Ask for two numbers and print their sum, difference, product, and remainder.
- Ask for a temperature in Celsius, convert it to Fahrenheit, and print the sentence `21C is 69.8F`.
- Print a receipt with items aligned in a column using `sep` and `end`, then again with f-strings.
- Write a line that raises `NameError`, read the message, and fix it.
- Extend the unit converter so it also answers miles to kilometres when asked (`m` for miles).
- Write a program that asks for three numbers and prints the largest, using `max()` with three arguments.
