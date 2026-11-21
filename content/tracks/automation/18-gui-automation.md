---
title: Controlling the Keyboard and Mouse with GUI Automation
---

Some programs have no API. Their only interface is the one a person uses: a window, a button, a field. `pyautogui` drives that interface by moving the real pointer and sending real key presses, so a script can fill a form on a machine nobody is sitting at.

Use it on your own machine, on an account you control, and never against a service whose terms forbid automation. It is a hand, not a permission slip.

## Before the first click

```bash
pip install pyautogui
```

On macOS the script needs Accessibility and Screen Recording permission for the terminal or editor that runs it, granted in System Settings → Privacy & Security. Without them the mouse moves and the keys type into nothing, with no error. On Linux, Wayland sessions block synthetic input for most tools; an X11 session works.

```python
import pyautogui

print(pyautogui.size())       # (1920, 1080)
print(pyautogui.position())   # (812, 433)
```

Run that interactively first. It tells you the screen size and where the pointer is, which is the ground truth every coordinate in the rest of the script depends on. If `size()` returns a different number than you expected, the display is scaled, and every coordinate you measured in another program will be off.

## Coordinates and the screen

The screen is a grid with the origin at the top left. `x` grows right, `y` grows down.

Movement is absolute with `moveTo` or relative with `moveRel`. `duration` makes the movement take time, which matters: many interfaces only register a click at the end of a motion they can see.

```python
pyautogui.moveTo(100, 150, duration=0.25)
pyautogui.moveRel(0, 200, duration=0.25)
```

Both accept `tween`, a function that shapes the motion. The default is linear; `pyautogui.easeInOutQuad` accelerates and slows, which looks human and gives a slow interface more chances to notice the pointer.

```python
pyautogui.moveTo(100, 150, duration=0.5, tween=pyautogui.easeInOutQuad)
```

Negative coordinates are legal on a multi-monitor setup: a second screen to the left of the primary has negative `x`.

## Clicks, drags, scrolling

```python
pyautogui.click(300, 400)                  # left click
pyautogui.click(300, 400, button="right")
pyautogui.doubleClick(300, 400)
pyautogui.middleClick(300, 400)

pyautogui.dragTo(600, 400, duration=0.5, button="left")
pyautogui.dragRel(100, 0, duration=0.3)

pyautogui.scroll(600)        # up
pyautogui.scroll(-600)       # down
```

An argument-free `click()` clicks wherever the pointer already is, which is how you follow a `moveTo`. `click()` also takes `clicks=2` and `interval=0.1` instead of calling `doubleClick`.

`dragTo` presses at the current position, moves, and releases at the target. If the press lands on empty desktop instead of the window title bar, the drag does nothing — move first, then drag.

`scroll` takes a number of "clicks" of the wheel, and the direction is positive for up. How far one click scrolls depends on the system settings, so treat the number as a rough amount and verify visually.

## Pausing and the failsafe

Clicking too fast is the usual failure. `pyautogui.PAUSE = 0.5` inserts a pause after every action, and `pyautogui.FAILSAFE = True` — on by default — slams the brakes when the pointer reaches a screen corner, so you can rescue a runaway script by shoving the mouse into the top-left.

```python
pyautogui.PAUSE = 0.5
pyautogui.FAILSAFE = True

try:
    pyautogui.click(500, 500)
except pyautogui.FailSafeException:
    print("stopped by the failsafe")
```

The failsafe raises `FailSafeException` rather than exiting, which means a `try` around the whole run can log the step it died on. Keep the failsafe on. The one time it is tempting to turn it off — a click that legitimately aims at a corner — is a good sign the click needs to be relative to a located element instead.

`pyautogui.MINIMUM_DURATION` and `MINIMUM_SLEEP` set floors for movement time and pauses when a call does not specify one. They are a blunt instrument; per-call `duration` and `PAUSE` are easier to reason about.

## The keyboard

`write` types a string; `press` sends one key such as `"enter"`, `"tab"`, `"esc"`, `"f5"`, or an arrow. Hotkeys hold several keys at once.

```python
pyautogui.write("Hello, world.", interval=0.05)
pyautogui.press("enter")
pyautogui.hotkey("ctrl", "s")
pyautogui.hotkey("cmd", "shift", "4")
```

`interval` is the delay between characters. At the default of zero, some applications drop letters; 0.05 is a safe starting point and still fast enough to feel instant.

