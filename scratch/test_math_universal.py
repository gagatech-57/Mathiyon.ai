import sys
import os
import json
sys.path.insert(0, r'c:\DISK-D\Personal folder\Mathiyon\ai-service')

from math_engine.solver import MathEngineSolver

test_queries = [
    # 1. Comparisons
    ("3 > 5", "No, 3 > 5, False"),
    ("3 = 3", "Yes, 3 = 3, True"),
    ("3 < 5", "Yes, 3 < 5, True"),
    ("5 >= 5", "Yes, 5 >= 5, True"),
    ("4 <= 3", "No, 4 <= 3, False"),
    ("3 != 5", "Yes, 3 != 5, True"),
    ("is 3 greater than 5?", "No, 3 > 5, False"),
    ("is 3 equal to 3?", "Yes, 3 = 3, True"),
    ("does 3 equal 3?", "Yes, 3 = 3, True"),
    ("is 10 greater than or equal to 5?", "Yes, 10 >= 5, True"),
    ("check whether 3 > 5", "No, 3 > 5, False"),
    ("compare 3 and 5", "Yes, 3 < 5, True"),
    
    # 2. Arithmetic & Decimal Precision
    ("2.344 + 1.2", "3.544"),
    ("0.1 + 0.2", "0.3"),
    ("25 * 30", "750"),
    ("100 / 4", "25"),
    ("5 - 10", "-5"),
    ("2 + 3 * 4", "14"),
    ("(2 + 3) * 4", "20"),

    # 3. Fractions & Roots
    ("2/4", "1/2"),
    ("2/3 + 1/3", "1"),
    ("1/3 + 1/6", "1/2"),
    ("1/3", "1/3"),
    ("sqrt(144)", "12"),
    ("sqrt(2)", "1.4142135624"),

    # 4. Percentages
    ("25% of 200", "50"),
    ("15% of 80", "12"),
    ("200 increased by 10%", "220"),
    ("500 decreased by 20%", "400"),

    # 5. Algebra & Calculus
    ("2x + 5 = 15", "x = 5"),
    ("10x - 45 = 40", "17/2"),
    ("x^2 - 5x + 6 = 0", "x = 2, 3"),
    ("x + y = 10, 2x - y = 5", "x = 5, y = 5"),
    ("differentiate x^2", "2*x"),
    ("integrate x^2", "x^3/3 + C"),
    ("limit of sin(x)/x as x approaches 0", "1"),
    ("det([[1, 2], [3, 4]])", "-2"),
    ("|-10|", "10"),
    ("mean of [10, 20, 30]", "20")
]

print("=== TESTING MATHIYON UNIVERSAL MATH ENGINE ===")
passed = 0
failed = 0

for q, expected in test_queries:
    res = MathEngineSolver.solve(q)
    ans = res.get("displayAnswer") or res.get("result") or res.get("exactAnswer") or ""
    # Safe ascii representation
    ans_safe = str(ans).encode('ascii', 'replace').decode('ascii')
    exp_safe = str(expected).encode('ascii', 'replace').decode('ascii')
    
    is_ok = (expected in str(ans)) or (exp_safe in ans_safe)
    if is_ok:
        passed += 1
        print(f"[PASS] '{q}' => '{ans_safe}'")
    else:
        failed += 1
        print(f"[FAIL] '{q}' => Expected '{exp_safe}', got '{ans_safe}'")

print(f"\nRESULTS: {passed} / {len(test_queries)} PASSED ({round(passed/len(test_queries)*100)}%)")
