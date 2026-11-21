---
title: Functions
---

Copying code is how small scripts become unmaintainable. A function gives a piece of behaviour a name, so you can call it from anywhere and change it in one place.

## Defining and calling

```python
def greet():
    print("Hello.")

greet()
greet()
```

`def` creates the function; the call is what runs it. Nothing inside the body executes until you call it. The indented block is the body.

A definition is a statement like any other: it runs top to bottom, and calling a function before its `def` has executed raises `NameError`. That is why definitions usually sit above the code that uses them, and why a script with a `main()` call at the bottom works.

## Parameters and arguments

Parameters are the names in the definition. Arguments are the values you pass in. A value passed in is bound to the parameter name for that call only.

```python
def greet(name):
    print("Hello, " + name + ".")

greet("Ada")
greet("Grace")
```

The names are separate: `greet(name="Ada")` passes the same value as `greet("Ada")`. Positional and keyword arguments can be mixed, as long as positional ones come first.

Too few arguments raise `TypeError`, and so do too many — with a message that states how many were expected and how many arrived, which is often enough to spot the missing one.

Defaults make a parameter optional. Arguments with defaults go last, and you can pass any argument by name:

```python
def greet(name, punctuation="!"):
    print("Hello, " + name + punctuation)

greet("Ada")
greet("Ada", punctuation=".")
```

A default is evaluated once, when the function is defined — a classic trap with mutable defaults:

```python
def add_item(item, items=[]):   # wrong
    items.append(item)
    return items

print(add_item("a"))   # ['a']
print(add_item("b"))   # ['a', 'b']
```

The list is shared across calls. The fix is `items=None` and `if items is None: items = []`. Any experienced reader will recognise the pattern.

`*args` collects extra positional arguments into a tuple; `**kwargs` collects extra keyword arguments into a dictionary. They are for wrappers and flexible APIs, not for everyday functions:

```python
def total(*numbers):
    return sum(numbers)

print(total(1, 2, 3))   # 6
```

## Return values

`print()` shows a value. `return` hands it back to the caller so it can be stored, compared, or passed onward. A function without `return` returns `None`.

```python
def days_alive(years):
    return years * 365

total = days_alive(30)
print(total + 1)
```

`return` ends the function immediately. Everything after it in that call is skipped, which is often exactly what you want:

```python
def absolute(number):
    if number < 0:
        return -number
    return number
```

`return` with no value returns `None`, and so does falling off the end of the function. `None` is a value, not an error: printing it shows `None`, and adding it to a number raises `TypeError`. That error is a useful signal that a function you expected to return something returned nothing.

A function can return several values by returning a tuple, which the caller can unpack:

```python
def bounds(numbers):
    return min(numbers), max(numbers)

low, high = bounds([4, 9, 2])
```

## Scope

Names created inside a function are local. They exist while the function runs and vanish afterwards. Names outside are readable from inside, but modifying them requires `global` — and needing `global` is usually a sign that the value should be passed in and returned instead.

```python
counter = 0

def increment():
    global counter
    counter = counter + 1

increment()
print(counter)  # 1
```

Without `global`, `counter = counter + 1` inside the function raises `UnboundLocalError`, because the assignment makes `counter` local for the whole function and the read happens before any value is assigned.

Prefer the version without `global`. It is easier to test and impossible to break from a distance.

```python
def incremented(value):
    return value + 1

counter = incremented(counter)
```

Python resolves names with the local scope first, then enclosing functions, then the module, then the built-ins. That order is why a local variable named `list` shadows the built-in only inside its function, and why shadowing one is a bad idea anyway.

## Errors in functions

A function should either do what it promises or fail loudly. Returning `0` for "I could not compute this" is how a wrong answer travels through a program unnoticed.

```python
def average(values):
    if not values:
        raise ValueError("average() needs at least one value")
    return sum(values) / len(values)
```

Raising is not impolite; it is the function telling the truth. The caller can catch it, log it, or let the program stop with a message that names the problem.

## Exception handling

`try` runs code that might fail. `except` handles a specific exception.

```python
def read_number(prompt):
    while True:
        answer = input(prompt)
        try:
            return int(answer)
        except ValueError:
            print("that is not a whole number, try again")
```

