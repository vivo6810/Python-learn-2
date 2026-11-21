---
title: Manipulating Images
---

An image on disk is a grid of pixels plus a little metadata. Pillow opens it into an object you can crop, resize, rotate, recolor, and draw on, then saves in any format it understands. The same thirty lines handle one picture or a folder of four hundred.

The mental model is small: a pixel is a colour, an image is a rectangle of pixels, and every operation produces a new image or edits one in place.

## Pixels and colour

A colour is a tuple of channel values from 0 to 255. `RGB` gives red, green, blue. `RGBA` adds alpha, where 0 is transparent and 255 is opaque. `L` is a single greyscale value, and `1` is pure black and white.

```python
red = (255, 0, 0)
teal = (15, 95, 82)
transparent_black = (0, 0, 0, 0)
```

Coordinates start at the top left. `x` grows to the right, `y` grows downward, and the pixel at `(0, 0)` is the corner. That is the opposite of the graph paper you learned in maths, and it is the source of most off-by-one confusion in image code.

A box is a four-tuple: `(left, upper, right, lower)`. The left and upper edges are included, the right and lower are not. A box of `(0, 0, 100, 50)` is 100 pixels wide and 50 tall.

## Opening and inspecting

```bash
pip install pillow
```

```python
from PIL import Image

picture = Image.open("zophie.png")

print(picture.size)        # (816, 1088)
print(picture.format)      # PNG
print(picture.mode)        # RGBA
print(picture.filename)
```

`size` is `(width, height)`. `mode` describes the channels: `RGB` for colour without transparency, `RGBA` with it, `L` for greyscale. Saving converts when the format does not support the mode — a `RGBA` image saved as JPEG loses its transparency, usually turning it black.

```python
picture.save("copy.png")
picture.save("copy.jpg", quality=90)
```

`Image.open` is lazy: it reads the header and defers the pixel data until you use it. That is why a broken file can open without error and fail on `load()`. Call `picture.load()` when you want the failure at a line you control.

`quality` from 1 to 95 is the JPEG trade-off; 85 is a good default for photographs, and below 70 the artefacts become visible around text. PNG ignores `quality` and uses `optimize=True` instead, which is slower and smaller.

## Cropping, resizing, rotating

`crop` takes a box in pixels: left, upper, right, lower.

```python
box = (100, 200, 460, 620)
region = picture.crop(box)
region.save("crop.png")
```

`resize` takes a new width and height and ignores the old aspect ratio unless you compute it. `thumbnail` scales in place and never enlarges, which is what you want for previews.

```python
small = picture.resize((204, 272))
picture.thumbnail((400, 400))
```

`thumbnail` keeps the aspect ratio, fits inside the box, and modifies the image rather than returning a new one. It also does nothing if the image is already smaller — a useful property when the same script runs on mixed sizes.

`resize` can take a resampling filter. `Image.Resampling.LANCZOS` is the sharpest for photographs, `BICUBIC` is a good compromise, and `NEAREST` keeps hard pixel edges for pixel art.

```python
from PIL import Image

sharp = picture.resize((1024, 768), Image.Resampling.LANCZOS)
```

Rotation comes in two flavours. `rotate(angle)` turns about the centre and keeps the original canvas; `transpose(Image.ROTATE_90)` is lossless and swaps width and height.

```python
picture.rotate(90, expand=True).save("rotated.png")
picture.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save("mirrored.png")
```

`expand=True` grows the canvas so the corners are not clipped. Without it, a 90-degree rotation of a tall image cuts off the top and bottom. `transpose` takes the constants `FLIP_LEFT_RIGHT`, `FLIP_TOP_BOTTOM`, `ROTATE_90`, `ROTATE_180`, `ROTATE_270` — all lossless, all exact.

## Copying and pasting

`copy()` duplicates the image; `paste()` draws one image onto another at a position or inside a box.

```python
base = Image.open("wallpaper.png").copy()
logo = Image.open("logo.png")

base.paste(logo, (40, 40))
base.save("wallpaper-branded.png")
```

