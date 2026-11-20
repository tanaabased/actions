#!/usr/bin/env python3
"""Compare action fixtures with Codex installs in fresh local marketplaces."""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory


FIXTURES = Path(__file__).resolve().parent / "fixture"
VALIDATOR = FIXTURES.parents[1] / "scripts" / "validate_plugin.py"
CASES = (
    ("valid", "valid", True, True),
    ("portable", "portable", True, True),
    ("fallback", "fallback", True, True),
    ("malformed", "malformed", False, False),
    ("invalid", "invalid", False, False),
    ("invalid-version", "invalid-version", False, False),
    ("invalid-portable", "invalid-portable", False, False),
    ("invalid-overlay", "invalid-overlay", False, False),
    # marketplace name agreement is outside directory-only validation.
    ("valid", "different-name", True, False),
    ("no-manifest", "no-manifest", True, True),
)


def compare(codex, fixture, name, validator_ok, install_ok):
    with TemporaryDirectory(prefix="codex-fixture-") as directory:
        root = Path(directory).resolve()
        home = root / "home"
        (home / ".codex").mkdir(parents=True)
        env = {
            "HOME": str(home),
            "CODEX_HOME": str(home / ".codex"),
            "PATH": os.environ["PATH"],
        }
        plugin = root / "plugins" / fixture
        if fixture == "no-manifest":
            plugin.mkdir(parents=True)
        else:
            shutil.copytree(FIXTURES / fixture, plugin)
        catalog = root / ".agents" / "plugins" / "marketplace.json"
        catalog.parent.mkdir(parents=True)
        catalog.write_text(json.dumps({
            "name": "validation-fixtures",
            "plugins": [{
                "name": name,
                "source": f"./plugins/{fixture}",
                "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
                "category": "Other",
            }],
        }), encoding="utf-8")

        subprocess.run(
            [codex, "plugin", "marketplace", "add", str(root)],
            cwd=root, env=env, check=True, timeout=30,
        )
        for command, expected in (
            ([sys.executable, str(VALIDATOR), str(plugin)], validator_ok),
            ([codex, "plugin", "add", f"{name}@validation-fixtures"], install_ok),
        ):
            result = subprocess.run(
                command, cwd=root, env=env, capture_output=True, text=True, timeout=30,
            )
            if (result.returncode == 0) != expected:
                raise SystemExit(f"{fixture} ({name}): unexpected result from {command[0]}\n"
                                 f"{result.stdout}{result.stderr}")
        print(f"{fixture} ({name}): validator={validator_ok}, install={install_ok}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("codex")
    args = parser.parse_args()
    codex = str(Path(args.codex).absolute())
    version = subprocess.check_output([codex, "--version"], text=True).strip()
    if version != "codex-cli 0.170.0":
        raise SystemExit(f"Expected codex-cli 0.170.0; got {version}")
    print(version, flush=True)
    for case in CASES:
        compare(codex, *case)


if __name__ == "__main__":
    main()
