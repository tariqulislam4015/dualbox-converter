#!/usr/bin/env python3
"""Build the single-file app: inlines src/core.js and the images into index.html.
Usage:  python3 build.py
"""
import base64, pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
b64 = lambda p: base64.b64encode((src / "assets" / p).read_bytes()).decode()
html = (src / "template.html").read_text(encoding="utf-8")
html = (html.replace("{{CORE}}", (src / "core.js").read_text(encoding="utf-8"))
            .replace("{{PHOTO}}", b64("photo.jpg"))
            .replace("{{CHAN}}", b64("channel.jpg")))
(root / "index.html").write_text(html, encoding="utf-8")
print(f"index.html built ({len(html)//1024} KB)")
