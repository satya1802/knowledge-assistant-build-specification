"""Test-suite-wide setup.

Forces offline mode before anything imports `app.config`, so the automated
suite always runs against the deterministic local stub -- no network, and no
dependency on whether a real `GEMINI_API_KEY` happens to be set in the
environment (AC-099). Individual tests that need to exercise the online
Gemini provider construct it directly rather than relying on this default.
"""

import os

os.environ["GEMINI_OFFLINE"] = "1"
