---
title: Web Scraping
---

A web page is a document, and a document can be parsed. When a site has no API but does have a table of prices, scraping turns the page into data you can sort, store, and compare.

The program has two halves: fetch the HTML, then find things inside it. `requests` does the first, BeautifulSoup the second.

```bash
pip install requests beautifulsoup4
```

## Fetching

`requests.get()` downloads a page. `raise_for_status()` turns an HTTP error into an exception instead of quietly handing you an error page.

```python
import requests

response = requests.get("https://example.com", timeout=10)
response.raise_for_status()

print(response.status_code)  # 200
print(response.text[:200])
```

Always set a timeout. Without one, a slow server can hang your script forever. Ten seconds is a reasonable default for a few pages.

The response object carries more than the text:

```python
print(response.url)                       # after redirects
print(response.headers["content-type"])
print(response.encoding, response.apparent_encoding)
```

`response.text` decodes bytes using the encoding from the headers; `response.content` gives you the raw bytes. If the text looks like `Ã©` where an `é` belongs, the server lied about its encoding. Set it explicitly before reading:

```python
response.encoding = response.apparent_encoding
```

`raise_for_status()` catches 4xx and 5xx. It does not catch a 200 that says "access denied" in the body, which is how some sites block scrapers — so check that the markup you expect is actually there.

Some sites check the `User-Agent` header. Supplying an honest one is polite; pretending to be a browser to get past a block is not something to build a habit on.

```python
headers = {"User-Agent": "my-script/1.0 (learning project)"}
response = requests.get(url, headers=headers, timeout=10)
```

## Parsing

BeautifulSoup turns the HTML into a tree you can search. `html.parser` is built in; `lxml` is faster if you install it.

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(response.text, "html.parser")

print(soup.title.get_text(strip=True))

for link in soup.find_all("a"):
    print(link.get("href"), "|", link.get_text(strip=True))
```

`find()` returns the first match, `find_all()` every match. Both accept a tag name, a class with `class_="card"`, an id with `id=`, or a function.

```python
first_link = soup.find("a")
cards = soup.find_all("div", class_="card")
main = soup.find(id="main")
```

`find_all` also takes `limit=`, `attrs={"data-role": "price"}`, and a string, which matches text rather than tags:

```python
for heading in soup.find_all(["h1", "h2"]):
    print(heading.name, heading.get_text(strip=True))
```

`find_all` names are historical aliases for the modern `select_one` and `select`; both work, and both take the same arguments. Pick one style per script.

## CSS selectors

`select()` takes the same selectors you would write in a stylesheet, which is usually the shortest way to describe what you want.

```python
cards = soup.select("div.card")

for card in cards:
    title = card.select_one("h2")
    price = card.select_one(".price")
    print(title.get_text(strip=True), price.get_text(strip=True))
```

`select_one()` returns one element or `None`. Check for `None` before calling `get_text()` on the result.

The selector vocabulary worth having:

| Selector | Finds |
| --- | --- |
| `div` | every div |
| `.price` | anything with class `price` |
| `#main` | the element with id `main` |
| `div.card h2` | h2 inside a card div, any depth |
| `div.card > h2` | h2 that is a direct child |
| `a[href^="https"]` | links whose href starts with https |
| `li:nth-of-type(2)` | the second li |

```python
external = soup.select('a[href^="http"]')
rows = soup.select("table#prices tr")
```

Attribute selectors are the robust choice when class names are generated garbage — `[data-testid="price"]` survives a restyle that `.css-1x2y3z` does not.

## Attributes and text

```python
image = soup.select_one("img.hero")
print(image["src"])
print(image.get("alt", ""))

table_rows = soup.select("table tr")
for row in table_rows[1:]:
    cells = [cell.get_text(strip=True) for cell in row.find_all("td")]
    print(cells)
```

`image["src"]` raises `KeyError` when the attribute is missing; `image.get("alt", "")` does not. Use `get` for anything optional.