Pasting an `RGBA` image without a mask copies its alpha as colour and produces a black rectangle. Pass the logo as its own mask to keep transparency:

```python
base.paste(logo, (40, 40), logo)
```

The third argument is a mask: white where the pasted image shows, black where it does not. For a translucent watermark, build a mask from the alpha channel and blend instead:

```python
from PIL import Image

watermark = logo.copy()
watermark.putalpha(90)
base.paste(watermark, (40, 40), watermark)
```

`putalpha` sets the alpha channel for the whole image; 90 out of 255 is a faint mark that still reads.

## Colour, pixel by pixel

Most bulk recolouring is faster with an image operation than a loop, but the loop is the clearest way to see what a pixel is.

```python
pixels = picture.load()

for x in range(picture.width):
    for y in range(picture.height):
        r, g, b = pixels[x, y][:3]
        pixels[x, y] = (255 - r, 255 - g, 255 - b)

picture.save("inverted.png")
```

`load()` returns a pixel-access object that reads and writes in place, so no `save` is needed to keep the change — only to write it to disk. A loop over a large image is slow in Python; a 4000-by-6000 photo is 24 million iterations, which is why the whole-image operations exist.

```python
from PIL import ImageOps

grey = picture.convert("L")
grey.save("grey.png")

high_contrast = ImageOps.autocontrast(picture.convert("RGB"))
```

`convert("L")` makes greyscale using the standard luminance weights, `convert("1")` makes black and white with dithering, and `convert("P")` reduces to a palette of at most 256 colours. `autocontrast` stretches the darkest and lightest values to the full range, which rescues a flat scan.

Counting colours is a cheap way to find the dominant one:

```python
colors = picture.convert("RGB").getcolors(maxcolors=1_000_000)
print(sorted(colors, reverse=True)[:5])
```

`getcolors` returns `(count, colour)` pairs, or `None` if there are more colours than `maxcolors`. Sorting tuples puts the largest count first, so the top of the list is the dominant colour. A photo has thousands of near-duplicates; quantise first if you want a palette:

```python
palette = picture.convert("RGB").quantize(colors=8)
print(palette.getpalette()[:24])
```

## Drawing

`ImageDraw` gives you a canvas with a pen. Shapes take a bounding box and a fill; text takes a position, a string, a fill, and optionally a font.

```python
from PIL import ImageDraw

canvas = Image.new("RGBA", (800, 400), "#f2ede3")
draw = ImageDraw.Draw(canvas)

draw.rectangle((40, 40, 760, 360), outline="#ef501c", width=4)
draw.ellipse((80, 80, 240, 240), fill="#0f5f52")
draw.line((300, 80, 700, 320), fill="#17130f", width=6)
draw.text((320, 120), "automated", fill="#17130f")

canvas.save("poster.png")
```

The shapes are `line`, `rectangle`, `ellipse`, `polygon`, `arc`, `chord`, `pieslice`, and `point`. `outline` draws the border, `fill` fills the interior, and `width` thickens the border. Coordinates in a box are inclusive of both corners, unlike a crop box.

```python
draw.polygon([(400, 40), (760, 200), (400, 360)], fill="#ef501c")
draw.arc((80, 200, 240, 360), start=0, end=180, fill="#17130f", width=8)
draw.point((500, 300), fill="#0f5f52")
```

`ImageFont.truetype` brings in a real typeface and a real size; the default font is bitmap and tiny.

```python
from PIL import ImageFont

font = ImageFont.truetype("Inter.ttf", 48)
draw.text((320, 120), "automated", font=font, fill="#17130f")
```

To centre text, measure it first:

```python
left, top, right, bottom = draw.textbbox((0, 0), "automated", font=font)
width = right - left
draw.text(((800 - width) / 2, 180), "automated", font=font, fill="#17130f")
```

`textbbox` returns the bounding box of the rendered text, including the ascenders and descenders the font actually uses. `anchor="mm"` is the shortcut when you want the text centred on a point rather than positioned by its corner:

