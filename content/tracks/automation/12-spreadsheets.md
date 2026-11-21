---
title: Working with Excel Spreadsheets
---

Spreadsheets are where most offices keep their data, and their interfaces are designed for hands, not for repetition. A script can read a workbook, change a thousand cells, and save it — the same operation a person would do row by row for an afternoon.

`openpyxl` reads and writes `.xlsx` files. It does not open Excel, and it does not need Excel installed.

```bash
pip install openpyxl
```

## Loading a workbook

```python
import openpyxl

workbook = openpyxl.load_workbook("budget.xlsx")
print(workbook.sheetnames)

sheet = workbook["January"]
print(sheet.max_row, sheet.max_column)
```

`load_workbook()` reads the whole file into memory. `workbook.active` gives you the sheet that was open when it was saved; naming the sheet is safer.

`sheetnames` is the list of tabs, in order. Indexing a name that does not exist raises `KeyError`, and the message names the key but not the sheets that do exist — so check first and print the options:

```python
if "January" not in workbook.sheetnames:
    raise SystemExit(f"no January sheet; found {workbook.sheetnames}")
```

`max_row` and `max_column` report the used range, and they can be larger than the data: formatting an entire column counts. Do not loop to `max_row` blindly; stop when a row is empty if that is what the data means.

`data_only=True` makes formulas load as their last calculated values instead of as formula strings. The values only exist if the file was saved by Excel at least once; a file written by openpyxl has none.

## Reading cells

Cells can be reached by coordinate or by row and column number. Coordinates are one-based: `A1` is the top-left cell.

```python
print(sheet["A1"].value)
print(sheet.cell(row=2, column=3).value)

for row in sheet.iter_rows(min_row=2, values_only=True):
    name, amount, note = row
    print(name, amount, note)
```

`values_only=True` skips the cell objects and gives you the values, which is what you usually want. Empty cells arrive as `None`, not as an empty string.

Unpacking a row into names is convenient and brittle: it raises `ValueError` if the row has a different number of columns. `row[0]`, `row[1]` survive a changed sheet; named unpacking does not.

The cell object carries more than the value:

```python
cell = sheet["B2"]
print(cell.value, cell.data_type, cell.number_format)
print(cell.font.bold, cell.fill.fgColor.rgb)
```

`data_type` is `"n"` for a number, `"s"` for a string, `"f"` for a formula, `"d"` for a date. A date looks like a number until you check the format, which is why a column of dates sometimes arrives as `45292`.

## Writing

```python
sheet["D1"] = "Total"
sheet["D2"] = "=SUM(B2:B12)"

for row in range(2, sheet.max_row + 1):
    sheet.cell(row=row, column=4).value = sheet.cell(row=row, column=2).value * 2

workbook.save("budget-updated.xlsx")
```

Assigning a string that starts with `=` writes a formula. openpyxl stores the formula, not its result: computed values appear when the file is opened in a spreadsheet application. It also cannot evaluate formulas for you, so read numbers rather than totals if you need to use them in Python.

Saving to a new name leaves the original untouched. Saving over the open file works, but a crash mid-save can leave a truncated workbook; write to a temporary name and replace when the data matters.

Cells can be assigned dates, and openpyxl applies a date format automatically:

```python
import datetime

sheet["A2"] = datetime.date(2026, 11, 21)
sheet["A2"].number_format = "yyyy-mm-dd"
```

## Sheets

A workbook is a collection of sheets, and the collection is editable:

```python
workbook.create_sheet("February")
workbook.copy_worksheet(workbook["January"])

if "Sheet" in workbook.sheetnames:
    del workbook["Sheet"]

workbook["February"].title = "Feb"
```

`create_sheet()` appends at the end unless you pass an index. `copy_worksheet()` copies values, styles, and dimensions, which is the fastest way to make twelve similar monthly tabs.

Sheet order is the tab order: `workbook.move_sheet("February", offset=-1)` reorders without recreating anything.

## Creating a workbook

```python
from openpyxl import Workbook

book = Workbook()
page = book.active
page.title = "Report"
page.append(["name", "score"])
page.append(["Ada", 93])
page.append(["Grace", 97])

book.save("report.xlsx")
```

`append()` writes a whole row at once, starting after the last used row. For large files, `write_only=True` mode avoids holding everything in memory:

```python
book = Workbook(write_only=True)
page = book.create_sheet()
for row in rows:
    page.append(row)
book.save("large.xlsx")
```

Write-only workbooks cannot be read back and cannot use random cell access; you trade flexibility for memory.

## Formatting, briefly

```python
from openpyxl.styles import Font, PatternFill, Alignment

header = sheet["A1"]
header.font = Font(bold=True, color="FFFFFF")
header.fill = PatternFill("solid", fgColor="0F5F52")
header.alignment = Alignment(horizontal="center")

sheet.column_dimensions["B"].width = 14
sheet.freeze_panes = "A2"
```

`freeze_panes` keeps the rows above and the columns to the left of the named cell visible while scrolling; `"A2"` freezes the header row, `"B2"` freezes row one and column A.

Number formats belong on the cell, not the style object:

```python
sheet["B2"].number_format = '"$"#,##0.00'
sheet["C2"].number_format = "0.0%"
```

Conditional formatting highlights rows without a loop:

```python
from openpyxl.formatting.rule import CellIsRule

sheet.conditional_formatting.add(
    "B2:B100",
    CellIsRule(operator="greaterThan", formula=["1000"],
               fill=PatternFill("solid", fgColor="FFE2D9")),
)
```

Styling is a deep subject. Bold headers, sensible column widths, a frozen header row, and a number format cover almost every case.

## Charts

A chart is an object anchored to a cell, built from a reference to a range:

```python
from openpyxl.chart import BarChart, Reference

chart = BarChart()
chart.title = "Scores"
chart.y_axis.title = "Points"

data = Reference(sheet, min_col=2, min_row=1, max_row=sheet.max_row)
labels = Reference(sheet, min_col=1, min_row=2, max_row=sheet.max_row)

chart.add_data(data, titles_from_data=True)
chart.set_categories(labels)

sheet.add_chart(chart, "E2")
```

`titles_from_data=True` uses the first row of the range as the series name. The chart is stored in the file and rendered by Excel; openpyxl never draws it, so a chart that looks wrong is a reference problem, not a rendering one.

## Rules that save pain

- Work on a copy, never on the only version of a file.
- Read the header row and map names to columns, rather than hard-coding column numbers that will shift.
- Skip blank rows explicitly; `None` in the middle of a row will break arithmetic.
- Check that a sheet name exists before indexing it, and fail with a message that names the sheet.

```python
def column_map(sheet):
    headers = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True))
    return {str(name).strip(): index for index, name in enumerate(headers) if name}
```

The map turns a header name into a zero-based column index, ready for `row[index]`. It survives a colleague inserting a column, which hard-coded numbers do not.

Iterating with `iter_rows(values_only=True)` and writing with `append` is the fastest pattern for large sheets. Cell-by-cell access in a loop over ten thousand rows is noticeably slower, and the difference is easy to avoid.

## Formulas and stored values

A spreadsheet file contains both formulas and the last values calculated from them. `openpyxl` returns the formula by default, because it does not run a calculation engine.

```python
sheet["C2"] = "=B2*2"
print(sheet["C2"].value)     # '=B2*2'
```

Write the formula, save, and the file opens with it in place; Excel or LibreOffice computes it when the file is opened. Read that same file back with `openpyxl` and you get the formula text again, not a number. `data_only=True` asks for the cached value instead:

```python
workbook = load_workbook("report.xlsx", data_only=True)
print(workbook.active["C2"].value)   # 84, or None if never calculated
```

`None` is the trap. A file written by a program has never been opened and never calculated, so `data_only=True` gives `None` for every formula cell. The reliable pattern is: let a spreadsheet application calculate once — open and save, or run `libreoffice --headless --convert-to xlsx` — and read the values afterwards.

If the numbers matter beyond the spreadsheet, compute them in Python and write plain values. Formulas are for the person who will keep editing the workbook; they are not a calculation service your script can query.

Copying a formula across a row is a fill operation, not a Python loop:

```python
for row in range(2, 12):
    sheet[f"C{row}"] = f"=B{row}*2"
    sheet[f"D{row}"] = f"=SUM(B{row}:C{row})"
```

That writes relative references by hand, which is fine and explicit. `openpyxl` cannot fill a range the way a user drags a corner; the loop is the fill.

## The shape of a sheet

A worksheet does not have a fixed size. It knows the range that contains data, and almost every loop should be driven by that rather than by a guessed number of rows.

```python
print(sheet.max_row, sheet.max_column)

for row in sheet.iter_rows(min_row=2, values_only=True):
    name, price, quantity = row
```

`iter_rows` with `values_only=True` gives tuples of values without cell objects — faster and simpler for bulk reads. `min_row=2` skips the header. `iter_cols` does the same down columns.

`max_row` includes rows that were formatted but emptied, so a sheet that looks finished can report thousands of blank rows. Filter them rather than trusting the bound:

```python
rows = [row for row in sheet.iter_rows(values_only=True) if any(cell is not None for cell in row)]
```

Inserting and deleting shifts everything below, including formulas, and it is the one operation that quietly rewrites the rest of the file:

```python
sheet.insert_rows(2, amount=3)
sheet.delete_cols(4)
sheet.freeze_panes = "A2"
```

`freeze_panes` is presentation, not data, but it is what makes a report usable: the header stays visible while scrolling. Column widths and number formats belong to the same category, and they are worth setting for any file a person will open. `sheet.column_dimensions["B"].width = 18` and `cell.number_format = "0.00"` are two lines that turn a dump into something readable.

Do not read a sheet twice to get both values and formulas — open the workbook once with `data_only=False` for editing, or once with `True` for reporting. Mixing the two in one workbook object gives inconsistent results, since the cache is loaded at open time.

## Try it

- Read a sheet of names and amounts, and print the total and the largest row.
- Add a column that marks every row above the average.
- Create a new workbook with one sheet per month, each holding three sample rows.
- Format a header row bold with a fill, freeze it, and set a currency format on a column.
- Build a bar chart from two columns and anchor it beside the data.