`get_text(strip=True)` joins the text of every descendant and trims it. `separator=" "` puts a space between pieces, which stops adjacent tags running their words together:

```python
print(card.get_text(" ", strip=True))
```

Text with entities — `&amp;`, `&#8212;` — is decoded for you. Whitespace is not normalised beyond the strip, so a price split across two lines may arrive with a newline in the middle.

Sometimes the data is not in the HTML at all: it is fetched by JavaScript after the page loads. `requests` only downloads the initial document. The data is usually still in a JSON endpoint inside a `<script>` tag, and finding that is easier than driving a browser:

```python
import json
import re

match = re.search(r"<script[^>]*application/json[^>]*>(.*?)</script>", response.text, re.S)
if match:
    data = json.loads(match.group(1))
```

When that fails, the honest answer is a browser automation tool, not a cleverer regex.

## Being a good citizen

- Read the site's terms and its `robots.txt` before scraping.
- Limit yourself to a few requests per second. `time.sleep(1)` between pages is a reasonable default.
- Cache pages locally while you develop, so you are not re-downloading the same HTML on every run.
- Prefer an API when one exists. Scraping is a fallback, not a first choice.
- Expect the markup to change. Select on stable structure, and fail loudly when nothing matches rather than writing an empty file.

A cache is ten lines and saves hours:

```python
from pathlib import Path

def fetch_cached(url, name):
    path = Path("cache") / f"{name}.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    path.parent.mkdir(exist_ok=True)
    path.write_text(response.text, encoding="utf-8")
    return response.text
```

A retry with backoff handles the transient failure that would otherwise kill a long run:

```python
import time

def get(url, attempts=3):
    for attempt in range(1, attempts + 1):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response
        except requests.RequestException:
            if attempt == attempts:
                raise
            time.sleep(2 ** attempt)
```

`requests.RequestException` is the base class for connection errors, timeouts, and HTTP errors raised by `raise_for_status()`.

## Project: a table into a file

The job in one script: fetch a page of prices, pull the rows, write a CSV.

```python
import csv
import requests
from bs4 import BeautifulSoup

url = "https://example.com/prices"
response = requests.get(url, timeout=10)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")
rows = []

for row in soup.select("table.prices tr")[1:]:
    cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
    if len(cells) == 3:
        rows.append(cells)

if not rows:
    raise SystemExit("no rows found; the page probably changed")

with open("prices.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["item", "price", "stock"])
    writer.writerows(rows)
```

The `SystemExit` is the important line. A scraper that writes an empty file when the selectors stop matching is worse than one that crashes, because nobody notices for a month.

## Sessions, headers, and retries

A single `requests.get` is fine for one page. For twenty pages from the same site, a `Session` reuses the connection, keeps cookies, and lets you set defaults once.

```python
import requests

session = requests.Session()
session.headers.update({"User-Agent": "pyflow-course/1.0 (learning project)"})

for page in range(1, 6):
    response = session.get(f"https://example.com/list?page={page}", timeout=10)
    response.raise_for_status()
    print(page, len(response.text))
```

`raise_for_status()` turns a 404 or a 500 into an exception. Without it, `response.text` is the error page, and you parse an apology into your CSV. `timeout=10` stops a dead server from hanging the script forever; a request with no timeout can wait indefinitely, which is a bug you only notice in production.

Networks fail in ways that have nothing to do with your code. A retry with a growing pause handles the blip without hammering the server:

```python
import time

def fetch(session, url, attempts=3):
    for attempt in range(1, attempts + 1):
        try:
            response = session.get(url, timeout=10)
            response.raise_for_status()
            return response
        except requests.RequestException:
            if attempt == attempts:
                raise
            time.sleep(2 ** attempt)
```

Two seconds, then four, then give up. Retry only on timeouts and 5xx responses; retrying a 404 just repeats the mistake four times.

A `User-Agent` that names your script and a contact address is honest and gets treated better than Python's default. Cookies from a `Session` keep you on the same login, and `session.get(..., params={"q": "term"})` encodes query strings properly instead of you concatenating `?` and `&` by hand.

