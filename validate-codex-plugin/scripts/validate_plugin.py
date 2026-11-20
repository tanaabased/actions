#!/usr/bin/env python3
"""Check local Codex manifest requirements without installing or running plugins."""

import argparse
import json
import re
import stat
from pathlib import Path


AGENT_SCHEMA_PREFIX = "https://agent-plugins.org/schemas/"
AGENT_SCHEMA = AGENT_SCHEMA_PREFIX + "1.0.0/plugin.schema.json"
COMPATIBILITY_MANIFESTS = (
    ".codex-plugin/plugin.json",
    ".claude-plugin/plugin.json",
    ".cursor-plugin/plugin.json",
)
COMPATIBILITY_NAME = re.compile(r"[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*")
COMPATIBILITY_VERSION = re.compile(r"[A-Za-z0-9_.+-]+")
AGENT_NAME = re.compile(r"[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?")


def reject_constant(value):
    raise ValueError(f"invalid JSON constant: {value}")


def read_manifest(path):
    try:
        contents = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"{path}: expected readable UTF-8 JSON") from error
    return parse_manifest(path, contents)


def parse_manifest(path, contents):
    try:
        manifest = json.loads(contents, parse_constant=reject_constant)
    except (ValueError, RecursionError) as error:
        raise ValueError(f"{path}: expected valid JSON") from error
    if not isinstance(manifest, dict):
        raise ValueError(f"{path}: expected JSON object")
    return manifest


def file_mode(path):
    try:
        return path.lstat().st_mode
    except FileNotFoundError:
        return None


def select_manifest(root):
    # match codex 0.170.0 find_plugin_manifest_path, including unrelated root JSON.
    path = root / "plugin.json"
    mode = file_mode(path)
    if mode is not None:
        if not stat.S_ISREG(mode):
            return None, None
        try:
            manifest = read_manifest(path)
        except ValueError:
            manifest = {}
        schema = manifest.get("$schema")
        if isinstance(schema, str) and schema.startswith(AGENT_SCHEMA_PREFIX):
            return path, manifest

    for relative_path in COMPATIBILITY_MANIFESTS:
        path = root / relative_path
        mode = file_mode(path.parent)
        if mode is None:
            continue
        if not stat.S_ISDIR(mode):
            break
        mode = file_mode(path)
        if mode is None:
            continue
        if stat.S_ISREG(mode):
            return path, read_manifest(path)
        break
    return None, None


def check_compatibility_types(path, manifest):
    if "name" in manifest and not isinstance(manifest["name"], str):
        raise ValueError(f"{path}: name must be a string when present")
    version = manifest.get("version")
    if version is not None and not isinstance(version, str):
        raise ValueError(f"{path}: version must be a string when present")


def check_portable(root, path, manifest):
    if manifest["$schema"] != AGENT_SCHEMA:
        raise ValueError(f"{path}: unsupported Agent Plugins schema; expected {AGENT_SCHEMA}")
    name = manifest.get("name")
    if not isinstance(name, str) or not AGENT_NAME.fullmatch(name) or "--" in name or ".." in name:
        raise ValueError(f"{path}: invalid Agent Plugins name")
    if "version" in manifest and not isinstance(manifest["version"], str):
        raise ValueError(f"{path}: version must be a string when present")
    # codex reads the compatibility overlay only without an OpenAI extension object.
    extensions = manifest.get("extensions")
    if isinstance(extensions, dict) and isinstance(extensions.get("com.openai"), dict):
        return
    overlay = root / COMPATIBILITY_MANIFESTS[0]
    if not overlay.is_file():
        return
    try:
        contents = overlay.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return
    check_compatibility_types(overlay, parse_manifest(overlay, contents))


def validate(root):
    if not root.is_dir():
        raise ValueError("plugin-directory must be a directory")

    path, manifest = select_manifest(root)
    if path is None:
        return "No manifest selected; installation depends on marketplace fallback."
    if path == root / "plugin.json":
        check_portable(root, path, manifest)
    else:
        check_compatibility_types(path, manifest)
        name = manifest.get("name", "")
        if name.strip() and not COMPATIBILITY_NAME.fullmatch(name):
            raise ValueError(f"{path}: invalid Codex plugin name")
        version = manifest.get("version")
        # recognized Agent Plugins schemas permit versions that CODEX encodes for storage.
        if version is not None and manifest.get("$schema") != AGENT_SCHEMA:
            version = version.strip()
            if not COMPATIBILITY_VERSION.fullmatch(version) or version in (".", ".."):
                raise ValueError(f"{path}: invalid Codex plugin version")
    return f"Manifest checks passed: {path}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plugin_path", type=Path)
    args = parser.parse_args()
    try:
        print(validate(args.plugin_path.resolve()))
    except (OSError, ValueError) as error:
        parser.exit(1, f"Plugin validation failed: {error}\n")


if __name__ == "__main__":
    main()
