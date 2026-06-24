"""
Mawasem - Product Image Downloader
Downloads farm / harvest-basket style images from Unsplash (free to use)
into media/products/ with clean lowercase slug filenames.
"""

import urllib.request
import os
import sys

DEST = r"C:\Users\USER\Desktop\Mawasem\media\products"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://unsplash.com/",
}

# Unsplash photo IDs - farm crate / harvest basket style where possible.
# URL pattern: https://images.unsplash.com/photo-<ID>?w=800&q=85&fit=crop
BASE = "https://images.unsplash.com/photo-{id}?w=800&q=85&fit=crop"

PRODUCTS = [
    # (slug, unsplash-photo-id, visual description)
    ("tomato",     "1561136594-7f68081a8519", "Tomatoes in wooden crate"),
    ("banana",     "1571771894821-ce9b6c11b08e", "Banana bunch harvest"),
    ("cucumber",   "1604977042946-1eecc30f269e", "Cucumbers in basket"),
    ("potato",     "1518977676601-b53f82aba655", "Potatoes in farm sack"),
    ("onion",      "1587049352846-4a222e784d38", "Onions in market basket"),
    ("garlic",     "1615485290382-441e4d049cb5", "Garlic bulbs in crate"),
    ("apple",      "1567306226416-28f0efdc88ce", "Red apples in wooden box"),
    ("orange",     "1547514701-42782101795e",   "Oranges in harvest basket"),
    ("strawberry", "1464965911861-746a04b4bca6", "Strawberries in punnet"),
    ("watermelon", "1587049352851-8d4e89133924", "Watermelons on farm"),
    ("carrot",     "1598170845058-32b9d6a5da37", "Carrots with soil - fresh harvest"),
    ("lettuce",    "1622205313162-be1d5712a43f", "Lettuce heads in crate"),
]

os.makedirs(DEST, exist_ok=True)

results = []
for slug, photo_id, desc in PRODUCTS:
    filename = f"{slug}.jpg"
    dest_path = os.path.join(DEST, filename)
    url = BASE.format(id=photo_id)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        # Validate JPEG / PNG magic bytes
        if data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n":
            with open(dest_path, "wb") as f:
                f.write(data)
            size_kb = len(data) // 1024
            results.append(("OK", filename, size_kb, desc))
        else:
            preview = data[:120].decode("utf-8", errors="replace")
            results.append(("SKIP", filename, 0, f"Not an image: {preview[:60]}"))
    except Exception as e:
        results.append(("FAIL", filename, 0, str(e)[:80]))

# ── Summary ───────────────────────────────────────────────────────────────
print(f"\n{'STATUS':<6}  {'FILE':<16}  {'SIZE':>6}  DESCRIPTION")
print("-" * 74)
ok = skip = fail = 0
for status, fname, kb, note in results:
    kb_str = f"{kb} KB" if kb else "-"
    print(f"{status:<6}  {fname:<16}  {kb_str:>6}  {note}")
    if status == "OK":   ok += 1
    elif status == "SKIP": skip += 1
    else: fail += 1

print("-" * 74)
print(f"Result: {ok} downloaded  |  {skip} skipped  |  {fail} failed")
print(f"Folder: {DEST}\n")
sys.exit(0 if fail == 0 else 1)