## When there is no HTML to parse

A page that looks empty in your script is usually built by JavaScript. `requests` receives the initial document and no more; the browser runs code that fetches the data and inserts it. Two things follow.

First, look for the data before parsing the page. Open the browser's developer tools, choose the Network tab, reload, and filter for `fetch` or `XHR`. The table you want is usually loaded from a JSON endpoint:

```python
response = session.get("https://example.com/api/items", params={"page": 1}, timeout=10)
data = response.json()

for item in data["results"]:
    print(item["name"], item["price"])
```

That is smaller, faster, and far more stable than the HTML around it. An endpoint you found this way is still not a public API — it can change without notice, and it may require the same headers the page sends.

Second, if the data really is assembled only in the browser, a headless browser is the tool: Playwright or Selenium loads the page, waits for a selector, and then hands you the HTML:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as browser:
    page = browser.chromium.launch().new_page()
    page.goto("https://example.com/list", wait_until="networkidle")
    rows = page.locator("table tbody tr").all_inner_texts()
```

That is a real browser, with the weight and fragility of one. Use it when there is no JSON and the page is worth the cost.

Three checks before writing a scraper: does the site publish an API, does `robots.txt` allow the path, and do the terms forbid automated access. A request every second is a denial-of-service attack with polite intentions; a delay, a cache, and a limit on pages fetched are part of a working scraper, not extra credit.

## Doubts worth settling

**Why does `requests.get` return 403?** The site refused the request, often because the headers look
like a script. Send a normal `User-Agent` first; if it still refuses, the site may require a login or
forbid automation, and that is an answer, not a bug to defeat.

**Why is the text I want missing from the HTML?** The page builds it with JavaScript after loading.
`requests` only sees the first response. Either find the JSON endpoint the page calls — usually in
the network panel — or use a browser driver. Prefer the endpoint: it is smaller, faster, and less
likely to break.

**What is the difference between `find` and `select`?** `find` takes a tag and attributes;
`select` takes a CSS selector, which is usually shorter and familiar from styling:
`soup.select("table.results tr")`. `select_one` returns the first match or `None`, so check before
reading `.text`.

**Why does `.text` include extra whitespace?** Because the markup has it. `clean = " ".join(node.text.split())`
collapses runs of spaces and newlines in one line. Do it before comparing or storing.

**How do I stay polite?** Read `robots.txt`, send an identifying `User-Agent`, keep concurrency
low, cache pages while you build the parser, and stop when the site says to. One request per second
is a common ceiling; a retry with a delay beats a fast loop that hammers a struggling server.

**Why does the scraper break every few weeks?** Because the markup changed. Keep the parsing rules
in one place, assert on the count you expect, and log the response when a selector returns nothing,
so the next fix is a minute's work instead of an afternoon's.

## A slow read of one script

```python
import time
import requests
from bs4 import BeautifulSoup

page = requests.get("https://example.com/news", timeout=10,
                    headers={"User-Agent": "pyflow-course/1.0"})
page.raise_for_status()
soup = BeautifulSoup(page.text, "html.parser")

for item in soup.select("article h2 a")[:5]:
    print(" ".join(item.get_text().split()), item["href"])
    time.sleep(1)
```

The timeout keeps a hung connection from stalling the script forever. `raise_for_status` turns a
404 or 500 into an exception instead of parsing an error page as if it were content. The selector
follows structure — articles, then headings, then links — so it survives unrelated changes. `get_text`
is used rather than `.text` so the whitespace collapse reads clearly. The pause applies between
requests; on a single page it is harmless, in a loop it is the difference between welcome and
blocked.

## Try it

- Download a page and list every heading on it, in order.
- Extract all links from a page, keep only the absolute ones, and print them sorted.
- Save a page's text to a file, then count the most common words in it.
- Fetch two pages of a listing with a one-second pause and combine their rows into one CSV.
- Cache a page, then re-run the script offline and confirm it still works.
