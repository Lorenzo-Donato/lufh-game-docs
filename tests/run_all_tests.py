#!/usr/bin/env python3
"""
Master Test Suite Runner for Mega Man Zero - StateSmith HSM Architecture
Executes all unit, physics, aptitude, complexity, and StateSmith sync tests.
"""

import os
import subprocess
import sys
import time

# Ensure UTF-8 output on Windows
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TESTS = [
    {
        'id': 'BUILD',
        'name': 'Modular Source Builder (src/ -> index.html)',
        'cmd': ['python', 'build.py'],
        'type': 'build'
    },
    {
        'id': 'UNIT_SM',
        'name': 'Unit Tests: StateSmith HSM Transitions (PlayerSm)',
        'cmd': ['node', 'tests/test_unit_state_machine.js'],
        'type': 'unit'
    },
    {
        'id': 'UNIT_COMBAT',
        'name': 'Unit Tests: Combat, Physics & Geometry',
        'cmd': ['node', 'tests/test_unit_combat_physics.js'],
        'type': 'unit'
    },
    {
        'id': 'COMPLEXITY',
        'name': 'Static Analysis: McCabe Cyclomatic Complexity',
        'cmd': ['python', 'tests/test_cyclomatic_complexity.py'],
        'type': 'lint'
    },
    {
        'id': 'APTITUDE',
        'name': 'Aptitude & Integration: Autonomous Gameplay Playthrough',
        'cmd': ['node', 'tests/test_aptitude_simulation.js'],
        'type': 'integration'
    },
    {
        'id': 'STATESMITH',
        'name': 'StateSmith Contract Verification & C# Isomorphism',
        'cmd': ['python', 'tests/test_statesmith_sync.py'],
        'type': 'contract'
    }
]

def run_all():
    print("=" * 70)
    print(" 🎮 MEGA MAN ZERO - STATESMITH HSM AUTOMATED TEST BATTERY 🎮")
    print("=" * 70)
    
    start_time = time.time()
    passed_count = 0
    total_count = len(TESTS)
    results = []

    for t in TESTS:
        print(f"\n▶ [{t['id']}] Running {t['name']}...")
        sub_start = time.time()
        res = subprocess.run(
            t['cmd'],
            shell=(sys.platform == 'win32'),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        sub_duration = time.time() - sub_start

        if res.returncode == 0:
            passed_count += 1
            results.append((t, True, sub_duration, res.stdout))
            print(f"  ✅ [{t['id']}] PASSED in {sub_duration:.2f}s")
        else:
            results.append((t, False, sub_duration, res.stderr + "\n" + res.stdout))
            print(f"  ❌ [{t['id']}] FAILED in {sub_duration:.2f}s")
            print(res.stderr or res.stdout)

    total_duration = time.time() - start_time

    print("\n" + "=" * 70)
    print(" 📊 FINAL TEST BATTERY SUMMARY REPORT")
    print("=" * 70)
    for t, ok, dur, out in results:
        status_str = "PASSED ✓" if ok else "FAILED ✗"
        print(f"  [{status_str:9s}] {t['name']:<50} ({dur:.2f}s)")

    print("-" * 70)
    print(f"Total Suites: {total_count} | Passed: {passed_count} | Failed: {total_count - passed_count}")
    print(f"Total Execution Time: {total_duration:.2f}s")
    print("=" * 70)

    if passed_count == total_count:
        print("\n🎉 ALL TESTS PASSED! Project is in pristine condition and 100% synchronized!\n")
        sys.exit(0)
    else:
        print("\n⚠️ Some tests failed. Check logs above.\n")
        sys.exit(1)

if __name__ == '__main__':
    run_all()
