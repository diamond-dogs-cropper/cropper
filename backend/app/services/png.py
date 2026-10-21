import struct
import zlib
from collections.abc import Iterator

from app.errors import AppError

SIGNATURE = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def invalid(reason: str) -> AppError:
    return AppError(422, "invalid_png", f"Файл не является корректным PNG: {reason}")


def iter_chunks(data: bytes) -> Iterator[tuple[bytes, bytes]]:
    position = len(SIGNATURE)
    while True:
        if position + 12 > len(data):
            raise invalid("файл обрезан")
        length, kind = struct.unpack(">I4s", data[position : position + 8])
        end = position + 8 + length
        if end + 4 > len(data):
            raise invalid("файл обрезан")
        body = data[position + 8 : end]
        if struct.unpack(">I", data[end : end + 4])[0] != zlib.crc32(kind + body):
            raise invalid("контрольная сумма куска не совпала")
        position = end + 4
        yield kind, body
        if kind == b"IEND":
            break

    if position != len(data):
        raise invalid("лишние данные после конца файла")


def read_size(data: bytes) -> tuple[int, int]:
    if not data.startswith(SIGNATURE):
        raise invalid("нет сигнатуры PNG")

    chunks = iter_chunks(data)
    kind, body = next(chunks)
    if kind != b"IHDR" or len(body) != 13:
        raise invalid("нет заголовка IHDR")
    header = struct.unpack(">IIBBBBB", body)
    compressed = b"".join(chunk for name, chunk in chunks if name == b"IDAT")
    check_pixels(header, compressed)
    return header[0], header[1]


def check_pixels(header: tuple[int, ...], compressed: bytes) -> None:
    width, height, depth, color, compression, filtering, interlace = header
    if not (width and height and color in CHANNELS and compression == 0 and filtering == 0):
        raise invalid("неверный заголовок")
    if interlace not in (0, 1):
        raise invalid("неверный заголовок")

    row_bytes = (width * CHANNELS[color] * depth + 7) // 8
    expected = height * (row_bytes + 1)
    limit = 2 * height * (width * 8 + 1) if interlace else expected

    inflater = zlib.decompressobj()
    try:
        raw = inflater.decompress(compressed, limit + 1)
    except zlib.error as error:
        raise invalid("данные изображения повреждены") from error
    unfinished = not inflater.eof or inflater.unconsumed_tail or inflater.unused_data
    if unfinished or len(raw) > limit or (not interlace and len(raw) != expected):
        raise invalid("данные изображения повреждены или обрезаны")