```python
draw.text((400, 200), "automated", font=font, fill="#17130f", anchor="mm")
```

Multi-line text needs `multiline_text` and a `spacing` value; the single-line call treats `\n` as nothing.

## Folders of images

The work that pays for itself is the batch: resize every photo to a web width, add a watermark to every proof, convert every image to a smaller format. Walk the folder, filter by extension, do one operation, save under a new name.

```python
from pathlib import Path

for path in Path("photos").glob("*.png"):
    with Image.open(path) as photo:
        photo.thumbnail((1200, 1200))
        photo.convert("RGB").save(path.with_suffix(".jpg"), quality=82)
```

`convert("RGB")` before saving as JPEG is not optional; an `RGBA` image raises `OSError` on save in recent Pillow versions. `with` closes the file handle, which matters on Windows where an open handle blocks the next step.

Photos from phones carry an EXIF orientation flag instead of being rotated. Most viewers honour it; your crop does not. Fix it on open:

```python
from PIL import Image, ImageOps

with Image.open("phone.jpg") as photo:
    photo = ImageOps.exif_transpose(photo)
    photo.save("upright.jpg")
```

A batch that needs a per-file decision — skip a file that is already small, keep the original on failure — wants a `try` around each image, not around the whole loop. One corrupt file should not abandon four hundred good ones.

## Project: watermark every image

The script that earns its keep: a folder of proofs, one logo, a consistent mark in the corner.

```python
from pathlib import Path
from PIL import Image

logo = Image.open("logo.png").convert("RGBA")
logo.thumbnail((160, 160))
logo.putalpha(110)

for path in Path("proofs").glob("*.jpg"):
    with Image.open(path) as photo:
        photo = photo.convert("RGBA")
        x = photo.width - logo.width - 24
        y = photo.height - logo.height - 24
        photo.paste(logo, (x, y), logo)
        photo.convert("RGB").save(path.with_name(f"marked-{path.name}"), quality=88)
    print("marked", path.name)
```

Saving under a new name keeps the originals. When you are confident, flip the output path and the originals become the backup.

## Transparency and compositing

A PNG or WebP can carry an alpha channel: a fourth number per pixel saying how opaque it is. A JPEG cannot, and opening one as `RGBA` gives every pixel an alpha of 255.

```python
from PIL import Image

logo = Image.open("logo.png").convert("RGBA")
print(logo.getpixel((0, 0)))   # (r, g, b, 0) for a transparent corner
```

The `convert` matters. An image opened in `RGB` and pasted onto another ignores its transparency and leaves a black box where the background should be. `RGBA` is the mode that keeps the fourth channel.

`paste` replaces pixels, including transparent ones. `alpha_composite` blends them according to the alpha, which is what you want for a logo over a photo:

```python
base = Image.open("photo.jpg").convert("RGBA")
base.alpha_composite(logo, (40, 40))
base.convert("RGB").save("badge.jpg", quality=90)
```

The final `convert("RGB")` is required to save as JPEG; a JPEG has no alpha channel and the library refuses the mode rather than guessing.

Alpha is also a mask you can build. A grayscale image used as a mask controls the blend per pixel: white keeps the layer, black keeps the base, grey mixes.

```python
mask = Image.new("L", base.size, 0)
mask.paste(255, (40, 40, 40 + logo.width, 40 + logo.height))
base.paste(logo, (40, 40), mask)
```

That is how you place an opaque image with a soft edge: blur the mask and the hard boundary becomes a fade. `mask.filter(ImageFilter.GaussianBlur(12))` is the whole technique.

Two smaller facts save time. Resizing an `RGBA` image resamples the alpha too, so edges can darken against a new background; `convert("RGB")` first, or composite against the final background, avoids it. And `putalpha(128)` on an `RGBA` image sets every pixel to half opacity, which is the shortest watermark you will ever write.

## Saving for the screen

Format and quality settings decide whether a page loads quickly. The defaults are rarely the best choice.

**JPEG** for photographs, with `quality` between 75 and 90 and `optimize=True`:

