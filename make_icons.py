#!/usr/bin/env python3
"""Generate the extension's PNG icons with no third-party dependencies.

Draws a "color palette" icon: a white rounded card on a dark background holding
a 4x3 gradient swatch grid plus a row of four accent swatches. Anti-aliased via
4x4 supersampling. Writes 16/32/48/128 px PNGs into ./icons.
"""
import os
import struct
import zlib

BG = (52, 55, 60)        # dark background
CARD = (255, 255, 255)   # white card

# 4 columns x 3 rows gradient grid (top = lightest, left = warm -> right = cool)
GRID = [
    [(244, 238, 224), (232, 241, 190), (200, 235, 207), (189, 234, 226)],
    [(247, 203, 160), (210, 232, 90), (88, 208, 124), (46, 208, 194)],
    [(240, 125, 74), (116, 192, 95), (51, 179, 137), (58, 155, 194)],
]
# bottom row of four saved/accent swatches
ACCENTS = [(213, 40, 25), (78, 122, 46), (28, 109, 84), (31, 72, 120)]


def rrect_sdf(px, py, x0, y0, x1, y1, r):
    """Signed distance to a rounded rectangle; <= 0 means inside."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hw, hh = (x1 - x0) / 2, (y1 - y0) / 2
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    ax, ay = max(qx, 0.0), max(qy, 0.0)
    return (ax * ax + ay * ay) ** 0.5 + min(max(qx, qy), 0.0) - r


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sample(px, py, S):
    # --- card geometry ---
    m = 0.07 * S
    cx0, cy0, cx1, cy1 = m, m, S - m, S - m
    card_w = S - 2 * m
    rc = 0.16 * card_w

    inside_card = rrect_sdf(px, py, cx0, cy0, cx1, cy1, rc) <= 0

    if not inside_card:
        # soft drop shadow (card shifted down a touch), then background
        off = 0.02 * S
        sd = rrect_sdf(px, py, cx0, cy0 + off, cx1, cy1 + off, rc)
        shadow = max(0.0, 1.0 - sd / (0.07 * S))
        return mix(BG, (0, 0, 0), 0.4 * shadow) + (255,)

    # --- inside the card ---
    p = 0.09 * card_w
    ix0, iy0 = cx0 + p, cy0 + p
    iw = card_w - 2 * p
    ih = iw

    top_h = 0.66 * ih
    gap_mid = 0.05 * ih
    bot_h = ih - top_h - gap_mid
    row_h = top_h / 3
    cell_w = iw / 4

    gap = 0.04 * iw
    sq = (iw - 3 * gap) / 4
    sq_y0 = iy0 + top_h + gap_mid + (bot_h - sq) / 2

    gx, gy = px - ix0, py - iy0
    if 0 <= gx < iw and 0 <= gy < ih:
        if gy < top_h:
            col = min(3, int(gx // cell_w))
            row = min(2, int(gy // row_h))
            return GRID[row][col] + (255,)
        if sq_y0 <= py < sq_y0 + sq:
            idx = int(gx // (sq + gap))
            if 0 <= idx < 4 and (gx - idx * (sq + gap)) < sq:
                return ACCENTS[idx] + (255,)
    return CARD + (255,)


def render(size, ss=4):
    rows = bytearray()
    for y in range(size):
        rows.append(0)  # PNG filter type 0 for this scanline
        for x in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    pr, pg, pb, pa = sample(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss, size)
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
