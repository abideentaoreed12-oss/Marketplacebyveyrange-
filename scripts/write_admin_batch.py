#!/usr/bin/env python3
import base64
from pathlib import Path
a = Path("scripts/admin_actions.b64.part1").read_text() + Path("scripts/admin_actions.b64.part2").read_text()
p = Path("scripts/admin_page.b64.part1").read_text() + Path("scripts/admin_page.b64.part2").read_text()
Path("src/app/admin/actions.ts").write_bytes(base64.b64decode(a))
Path("src/app/admin/page.tsx").write_bytes(base64.b64decode(p))
print("written", Path("src/app/admin/actions.ts").stat().st_size, Path("src/app/admin/page.tsx").stat().st_size)