```python
photo.save("photo.jpg", quality=82, optimize=True, progressive=True)
```

`quality=95` roughly doubles the file for a difference nobody sees on a screen. Below 70, gradients band. `progressive=True` stores the image so a browser can show a blurry whole before the details arrive, which feels faster even though the bytes are the same.

**PNG** for screenshots, diagrams, and anything with transparency. It is lossless, so there is no quality knob; the win comes from reducing colours when the image has few:

```python
flat = image.convert("P", palette=Image.Palette.ADAPTIVE, colors=64)
flat.save("diagram.png", optimize=True)
```

A screenshot of text has far fewer than 256 colours, and palette mode can cut it in half with no visible change. A photograph in palette mode looks posterised; do not use it there.

**WebP** beats both for most web images at the same visual quality, and every current browser reads it:

```python
image.save("photo.webp", quality=80, method=6)
```

This site's images are not the place to be clever: pick one format per kind of image, set the quality once, and keep the original. Resizing to the size it will be displayed is worth more than any encoder setting — a 4000-pixel photograph shown in a 600-pixel column is five times the bytes for no visible gain.

`dpi` and `exif` are metadata, not pixels. Setting `dpi=(300, 300)` tells a printer how to size the image and does not add detail; passing `exif=image.info.get("exif")` keeps the camera data through a rotate, which is why a phone photo comes back the right way up in other software after you have edited it.

## Doubts worth settling

**Why did saving as JPEG turn my transparent logo black?** JPEG has no alpha channel, so transparent
pixels have no colour to keep and often become black or white. Use PNG or WebP when transparency
matters, and convert to RGB deliberately — with a chosen background colour — when it does not.

**Does resizing make a file smaller?** Usually, but the format matters more. A full-resolution photo
saved at quality 60 is often smaller than a half-size one at quality 95. Resize to the pixels the
screen needs, then choose the quality, and compare file sizes rather than assuming.

**What is the difference between `resize` and `thumbnail`?** `resize` does exactly what you ask,
even if it stretches the image. `thumbnail` keeps the aspect ratio and fits within the box. For
galleries, `thumbnail` is almost always what you meant.

**Why does `rotate(90)` not work like my phone's rotate?** `rotate` turns the pixels; EXIF
orientation is a tag that tells viewers how to turn them. Use `ImageOps.exif_transpose` first, or a
photo may appear sideways only in some programs.

**Do I always need to convert the mode?** Paste, alpha compositing, and some filters need both
images in the same mode. `convert("RGBA")` before compositing avoids the `ValueError` that appears
otherwise; convert back to `RGB` before saving as JPEG.

**Why does my text look ragged?** The default bitmap font is tiny. Load a TrueType font at the size
you need, and anchor the text properly — `anchor="mm"` centres it, which is far easier than
guessing offsets.

## A slow read of one script

```python
from pathlib import Path
from PIL import Image, ImageOps

for path in sorted(Path("photos").glob("*.jpg")):
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((1200, 1200))
        target = path.with_name(f"{path.stem}-web.jpg")
        image.convert("RGB").save(target, quality=82, optimize=True)
    print(path.name, "->", target.name, target.stat().st_size // 1024, "kB")
```

`with Image.open` closes the file handle promptly, which matters in a loop over hundreds of photos.
`exif_transpose` applies the camera's orientation tag so the output matches what you saw.
`thumbnail` never enlarges and keeps proportions. `convert("RGB")` is required because a CMYK or
palette image cannot be written as JPEG directly. A new filename leaves the originals untouched, and
printing the size turns quality choices into measurements instead of opinions.

## Practice questions

- What do `size` and `mode` tell you, and which one changes when you save to JPEG?
- Why is `thumbnail` often better than `resize` for previews?
- How do you rotate an image without cropping its corners?
- What happens when you paste an `RGBA` image without a mask, and how do you avoid it?
- Why does `textbbox` exist when `draw.text` already knows where the text goes?
- Write a script that puts a translucent logo in the bottom-right of every image in a folder.
- Find the three most common colours in a photo and print their counts.
