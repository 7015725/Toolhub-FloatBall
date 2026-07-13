#!/usr/bin/env python3
"""校验 GitHub 与 Gitea 更新源发布产物完全一致。

只使用 Python 标准库。检查入口文件、入口 SHA 公示、签名清单、清单签名，
以及清单中的全部模块文件。网络检查用于定时/手动工作流；--self-test 不访问网络。
"""

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Callable, Dict, Tuple

DEFAULT_GITHUB_ROOT = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/"
DEFAULT_GITEA_ROOT = "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/"
MAX_TEXT_BYTES = 4 * 1024 * 1024
SHA256_RE = re.compile(r"^([0-9a-fA-F]{64})(?:\s+\*?(.+))?$")
MODULE_NAME_RE = re.compile(r"^th_[0-9]{2}_[a-z0-9_]+\.js$")


class ConsistencyError(RuntimeError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_url(root: str, path: str) -> str:
    return root.rstrip("/") + "/" + path.lstrip("/")


def fetch_bytes(url: str, timeout: float, retries: int) -> bytes:
    last_error = None
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "ToolHub-Update-Source-Consistency/1.0",
                    "Accept": "*/*",
                    "Cache-Control": "no-cache",
                },
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                data = response.read(MAX_TEXT_BYTES + 1)
                if len(data) > MAX_TEXT_BYTES:
                    raise ConsistencyError("response exceeds %d bytes: %s" % (MAX_TEXT_BYTES, url))
                return data
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ConsistencyError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(min(2 ** attempt, 4))
    raise ConsistencyError("fetch failed: %s / %s" % (url, last_error))


def parse_declared_entry_hash(data: bytes, source_name: str) -> str:
    try:
        text = data.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ConsistencyError("%s ToolHub.js.sha256 is not UTF-8: %s" % (source_name, exc))
    match = SHA256_RE.match(text)
    if not match:
        raise ConsistencyError("%s ToolHub.js.sha256 has invalid format" % source_name)
    filename = (match.group(2) or "ToolHub.js").strip()
    if filename != "ToolHub.js":
        raise ConsistencyError("%s ToolHub.js.sha256 names unexpected file: %s" % (source_name, filename))
    return match.group(1).lower()


def parse_manifest(data: bytes, source_name: str) -> Dict[str, object]:
    try:
        manifest = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ConsistencyError("%s manifest.json is invalid: %s" % (source_name, exc))
    if not isinstance(manifest, dict):
        raise ConsistencyError("%s manifest root is not an object" % source_name)
    if manifest.get("alg") != "SHA256withRSA":
        raise ConsistencyError("%s manifest algorithm is not SHA256withRSA" % source_name)
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        raise ConsistencyError("%s manifest files is empty or invalid" % source_name)
    if not isinstance(manifest.get("version"), int) or int(manifest.get("version", 0)) <= 0:
        raise ConsistencyError("%s manifest version is invalid" % source_name)
    return manifest


def validate_module_name(name: str, source_name: str) -> None:
    if not MODULE_NAME_RE.match(name):
        raise ConsistencyError("%s manifest contains unsafe module path: %s" % (source_name, name))


def inspect_source(
    source_name: str,
    root: str,
    fetcher: Callable[[str], bytes],
) -> Dict[str, object]:
    manifest_bytes = fetcher(source_url(root, "manifest.json"))
    signature_bytes = fetcher(source_url(root, "manifest.sig"))
    entry_bytes = fetcher(source_url(root, "ToolHub.js"))
    entry_hash_file = fetcher(source_url(root, "ToolHub.js.sha256"))

    manifest = parse_manifest(manifest_bytes, source_name)
    declared_entry_hash = parse_declared_entry_hash(entry_hash_file, source_name)
    actual_entry_hash = sha256_bytes(entry_bytes)
    if actual_entry_hash != declared_entry_hash:
        raise ConsistencyError(
            "%s ToolHub.js hash mismatch: declared=%s actual=%s"
            % (source_name, declared_entry_hash, actual_entry_hash)
        )

    module_hashes: Dict[str, str] = {}
    files = manifest["files"]
    assert isinstance(files, dict)
    for module_name in sorted(files):
        validate_module_name(str(module_name), source_name)
        info = files[module_name]
        if not isinstance(info, dict):
            raise ConsistencyError("%s manifest entry is invalid: %s" % (source_name, module_name))
        expected_hash = str(info.get("sha256", "")).lower()
        expected_size = info.get("size")
        if not re.match(r"^[0-9a-f]{64}$", expected_hash):
            raise ConsistencyError("%s module hash is invalid: %s" % (source_name, module_name))
        if not isinstance(expected_size, int) or expected_size <= 0:
            raise ConsistencyError("%s module size is invalid: %s" % (source_name, module_name))
        module_bytes = fetcher(source_url(root, "code/" + str(module_name)))
        actual_hash = sha256_bytes(module_bytes)
        if len(module_bytes) != expected_size:
            raise ConsistencyError(
                "%s module size mismatch: %s expected=%s actual=%s"
                % (source_name, module_name, expected_size, len(module_bytes))
            )
        if actual_hash != expected_hash:
            raise ConsistencyError(
                "%s module hash mismatch: %s expected=%s actual=%s"
                % (source_name, module_name, expected_hash, actual_hash)
            )
        module_hashes[str(module_name)] = actual_hash

    return {
        "name": source_name,
        "root": root,
        "version": int(manifest["version"]),
        "release": manifest.get("release") or {},
        "manifest_sha256": sha256_bytes(manifest_bytes),
        "signature_sha256": sha256_bytes(signature_bytes),
        "entry_sha256": actual_entry_hash,
        "module_hashes": module_hashes,
    }


