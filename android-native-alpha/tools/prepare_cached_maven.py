#!/usr/bin/env python3
"""Expose already downloaded Gradle artifacts through an optional file Maven repo.
Does not manufacture missing jars or metadata, and does not modify the cache.
"""
from pathlib import Path
import os
cache = Path.home() / '.gradle/caches/modules-2/files-2.1'
repo = Path('/root/Android/maven')
count = 0
for group in cache.iterdir():
    if not group.is_dir():
        continue
    for artifact in group.iterdir():
        if not artifact.is_dir():
            continue
        for version in artifact.iterdir():
            if not version.is_dir():
                continue
            for content in version.glob('*/*'):
                if content.is_file():
                    target = repo / group.name.replace('.', '/') / artifact.name / version.name / content.name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    if not target.exists():
                        os.symlink(content, target)
                        count += 1
print(f'Linked {count} existing artifacts into {repo}')
