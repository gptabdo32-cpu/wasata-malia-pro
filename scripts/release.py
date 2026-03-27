#!/usr/bin/env python3
from __future__ import annotations

import fnmatch
import os
from pathlib import Path
import zipfile

ROOT = Path.cwd()
OUT = ROOT / "wathiqly-production-ready.zip"
EXCLUDES = [
    "node_modules",
    "dist",
    ".git",
    ".manus-logs",
    "coverage",
    "__pycache__",
    "*.pyc",
    "*.pyo",
    "*.tmp",
    "*.tsbuildinfo",
    "*.zip",
    "*.log",
    "*.meta.json",
    ".gitkeep",
    ".DS_Store",
    "uploads/docs/test.txt",
    "uploads/**/*.meta.json",
    "tsconfig.strict.tmp.json",
]


def excluded(rel: str) -> bool:
    normalized = rel.replace(os.sep, "/")
    parts = normalized.split("/")
    for part in parts:
        if part in {"node_modules", "dist", ".git", ".manus-logs", "coverage", "__pycache__"}:
            return True
    for pattern in EXCLUDES:
        if fnmatch.fnmatch(normalized, pattern) or fnmatch.fnmatch(Path(normalized).name, pattern):
            return True
    return False


if OUT.exists():
    OUT.unlink()

with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if excluded(rel):
            continue
        zf.write(path, rel)

print(f"Created {OUT}")
