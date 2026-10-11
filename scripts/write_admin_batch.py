#!/usr/bin/env python3
import base64
from pathlib import Path
Path("src/app/admin/actions.ts").write_bytes(base64.b64decode(Path("scripts/admin_actions.b64").read_text()))
Path("src/app/admin/page.tsx").write_bytes(base64.b64decode(Path("scripts/admin_page.b64").read_text()))
print("written", Path("src/app/admin/actions.ts").stat().st_size, Path("src/app/admin/page.tsx").stat().st_size)
