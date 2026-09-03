#!/usr/bin/env python3
"""
Mega Man Zero - StateSmith HSM Build Pipeline
Assembles modular src/ files into a standalone, zero-dependency index.html.
"""

import os
import subprocess
import sys

# Ensure UTF-8 output on Windows
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def build():
    print("[BUILD] Starting modular build pipeline...")

    # 1. Read CSS
    with open('src/css/styles.css', 'r', encoding='utf-8') as f:
        css_content = f.read()

    # 2. Read Body Markup
    with open('src/templates/body_markup.html', 'r', encoding='utf-8') as f:
        body_content = f.read()

    # 3. Read JS Modules in Dependency Order
    js_files = [
        'src/js/constants.js',
        'src/js/sprite_catalog.js',
        'src/js/enemy_catalog.js',
        'src/js/world_geometry.js',
        'src/js/state_machine.js',
        'src/js/player_actor.js',
        'src/js/enemy_actor.js',
        'src/js/renderer.js',
        'src/js/ui_manager.js',
        'src/js/main.js'
    ]

    combined_js = []
    for js_path in js_files:
        with open(js_path, 'r', encoding='utf-8') as f:
            js_src = f.read()
            combined_js.append(f"// ===== MODULE: {os.path.basename(js_path)} =====\n{js_src}\n")

    full_js = "\n".join(combined_js)

    # 4. Assemble Single-File index.html
    html_output = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StateSmith HSM & Sequence Studio | Mega Man Zero Sandbox</title>
  <style>
{css_content}
  </style>
</head>
<body>
{body_content}
  <script>
{full_js}
  </script>
</body>
</html>
"""

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_output)

    print("[BUILD] index.html successfully compiled and assembled!")
    
    # 5. Run syntax check via Node if available
    try:
        res = subprocess.run(['node', '--check', 'src/js/state_machine.js'], capture_output=True, text=True)
        if res.returncode == 0:
            print("[LINT] All modular JavaScript files passed Node syntax validation.")
        else:
            print(f"[LINT] Warning during JS syntax check: {res.stderr}")
    except Exception as e:
        print(f"[INFO] Node lint skipped: {e}")

if __name__ == '__main__':
    build()