def compare_snapshots(left: Dict[str, object], right: Dict[str, object]) -> None:
    fields = ("version", "manifest_sha256", "signature_sha256", "entry_sha256", "module_hashes")
    differences = []
    for field in fields:
        if left.get(field) != right.get(field):
            differences.append(field)
    if differences:
        raise ConsistencyError(
            "update sources differ: %s vs %s / fields=%s"
            % (left.get("name"), right.get("name"), ",".join(differences))
        )


def format_summary(snapshot: Dict[str, object]) -> str:
    modules = snapshot.get("module_hashes") or {}
    release = snapshot.get("release") or {}
    title = release.get("title", "") if isinstance(release, dict) else ""
    return (
        "SOURCE %(name)s version=%(version)s modules=%(modules)s "
        "manifest=%(manifest)s signature=%(signature)s entry=%(entry)s title=%(title)s"
        % {
            "name": snapshot.get("name"),
            "version": snapshot.get("version"),
            "modules": len(modules),
            "manifest": str(snapshot.get("manifest_sha256", ""))[:16],
            "signature": str(snapshot.get("signature_sha256", ""))[:16],
            "entry": str(snapshot.get("entry_sha256", ""))[:16],
            "title": title,
        }
    )


def build_fixture(root: str, entry: bytes, modules: Dict[str, bytes], version: int = 1) -> Dict[str, bytes]:
    files = {}
    fixture = {}
    for name, data in modules.items():
        files[name] = {"sha256": sha256_bytes(data), "size": len(data), "version": "1.0.0"}
        fixture[source_url(root, "code/" + name)] = data
    manifest = {
        "alg": "SHA256withRSA",
        "files": files,
        "keyId": "test-key",
        "release": {"title": "self-test"},
        "schema": 3,
        "version": version,
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
    fixture[source_url(root, "manifest.json")] = manifest_bytes
    fixture[source_url(root, "manifest.sig")] = b"test-signature\n"
    fixture[source_url(root, "ToolHub.js")] = entry
    fixture[source_url(root, "ToolHub.js.sha256")] = (
        sha256_bytes(entry) + "  ToolHub.js\n"
    ).encode("utf-8")
    return fixture


def run_self_test() -> None:
    root_a = "https://source-a.invalid/"
    root_b = "https://source-b.invalid/"
    entry = b"var ok = true;\n"
    modules = {
        "th_01_base.js": b"// @version 1.0.0\n",
        "th_02_core.js": b"// @version 1.0.0\nvar core = true;\n",
    }
    fixture = {}
    fixture.update(build_fixture(root_a, entry, modules))
    fixture.update(build_fixture(root_b, entry, modules))

    def fake_fetch(url: str) -> bytes:
        if url not in fixture:
            raise ConsistencyError("missing fixture: " + url)
        return fixture[url]

    snap_a = inspect_source("a", root_a, fake_fetch)
    snap_b = inspect_source("b", root_b, fake_fetch)
    compare_snapshots(snap_a, snap_b)

    fixture[source_url(root_b, "ToolHub.js")] = b"var ok = false;\n"
    mismatch_detected = False
    try:
        inspect_source("b", root_b, fake_fetch)
    except ConsistencyError:
        mismatch_detected = True
    if not mismatch_detected:
        raise ConsistencyError("self-test did not detect entry mismatch")

    fixture.update(build_fixture(root_b, entry, modules, version=2))
    snap_b_version = inspect_source("b", root_b, fake_fetch)
    mismatch_detected = False
    try:
        compare_snapshots(snap_a, snap_b_version)
    except ConsistencyError:
        mismatch_detected = True
    if not mismatch_detected:
        raise ConsistencyError("self-test did not detect release mismatch")

    print("Update source consistency self-test passed.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--github-root", default=DEFAULT_GITHUB_ROOT)
    parser.add_argument("--gitea-root", default=DEFAULT_GITEA_ROOT)
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            run_self_test()
            return 0
        if args.timeout <= 0 or args.retries < 0:
            raise ConsistencyError("timeout and retries must be non-negative")

        fetcher = lambda url: fetch_bytes(url, args.timeout, args.retries)
        github = inspect_source("github", args.github_root, fetcher)
        gitea = inspect_source("gitea", args.gitea_root, fetcher)
        print(format_summary(github))
        print(format_summary(gitea))
        compare_snapshots(github, gitea)
        print("OK update sources are byte-consistent and all release hashes are valid.")
        return 0
    except ConsistencyError as exc:
        print("FAIL update-source-consistency: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