The loop is the important part: the failure is expected, so the function asks again instead of crashing. `except ValueError` catches only the conversion problem; a `KeyboardInterrupt` still stops the program, which is what a user pressing `Ctrl-C` intends.

Catch the narrowest exception that describes what you expect. `except:` catches everything, including typos inside your own function, and turns a clear crash into silent wrong behaviour.

`finally` runs whether or not an exception occurred, which is the place for cleanup:

```python
def load(path):
    handle = open(path, encoding="utf-8")
    try:
        return handle.read()
    finally:
        handle.close()
```

That is what `with open(path) as handle:` does in one line, and it is why `with` is the better habit.

## A worked function

```python
def collatz(number):
    if number % 2 == 0:
        return number // 2
    return 3 * number + 1

value = int(input("Number: "))

while value != 1:
    value = collatz(value)
    print(value)
```

The loop stops at 1 for every starting value anyone has tried. Nobody has proved it always will; that is the Collatz conjecture, and it is a pleasant thing to think about while your terminal fills with numbers.

## Functions that take functions

Because functions are values, you can pass one to another. This is the cleanest way to write a rule once and reuse it:

```python
def apply_twice(function, value):
    return function(function(value))

print(apply_twice(collatz, 6))  # 2
```

`sorted(items, key=len)` is the same idea in the standard library: the sort is written once, and you supply the rule.

## Print's hidden arguments

`print()` is a function with keyword parameters, which is why it can be configured:

```python
print("a", "b", sep="-", end="!\n")
print(*["x", "y"], sep=",")
```

The `*` unpacks a list into separate arguments. It is the same mechanism as `*args`, used from the other side.

## Recursion

A function that calls itself is recursive. Every recursive function needs two parts: a base case that returns without recursing, and a step that moves toward it. Miss the base case and Python stops you with `RecursionError` after about a thousand calls.

```python
def factorial(number):
    if number <= 1:          # base case
        return 1
    return number * factorial(number - 1)

print(factorial(5))   # 120
```

Each call gets its own parameters and its own local names, stacked until the base case returns and the results unwind. That stack is the cost: a recursive solution to a problem with a million steps will not run, while the loop version will.

Recursion reads best when the data is nested. Walking a directory tree, or a JSON document of unknown depth, is clearer recursively than with an explicit stack:

```python
def total(nodes):
    if isinstance(nodes, int):
        return nodes
    return sum(total(node) for node in nodes)

print(total([1, [2, [3, 4]], 5]))   # 15
```

If the recursion is really a loop in disguise — counting down, summing a list, walking a flat sequence — write the loop. It is faster, it does not risk the stack, and it is easier to add a `break` to later.

## Describing a function

A docstring is the first statement in the body, written in triple quotes. It is what `help()` shows and what an editor displays when you hover over the call.

```python
def average(values):
    """Return the mean of a non-empty sequence of numbers."""
    if not values:
        raise ValueError("average() needs at least one value")
    return sum(values) / len(values)
```

One line is usually enough: what goes in, what comes out, and any exception a caller should expect. Repeating the parameter names in prose adds nothing.

Annotations record expected types without enforcing them:

```python
def average(values: list[float]) -> float:
    return sum(values) / len(values)
```

Python does not check them at runtime; `average(["a"])` still fails at the division, not at the call. Their value is for the reader and for tools: an editor can warn about an obvious mismatch, and a type checker can prove a whole file consistent before it ever runs.

A function's signature is its contract, so keep it honest. If a function needs six parameters, three of which are always passed together, that trio wants to be a dictionary or a small class. If a boolean parameter changes which half of the body runs, two functions would be clearer than one with a switch inside.

## Try it

- Write `is_even(number)` that returns a boolean without printing anything.
- Write `fizz(number)` returning `"Fizz"`, `"Buzz"`, `"FizzBuzz"`, or the number as a string.
- Write `area(width, height=1)` and call it both ways.
- Write `ask_number(prompt)` that loops until the input converts, then returns the integer.
- Write a function that takes a list and returns its average, raising `ValueError` on an empty list.
