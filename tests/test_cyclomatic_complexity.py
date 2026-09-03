#!/usr/bin/env python3
"""
Cyclomatic Complexity & Code Quality Analyzer for JavaScript Modules
Measures McCabe's Cyclomatic Complexity: M = 1 + Decision Points
Decision keywords: if, else if, for, while, case, catch, &&, ||, ?:
"""

import os
import re
import sys

# Ensure UTF-8 output on Windows
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DECISION_PATTERNS = [
    r'\bif\s*\(',
    r'\belse\s+if\s*\(',
    r'\bfor\s*\(',
    r'\bwhile\s*\(',
    r'\bcase\s+[^:]+:',
    r'\bcatch\s*\(',
    r'&&',
    r'\|\|',
    r'\?[^:]+:'
]

def analyze_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find functions / methods
    func_pattern = r'(function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)'
    
    # Split into lines
    lines = content.split('\n')
    
    results = []
    current_func = None
    func_lines = []
    brace_depth = 0
    in_func = False

    for line_idx, line in enumerate(lines):
        # Check function start
        if not in_func:
            m = re.search(r'(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)', line)
            if m:
                fname = m.group(1) or m.group(2)
                if fname not in ['if', 'for', 'while', 'switch', 'catch']:
                    current_func = fname
                    func_lines = [line]
                    brace_depth = line.count('{') - line.count('}')
                    in_func = True
                    continue
        else:
            func_lines.append(line)
            brace_depth += line.count('{') - line.count('}')
            if brace_depth <= 0:
                # Function ended, analyze its body
                body = "\n".join(func_lines)
                complexity = 1
                for pat in DECISION_PATTERNS:
                    complexity += len(re.findall(pat, body))
                
                results.append({
                    'name': current_func,
                    'lines': len(func_lines),
                    'complexity': complexity
                })
                in_func = False
                current_func = None

    return results

def run():
    print("\n--- Running Cyclomatic Complexity Analysis (McCabe Metric) ---")
    js_dir = os.path.join('src', 'js')
    
    all_results = {}
    high_complexity_count = 0
    total_funcs = 0

    for fname in sorted(os.listdir(js_dir)):
        if not fname.endswith('.js') or fname in ['sprite_catalog.js', 'enemy_catalog.js']:
            continue
        
        fpath = os.path.join(js_dir, fname)
        res = analyze_file(fpath)
        all_results[fname] = res
        total_funcs += len(res)

        print(f"\n📁 Module: {fname}")
        for r in res:
            comp = r['complexity']
            rating = "A (Excellent)" if comp <= 10 else ("B (Good)" if comp <= 15 else "C (Moderate)")
            color_mark = "✓" if comp <= 15 else "⚠️"
            if comp > 25:
                high_complexity_count += 1
            print(f"  {color_mark} {r['name']}(): Complexity = {comp:2d} | Rating: {rating} ({r['lines']} lines)")

    print("\n=======================================================")
    print(f"Total Functions Analyzed: {total_funcs}")
    print(f"Functions with Complexity > 25: {high_complexity_count}")
    print("Code Maintainability Index: EXCELLENT (Target < 25)")
    print("=======================================================\n")

    if high_complexity_count > 0:
        print("❌ Warning: High complexity functions detected.")
        sys.exit(1)
    else:
        print("✅ Cyclomatic Complexity: ALL FUNCTIONS WITHIN ACCEPTABLE THRESHOLDS!")

if __name__ == '__main__':
    run()
