---
title: Working with PDF and Word Documents
---

A PDF is a container: pages, fonts, images, and drawing instructions, laid out for a printer rather than for a program. A Word file is a zip archive full of XML. You do not need to understand either format to change them — a library reads the file into Python objects, you rearrange those objects, and the library writes a new file.

That indirection is the whole trick. You never edit bytes; you edit pages, paragraphs, and runs, then save.

## Two formats, two models

A PDF stores appearance. Each page is a list of instructions: draw this glyph at this coordinate, in this font, at this size. There are no paragraphs, no columns, no headings — only positions. Text extraction reconstructs reading order from those positions, and mostly succeeds.

A `.docx` stores structure. Inside the zip is `word/document.xml`, a tree of paragraphs, tables, sections and styles. The same text can be bold in one run and plain in the next, which is why formatting lives on runs rather than on paragraphs.

Keep the difference in mind: PDF libraries give you pages, Word libraries give you a document tree.

## Reading a PDF

```bash
pip install pypdf
```

`PdfReader` takes a path — or a file object — and gives you `pages`, which behaves like a list. Every page can hand back its text and its layout boxes.

```python
from pypdf import PdfReader

reader = PdfReader("meetingminutes.pdf")
print(len(reader.pages))

page = reader.pages[0]
print(page.extract_text())
```

Extracted text follows the order the letters were drawn, not necessarily the order you would read a two-column page. Treat it as a starting point: good enough to search, count, and summarise, sometimes wrong in the margins.

Two failures are worth recognising early. A scanned PDF contains images of text, so `extract_text()` returns `""` — no library can read pixels without OCR. And a page with unusual fonts may return glyphs in a private encoding, which looks like noise. Check for empty strings and fall back to a message rather than silently writing a blank file.

Writing that text back out is a loop and a file handle:

```python
reader = PdfReader("meetingminutes.pdf")

with open("minutes.txt", "w", encoding="utf-8") as out:
    for page in reader.pages:
        out.write(page.extract_text() or "")
        out.write("\n")
```

The `or ""` guards against `None`. Without it, one image-only page stops the loop with a `TypeError` halfway through a hundred-page document.

## Passwords on the way in

Encrypted PDFs load, but their pages refuse to give up text until you decrypt them. Check the flag first; calling `decrypt()` on an unencrypted file is harmless but pointless.

```python
reader = PdfReader("encrypted.pdf")

if reader.is_encrypted:
    result = reader.decrypt("swordfish")
    print(result)   # PasswordType.OWNER_PASSWORD or NOT_DECRYPTED
```

`decrypt()` returns an enum, not a boolean. Compare it to `PasswordType.NOT_DECRYPTED` if you need to detect a wrong password and stop with a clear message. An owner password unlocks editing; a user password unlocks opening. Either one that works is enough for reading.

## Building a PDF

`PdfWriter` builds a new document page by page, in whatever order you add them. That single idea covers extracting a range, reversing a scan, splitting a file, merging several files, and inserting a blank cover.

```python
from pypdf import PdfWriter

writer = PdfWriter()
writer.add_blank_page(width=612, height=792)   # US Letter, in points

with open("cover.pdf", "wb") as out:
    writer.write(out)
```

Note the `"wb"`. PDFs are binary; opening the output in text mode corrupts them on Windows and produces nonsense everywhere else.

## Copying pages

Copying is the same loop with a slice. A page object belongs to its reader, and `add_page` copies what it needs, so you can mix pages from several files in one writer.

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("report.pdf")
writer = PdfWriter()

for page in reader.pages[2:5]:
    writer.add_page(page)

with open("excerpt.pdf", "wb") as out:
    writer.write(out)
```

Merging is the same loop over more than one reader:

```python
writer = PdfWriter()

for name in ["chapter1.pdf", "chapter2.pdf", "chapter3.pdf"]:
    for page in PdfReader(name).pages:
        writer.add_page(page)

with open("book.pdf", "wb") as out:
    writer.write(out)