Key names are lowercase and mostly obvious: `enter`, `esc`, `tab`, `space`, `backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`, `up`, `down`, `left`, `right`, `f1` through `f12`. Modifiers are `ctrl`, `alt`, `shift`, `win`, `cmd`. The full list is in `pyautogui.KEYBOARD_KEYS`.

`press` can repeat: `press("tab", presses=5, interval=0.1)`. That is how you move through a form field by field without measuring coordinates.

`keyDown` and `keyUp` are the pieces underneath when you need to hold a modifier across several actions:

```python
pyautogui.keyDown("shift")
pyautogui.press("tab")
pyautogui.keyUp("shift")
```

Non-ASCII text is a trap: `write` is limited to the characters a keyboard can type. For anything else, copy it with `pyperclip` and paste with a hotkey.

```python
import pyperclip

pyperclip.copy("café crème")
pyautogui.hotkey("ctrl", "v")
```

The clipboard route also handles long strings much faster than typing them, and avoids a drop in a field that cannot keep up. It does overwrite whatever the user had copied, so restore it if that matters.

## Finding things on screen

Screen coordinates break when a window moves. Image recognition does not: a screenshot of a button can be located on the live screen, and the result is a box you can click in the middle of.

```python
import pyautogui

location = pyautogui.locateOnScreen("submit-button.png", confidence=0.9)
if location:
    pyautogui.click(pyautogui.center(location))
```

`locateOnScreen` returns a `Box(left, top, width, height)` or `None`. `center()` turns it into a point. `locateAllOnScreen` returns a generator of every match, which is how you click a column of identical checkboxes:

```python
for box in pyautogui.locateAllOnScreen("checkbox.png", confidence=0.95):
    pyautogui.click(pyautogui.center(box))
```

`confidence` requires the optional `opencv-python` package; without it the match must be exact, which breaks on any scaling or theme change. Even 0.9 will occasionally match the wrong thing, so keep the reference image small and distinctive — an icon plus two words, not a whole toolbar.

Take the reference screenshot on the same machine, at the same resolution and zoom, as the script will run. A screenshot taken on a Retina display is twice the pixel size of the same UI on an external monitor, and the match fails with no explanation.

`pyautogui.screenshot()` saves the current screen, which is also the easiest way to check what the script actually saw when it failed at 2am.

```python
shot = pyautogui.screenshot()
shot.save("failure.png")

# or a region, to speed up a search
region = (0, 0, 800, 600)
button = pyautogui.locateOnScreen("button.png", region=region, confidence=0.9)
```

A `region` restricts the search and returns coordinates relative to the whole screen, which is easy to get wrong when adding offsets by hand. Pass the region to `locateOnScreen` and use its result directly.

A cheaper approach for text is pixel colour: `pyautogui.pixelMatchesColor(x, y, (255, 255, 255))` tells you whether a spot is the colour you expect, which is enough to detect that a page finished loading. `pyautogui.pixel(x, y)` returns the colour if you want to compare yourself.

## Making it survivable

- Print a step number before each action, so a log tells you where it stopped.
- Wait for the interface instead of assuming: loop until `locateOnScreen` succeeds, with a timeout.
- Keep the failsafe on and give yourself a way to abort.
- Test with a long `PAUSE` first, then shorten it.
- Prefer an API when one exists. GUI automation is the last resort, and it is brittle by nature.

A wait loop is five lines and removes most flakiness:

```python
import time

def wait_for(image, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        box = pyautogui.locateOnScreen(image, confidence=0.9)
        if box:
            return box
        time.sleep(0.5)
    raise TimeoutError(f"{image} never appeared")
```

For a browser, a real automation library — Playwright or Selenium — drives the page through its own interface, with selectors and waits, and does not care where the window is. `pyautogui` is for the applications that have nothing better.

## Project: filling a form

The canonical job: open a program, tab through its fields, paste from a spreadsheet, save.

```python
import time
import pyautogui
import pyperclip

pyautogui.PAUSE = 0.4

rows = [
    ("Ada Lovelace", "ada@example.com", "1843"),
    ("Grace Hopper", "grace@example.com", "1952"),
]

# click the first field, or focus the window some other way
pyautogui.click(420, 310)

for name, email, year in rows:
    pyperclip.copy(name)
    pyautogui.hotkey("ctrl", "v")
    pyautogui.press("tab")

    pyperclip.copy(email)
    pyautogui.hotkey("ctrl", "v")
    pyautogui.press("tab")

    pyperclip.copy(year)
    pyautogui.hotkey("ctrl", "v")
    pyautogui.press("tab")

    time.sleep(0.2)

pyautogui.hotkey("ctrl", "s")
```

