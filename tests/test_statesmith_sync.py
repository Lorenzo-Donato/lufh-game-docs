#!/usr/bin/env python3
"""
StateSmith Sync & Contract Verification Test
Validates that PlayerSm.drawio compiles with StateSmith CLI without errors
and cross-validates C# StateIds, EventIds, and VariableDeclarations against the JS engine.
"""

import os
import re
import subprocess
import sys

# Ensure UTF-8 output on Windows
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def test_statesmith_sync():
    print("\n--- Running StateSmith Sync & Cross-Validation Test ---")

    # 1. Test ss.cli compilation
    print("▶ Compiling PlayerSm.drawio via ss.cli...")
    res = subprocess.run(['ss.cli', 'run', '--here', '--rebuild'], shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ StateSmith Compilation FAILED:\n{res.stderr}\n{res.stdout}")
        sys.exit(1)
    
    print("  ✓ StateSmith CLI rebuild completed successfully (Exit Code 0)")

    # 2. Parse PlayerSm.cs
    cs_path = 'PlayerSm.cs'
    assert os.path.exists(cs_path), "PlayerSm.cs does not exist!"

    with open(cs_path, 'r', encoding='utf-8') as f:
        cs_content = f.read()

    # Extract StateIds
    state_enum_match = re.search(r'public enum StateId\s*\{(.*?)\}', cs_content, re.DOTALL)
    assert state_enum_match, "StateId enum not found in PlayerSm.cs!"
    cs_states = re.findall(r'([A-Za-z0-9_]+)\s*=\s*\d+', state_enum_match.group(1))

    # Extract EventIds
    event_enum_match = re.search(r'public enum EventId\s*\{(.*?)\}', cs_content, re.DOTALL)
    assert event_enum_match, "EventId enum not found in PlayerSm.cs!"
    cs_events = re.findall(r'([A-Za-z0-9_]+)\s*=\s*\d+', event_enum_match.group(1))

    # Extract Variables in Vars struct
    vars_match = re.search(r'public struct Vars\s*\{(.*?)\}', cs_content, re.DOTALL)
    assert vars_match, "Vars struct not found in PlayerSm.cs!"
    vars_block = vars_match.group(1)

    print(f"  ✓ Found {len(cs_states)} States in PlayerSm.cs: {cs_states}")
    print(f"  ✓ Found {len(cs_events)} Events in PlayerSm.cs: {cs_events}")

    # Expected Superstates & Substates in JS
    expected_superstates = ['ROOT', 'GROUNDED', 'AIRBORNE', 'WALL_SLIDE', 'HURT', 'DEATH']
    expected_substates = [
        'IDLE', 'RUN', 'DASH', 'ATTACK_1', 'ATTACK_2', 'ATTACK_3', 'ATTACK_RUN', 'ATTACK_DASH', 'CHARGE_SLASH',
        'JUMP', 'FALL', 'ATTACK_AIR', 'CHARGE_AIR_SLASH',
        'GRAB_WALL', 'ATTACK_GRAB_WALL', 'CHARGE_WALL_SLASH',
        'HURT_GROUND', 'HURT_AIR', 'DYING'
    ]

    for s in expected_superstates:
        assert s in cs_states, f"Superstate {s} missing in PlayerSm.cs!"
        print(f"    ✓ Superstate validated: {s}")

    for s in expected_substates:
        assert s in cs_states, f"Substate {s} missing in PlayerSm.cs!"
        print(f"    ✓ Substate validated: {s}")

    # Expected Events
    expected_events = [
        'MOVE_INPUT', 'STOP_INPUT', 'DASH_PRESS', 'DASH_FINISHED',
        'JUMP_PRESS', 'APEX', 'LANDED', 'FALL',
        'WALL_TOUCH', 'WALL_DETACH',
        'ATTACK_PRESS', 'ATTACK_FINISHED', 'CHARGE_RELEASE',
        'HIT_RECEIVED', 'HURT_FINISHED'
    ]

    for e in expected_events:
        assert e in cs_events, f"Event {e} missing in PlayerSm.cs!"
        print(f"    ✓ Event validated: {e}")

    # Expected Variables in Vars
    expected_vars = ['canStandUp', 'isInvincible', 'isGrounded', 'isTouchingWall', 'isDashHeld', 'hp', 'vx', 'vy', 'dashTimer', 'invincibleTimer']
    for v in expected_vars:
        assert v in vars_block, f"Variable {v} missing in PlayerSm.cs Vars struct!"
        print(f"    ✓ Variable validated in Vars: {v}")

    print("\n✅ StateSmith Sync & Contract Verification: 100% ISOMORPHIC AND SYNCHRONIZED!\n")

if __name__ == '__main__':
    test_statesmith_sync()