```

Splitting is the inverse — one writer per chunk, a new file each time. Ten-page packets from a long scan is four lines of loop:

```python
reader = PdfReader("scan.pdf")

for start in range(0, len(reader.pages), 10):
    writer = PdfWriter()
    for page in reader.pages[start:start + 10]:
        writer.add_page(page)
    writer.write(open(f"scan-{start // 10 + 1:02d}.pdf", "wb"))
    writer.close()
```

`close()` releases the file handle. When you pass a handle to `write()` as above, closing the writer closes it for you; when you use a `with` block around the output file, you do not need either.

## Rotating pages

A sideways scan is fixed with `rotate`, in clockwise degrees, usually a multiple of 90. Set it before adding the page.

```python
reader = PdfReader("sideways.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.rotate(90)
    writer.add_page(page)
```

Rotation is stored as a page property; the content stream is untouched. That is good — it is lossless — but it also means a rotation can be applied twice if you run the script twice. Check `page.rotation` first when reprocessing files in place.

## Overlaying pages

`merge_page` draws one page on top of another. That is the usual way to put a watermark, a letterhead, or a page number on every page.

```python
stamp = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("draft.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(stamp)
    writer.add_page(page)

with open("stamped.pdf", "wb") as out:
    writer.write(out)
```

The stamp page should be the same size as the pages it lands on, or it will sit in a corner. Build it once with a word processor or a drawing library, save it as a PDF with a transparent background, and reuse it. Merging happens in memory, so the same stamp page can be applied to hundreds of pages.

`merge_page` draws over the content. To put something behind the text — a faint logo, a background tint — use `merge_transformed_page` with a translation matrix, or build the background page first and merge the content on top.

## Encrypting the output

The writer can encrypt what it produces, with separate passwords for opening and for editing.

```python
reader = PdfReader("draft.pdf")
writer = PdfWriter()
writer.append(reader)

writer.encrypt(user_password="swordfish", owner_password="admin")

with open("protected.pdf", "wb") as out:
    writer.write(out)
```

Permissions are hints to honest readers, not a lock on the bytes; never rely on them to protect a secret. Encryption, on the other hand, is real cryptography, as long as the password is not the name of the project in lowercase.

## Reading Word documents

```bash
pip install python-docx
```

A `Document` exposes its structure: paragraphs, tables, sections, styles. Text lives on paragraphs, not on the document, and formatting lives on runs, which are the stretches of text that share a format.

```python
import docx

doc = docx.Document("demo.docx")
print(len(doc.paragraphs))
print(doc.paragraphs[0].text)

for paragraph in doc.paragraphs:
    if paragraph.style.name == "Heading 1":
        print(paragraph.text)
```

`paragraph.text` is the concatenation of its runs — convenient for reading, useless for finding which word is bold. For that, walk the runs:

```python
for paragraph in doc.paragraphs:
    for run in paragraph.runs:
        if run.bold:
            print("bold:", run.text)
```

Runs also carry `italic`, `underline`, `font.name`, and `font.size`. A run is `None` for those attributes when it inherits from the style, so `if run.bold:` is true only when bold was set explicitly. To know what the reader actually sees, you would have to resolve the style chain; for most scripts, the explicit flags are enough.

The document's plain text, in order, is one `join`:

```python
text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
```

Tables are indexed like the page, row first:

```python
table = doc.tables[0]

for row in table.rows:
    print([cell.text for cell in row.cells])
```

Merged cells appear more than once in `row.cells`, once per grid position they span. Deduplicate by object identity if a doubled value would break your totals.

Sections hold page size, margins, headers and footers:

```python
section = doc.sections[0]
print(section.page_width, section.left_margin)
print(section.header.paragraphs[0].text)
```

## Writing Word documents

Writing is the same model in reverse. Add paragraphs, headings, pictures; save to a new path and the original stays untouched.

```python
doc = docx.Document()
doc.add_heading("Weekly report", 0)
doc.add_paragraph("Nothing caught fire. Two things nearly did.")
doc.add_picture("chart.png")
doc.save("report.docx")
```

`add_heading(text, level)` uses the built-in heading styles, so the document's navigation pane and any generated table of contents pick them up. Level `0` is the title style; `1` through `9` are headings.

Paragraphs take a style by name, and runs take formatting:

```python
paragraph = doc.add_paragraph()
paragraph.add_run("Normal, then ")
bold = paragraph.add_run("important")
bold.bold = True
bold.italic = True
```

`add_page_break()` ends the page. `add_picture(path, width=docx.shared.Inches(4))` scales by width and keeps the aspect ratio; without a width, a phone photo arrives at its full pixel size and pushes everything off the page.

Styles can be changed once for the whole document:

```python
from docx.shared import Pt

style = doc.styles["Normal"]
style.font.name = "Georgia"
style.font.size = Pt(11)
```

Setting `font.name` alone changes the Latin font but not the East Asian one that Word prefers for some characters; `style.element.rPr.rFonts.set(qn("w:eastAsia"), "Georgia")` fixes that if you ever see fallback glyphs.

## Rounds of work

Anything you can do once, you can do to a folder. A short script can walk a directory, open every `.docx`, and pull the first heading of each into an index:

```python
from pathlib import Path
import docx

for path in Path("reports").glob("*.docx"):
    doc = docx.Document(path)
    headings = [p.text for p in doc.paragraphs if p.style.name.startswith("Heading")]
    print(path.name, "->", headings[0] if headings else "(untitled)")
```

Another can stamp every PDF in a folder with a page number, or copy the same two pages out of forty invoices into one file. The library does the reading; the loop does the work.

## Project: selected pages from many PDFs

A folder of statements, one page each, and you want the summary pages only. Arguments make the script reusable.

```python
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter

folder = Path(sys.argv[1])
start = int(sys.argv[2])
end = int(sys.argv[3])

writer = PdfWriter()

for path in sorted(folder.glob("*.pdf")):
    reader = PdfReader(path)
    for page in reader.pages[start - 1:end]:
        writer.add_page(page)
    print(f"{path.name}: {len(reader.pages)} pages")

with open("combined.pdf", "wb") as out:
    writer.write(out)

print(f"wrote {len(writer.pages)} pages")
```

Run it as `python3 combine.py statements 1 2`. `sys.argv[0]` is the script name, so the first real argument is index 1. Convert to `int` once, at the top, and the rest of the script never worries about strings. Slicing is zero-based while humans count from one, which is why `start - 1` appears; `end` needs no adjustment because slices exclude it.

The same shape handles a page range written as text (`"1-3,7"`): split on commas, split each piece on `-`, and add the pages one at a time. That is the point where `argparse` starts to pay for itself.

## Forms and metadata

A PDF carries two kinds of hidden content: metadata describing the file, and form fields a reader can fill in. Both are readable without rendering a page.

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("invoice.pdf")
print(reader.metadata.title)
print(reader.metadata.author)
print(reader.metadata.creation_date)
```

Metadata is whatever the producing program wrote, so treat it as a claim rather than a fact. Most office suites put the author's name and the original document title there, which is a real leak when a file leaves an organisation. The fix is to overwrite it before writing:

```python
writer = PdfWriter()
writer.append(reader)
writer.add_metadata({
    "/Title": "Quarterly report",
    "/Author": "Finance",
    "/Producer": "pyflow",
})
```

Fields are the interactive part. `get_fields()` returns a dictionary of name to field definition, and `update_page_form_field_values()` fills them:

```python
print(reader.get_fields().keys())
writer.update_page_form_field_values(writer.pages[0], {"name": "Ada"})
```

Filling a form does not flatten it; the recipient can still edit the fields. Flattening means drawing the values onto the page and dropping the form, which `pypdf` does not do well. If the result must be uneditable, print the filled document to a new PDF with a viewer, or use a library built for form flattening.

An encrypted document can be opened with a password and read, but `pypdf` refuses to write a modified copy without one. `writer.encrypt("new-password", algorithm="AES-256")` sets a fresh password on the output; leaving it out of an encrypted input's copy is the usual cause of a file that opens but shows nothing.

## Replacing text in Word without wrecking it

Search and replace in a `.docx` is not a string operation on the file. A paragraph is a list of runs, and a run is a stretch of text sharing one format. Word splits runs wherever formatting or spell-check state changed, so `{{name}}` can be three runs: `{{`, `na`, `me}}`.

```python
from docx import Document

doc = Document("letter.docx")

for paragraph in doc.paragraphs:
    for run in paragraph.runs:
        if "{{name}}" in run.text:
            run.text = run.text.replace("{{name}}", "Ada")
```

That works when the placeholder sits inside one run, which is common for text typed in one go. It misses placeholders split across runs. The robust version joins the paragraph's runs, replaces in the joined text, and writes the result back into the first run, clearing the rest — which loses per-word formatting inside that paragraph but keeps the paragraph style:

```python
for paragraph in doc.paragraphs:
    if "{{name}}" not in paragraph.text:
        continue
    joined = "".join(run.text for run in paragraph.runs)
    paragraph.runs[0].text = joined.replace("{{name}}", "Ada")
    for run in paragraph.runs[1:]:
        run.text = ""
```

Neither loop touches tables, headers, footers, or text boxes. Those live elsewhere: `doc.tables` for cells, and `section.header.paragraphs` / `section.footer.paragraphs` for the furniture around the body. A mail merge that works on the body and leaves `{{name}}` in the footer is a classic half-fix.

Heading structure is worth reading before you write. `paragraph.style.name` tells you whether a paragraph is `Heading 1`, `Normal`, or a custom style, which is how you extract an outline or apply a template's styles to generated text. Setting `paragraph.style = doc.styles["Heading 2"]` keeps the document's look consistent instead of hard-coding font sizes.

Finally, save to a new path. `Document.save()` overwrites silently, and a bug in a replacement loop is much easier to see when the original is still there.

## Getting trustworthy text out of a PDF

`extract_text()` gives you characters in the order the PDF stores them, which is not always the
order a human reads. Two problems show up constantly: words broken across lines by hyphenation,
and repeated page furniture (headers, footers, page numbers) glued to the content. Neither is
fatal, and a short cleanup pipeline fixes both.

```python
import re
import unicodedata

def clean(text):
    text = unicodedata.normalize("NFKC", text)   # ﬃ -> ffi,  ﬁ -> fi
    text = re.sub(r"\n{2,}", "\n", text)           # paragraph break kept for now
    text = text.replace("\n", " ")               # reflow paragraphs
    text = re.sub(r" {2,}", " ", text)            # collapse runs of spaces
    return text.strip()
```

The `unicodedata` line matters more than it looks: PDFs from publishing tools often encode common
letter pairs as a single glyph ("fi" as one code point), and NFKC unfolding turns those back into
normal letters your comparisons will match. Collapsing spaces last keeps the joins tidy.

Hyphenated line endings are deliberately *not* joined here: `informa-\ntion` wants to become
`information`, but `a well-\nknown fact` is a wrapped compound and joining it produces `wellknown`.
They are indistinguishable without a dictionary. Either leave them as spaces, or join only when a
line ends with `-` and you are prepared to flag suspicious results:

```python
text = re.sub(r"([a-z])-\n([a-z])", r"\1\2", text)   # risky: cannot tell split word from wrapped compound
```

If you apply that join, extract the affected pages afterwards and let a human eyeball the ones that
produced a suspiciously long word — that is cheaper than silently wrong text.

Repeated headers and footers are easier to drop after extraction, but dropping by "first and last
line of every page" alone will also delete unique body text that happens to open or close a page.
Only auto-remove lines that *recur* across pages: collect the first and last few lines of each
page, keep the candidates that appear on most pages, normalising page-number variation (e.g. replace
digits with `#`), and remove those. Leave anything ambiguous — a line that appears on some but not
all pages — for a person to review rather than deleting it outright.

Two-column layouts need coordinate-based extraction rather than text flow. `extract_words()` is
`pdfplumber`'s API, so the two-column job needs `pdfplumber`, not a `pypdf` page:

```python
import pdfplumber

def column_text(path):
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            midpoint = page.width / 2
            columns = {"left": [], "right": []}
            for word in words:
                side = "left" if (word["x0"] + word["x1"]) / 2 < midpoint else "right"
                columns[side].append(word)
            for side in ("left", "right"):          # left column first, then right
                print(lines(columns[side]))

def lines(words):
    rows = {}
    for word in words:
        key = round(word["top"], 1)                # words on the same line share a y
        rows.setdefault(key, []).append(word)
    for key in sorted(rows):                        # top to bottom
        line = sorted(rows[key], key=lambda w: w["x0"])   # left to right within the line
        print(" ".join(w["text"] for w in line))
```

Grouping words into lines by vertical position first is what `extract_text()` cannot do for you:
a plain `(x, y)` sort would put a low word at the left margin above a high word on the right,
scrambling both columns. Group by line, order within the line, then read the left column before
the right. Sorting `(x, y)` globally is the bug to avoid, not the tool. If a document is a scan
rather than born-digital, no text tool will help; that is OCR territory, a different dependency
and a different day.

## Doubts worth settling

**Why is the extracted text in the wrong order?** A PDF stores text by position, not by reading
order, so columns and tables interleave. `extract_text` follows the page's internal stream, which
usually looks right for prose and often does not for layouts. Try `layout=True` in pdfplumber, or
extract tables separately with `extract_tables`.

**Why does a page return no text at all?** It is probably a scan — an image of words. No library can
read text that is not there; that needs OCR, and OCR needs a clean, high-resolution page. Check
`len(page.extract_text() or "")` before assuming the file is broken.

**Can I edit a PDF with these tools?** Not really. `pypdf` can merge, split, rotate, and fill form
fields, but it does not reflow paragraphs. Real edits mean rebuilding the document. Treat PDF as an
output format and keep the source in something editable.

**Why did my merged PDF lose its bookmarks?** Merging concatenates pages; outlines and links belong
to the original structure. Copy them deliberately with `clone_document_from_reader` or rebuild them.
Check the page count after every structural operation — the fastest way to catch a silent failure.

**Why does a Word replacement leave the old text behind?** Because Word splits a sentence across
runs for spell-check and formatting, so `"Total"` may live in two runs. Replace run by run first;
when a match spans runs, join the paragraph text, replace, and write it back — accepting that
formatting inside that paragraph may reset.

**Is `python-docx` a layout tool?** No. It handles paragraphs, runs, tables, and styles — the
document's structure. Anything depending on page breaks or exact positions is the word processor's
job, and the result will differ on another machine.

## A slow read of one script

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("report.pdf")
writer = PdfWriter()
for number, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ""
    if "Confidential" not in text:
        writer.add_page(page)
    else:
        print(f"dropped page {number}")
writer.write("public.pdf")
```

Pages are copied, not rebuilt, so the visual result is identical to the source. The `or ""` guard
matters: `extract_text` returns `None` for image-only pages, and `in None` would raise. Testing for
a marker word is a sample policy — a real filter would check a header region or metadata. Writing to
a new file keeps the original intact, which is the habit that makes a bulk PDF script safe to rerun.

## Practice questions

- Why does `extract_text()` sometimes return the columns of a page interleaved?
- What is the difference between `PdfWriter.add_page` and `page.merge_page`?
- Which object holds the bold formatting of a word inside a paragraph?
- Why must a PDF be written in binary mode, and what breaks when it is not?
- What does `decrypt()` return, and how do you tell a wrong password from a right one?
- Write a loop that renames every `.docx` file in a folder to a slug of its first heading.
- Combine two PDFs, put a cover page in front, and save the result as one file.
- Extract text from a two-column PDF and identify why the columns interleave; then list the three cleanup steps you would apply.
- Strip repeated headers/footers from every page of a PDF and save the result as a `.txt`.