Tab order is the interface's own promise about where focus goes next. When it holds, the script never needs a coordinate past the first click, and it survives a window that moves.

## Project: looking busy

A mouse that jiggles every few minutes keeps a status indicator green. The whole program is a loop and a small move.

```python
import time
import pyautogui

try:
    while True:
        pyautogui.moveRel(0, 40, duration=0.2)
        time.sleep(2)
        pyautogui.moveRel(0, -40, duration=0.2)
        time.sleep(120)
except KeyboardInterrupt:
    print("stopped")
```

Moving back after the pause leaves the pointer where it started, so the trick is invisible and the failsafe still works.

## Screenshots and recognition

`pyautogui` can take a screenshot and find a smaller image inside it. That is enough to click a button whose position you do not know.

```python
import pyautogui

shot = pyautogui.screenshot()
shot.save("screen.png")
print(shot.size)

region = pyautogui.screenshot(region=(0, 0, 800, 600))
region.save("corner.png")
```

`locateOnScreen` returns the first matching box as `(left, top, width, height)`, or `None`:

```python
box = pyautogui.locateOnScreen("button.png")
if box:
    pyautogui.click(pyautogui.center(box))
```

Exact matching fails at the first difference in theme, scale, or anti-aliasing. With OpenCV installed, `confidence` allows an approximate match:

```python
box = pyautogui.locateOnScreen("button.png", confidence=0.9)
```

`locateAllOnScreen` returns every match, `locateCenterOnScreen` skips the box, and `center(box)` converts a box to a point. Coordinates are absolute, so a screen-coordinate click after a match is the same click you would have written by hand — the image just found it for you.

Recognising an image is slow: it captures the screen and compares pixels. A loop that calls it every frame will make the machine sluggish. Sleep between attempts and give up after a limit.

```python
for _ in range(30):
    box = pyautogui.locateOnScreen("done.png", confidence=0.85)
    if box:
        break
    pyautogui.sleep(1)
else:
    raise RuntimeError("the job never finished")
```

Crop the reference image tightly. A screenshot of the whole window matches nothing reliably; the button alone, with a few pixels of background, matches well. Keep the reference at the same display scale as the machine that will run the script — a 150% display setting makes every pixel twice as large, and a template captured at 100% will not be found.

## Clipboard and dialogs

The clipboard is often the cheapest bridge between two programs that cannot talk to each other. `pyperclip` reads and writes it in one call:

```python
import pyperclip

pyperclip.copy("text to move")
text = pyperclip.paste()
```

A common pattern: select the data in one application with `Ctrl-C`, then read it with `paste()` instead of trying to scrape a window. Clipboard contents disappear when another program writes to them, so copy and read immediately.

Dialogs block until the user answers, which makes them a simple way to ask for confirmation or a value in the middle of a long automation.

```python
import pyautogui

if pyautogui.confirm("Delete the old reports?", buttons=["Yes", "No"]) == "Yes":
    pass

name = pyautogui.prompt("Folder name?")
pyautogui.alert("Finished")
```

`confirm` returns the label of the button pressed, `prompt` returns the typed string or `None` if cancelled, and `alert` returns the button text after the user dismisses it. `password` hides the input. The buttons are labelled, so comparing against `"Yes"` is safer than comparing against `True`, which is what a yes/no box would return in some other toolkits.

Two cautions. Dialogs belong to the automation, not to the program being automated — a modal window can appear on top of the application and swallow the clicks that follow. And a script that runs unattended must not contain a dialog at all; replace it with a command-line argument or a configuration value, or the scheduled run will sit there forever, waiting for someone who is asleep.

## Practice questions

- Where is the origin of the screen grid, and which way do the axes run?
- What does `duration` change about `moveTo`, and why does it matter for clicks?
- How do you type a character that is not on the keyboard?
- Why does a screenshot of a button stop matching after a display change?
- Why is a wait loop better than `time.sleep(5)` before a click?
- Write a script that opens a spreadsheet program, fills the first ten rows, and saves.
- Rewrite a coordinate-based form filler to use `press("tab")` instead.
