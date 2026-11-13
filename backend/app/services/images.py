import io

from PIL import Image

MEDIA_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


def convert(png: bytes, output_format: str, background: str | None) -> bytes:
    if output_format == "png":
        return png

    image = Image.open(io.BytesIO(png)).convert("RGBA")
    result = io.BytesIO()
    if output_format == "jpg":
        plate = Image.new("RGBA", image.size, background or "#FFFFFF")
        Image.alpha_composite(plate, image).convert("RGB").save(result, "JPEG", quality=92)
    else:
        image.save(result, "WEBP", quality=92)
    return result.getvalue()
