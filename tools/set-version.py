"""Stamps a version number on every CSS and JavaScript link.

Browsers keep copies of files they have already downloaded. Without a
version, a player could get the new index.html together with old saved
copies of the scripts, and the game would break. Changing the version
makes every browser fetch fresh copies of all the files together.

Run it from the project folder before publishing a change:

    python3 tools/set-version.py
"""

import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
version = time.strftime("%Y%m%d%H%M")

# index.html: the stylesheets and the main script.
page = ROOT / "index.html"
html = page.read_text()
html = re.sub(r'((?:css/[\w-]+\.css|js/main\.js))(\?v=[^"]*)?"', rf'\1?v={version}"', html)
page.write_text(html)

# Every import between the game's own scripts.
for script in sorted((ROOT / "js").glob("*.js")):
    code = script.read_text()
    code = re.sub(r"from '(\./[\w-]+\.js)(\?v=[^']*)?'", rf"from '\1?v={version}'", code)
    script.write_text(code)

print(f"Version set to {version}")
