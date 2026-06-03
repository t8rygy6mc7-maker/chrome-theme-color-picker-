#!/usr/bin/env python3
"""Generate the extension's PNG icons with no third-party dependencies.

Draws a rounded-square gradient tile with a white "picker" dot, anti-aliased
via 4x4 supersampling, and writes 16/32/48/128 px PNGs into ./icons.
"""
import os
import struct
import zlib

TOP = (138, 123, 240)     # accent-light
BOTTOM = (75, 63, 176)     # accent-dark
DOT = (255, 255, 255)


def rounded_box_sdf(px, py, w, h, r):
    """Signed distance to a rounded rectangle; <= 0 means inside."""
    qx = abs(px - w / 2) - (w / 2 - r)
    qy = abs(py - h / 2) - (h / 2 - r)
    ax, ay = max(qx, 0.0), max(qy, 0.0)
    return (ax * ax + ay * ay) ** 0.5 + min(max(qx, qy), 0.0) - r


def sample(px, py, size):
    r = size * 0.22
    if rounded_box_sdf(px, py, size, size, r) > 0:
        return (0, 0, 0, 0)
    # vertical gradient
    t = py / size
    base = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
    # centered dot
    dx, dy = px - size / 2, py - size / 2
    if (dx * dx + dy * dy) ** 0.5 <= size * 0.17:
        return (DOT[0], DOT[1], DOT[2], 255)
    return (base[0], base[1], base[2], 255)


def render(size, ss=4):
    rows = bytearray()
    for y in range(size):
        rows.append(0)  # PNG filter type 0 for this scanline
        for x in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    px = x + (sx + 0.5) / ss
                    py = y + (sy + 0.5) / ss
                    pr, pg, pb, pa = sample(px, py, size)
                    r += pr; g += pg; b += pb; a += pa
            n = ss * ss
            rows += bytes((r // n, g // n, b // n, a // n))
    return bytes(rows)


def chunk(tag, data):
    out = struct.pack(">I", len(data)) + tag + data
    return out + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, size):
    raw = render(size)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(os.path.join(out_dir, f"icon{size}.png"), size)
        print(f"wrote icons/icon{size}.png")


if __name__ == "__main__":
    main()
