import sys
import os
sys.path.insert(0, r'c:\DISK-D\Personal folder\Mathiyon\ai-service')

from math_engine.solver import MathEngineSolver

test_cases = [
    "10x - 45 = 40",
    "2x + 5 = 15",
    "x^2 - 5x + 6 = 0",
    "x + y = 10, 2x - y = 5",
    "sqrt(144)",
    "25% of 200",
    "2/3 + 1/3",
    "derivative of x^2",
    "integral of x^2",
    "determinant of [[1, 2], [3, 4]]"
]

print("--- TESTING MATH SOLVER ---")
for tc in test_cases:
    res = MathEngineSolver.solve(tc)
    print(f"QUERY: {tc}")
    print(f"SUCCESS: {res.get('success')}")
    print(f"RESULT: {res.get('result')}")
    print(f"CATEGORY: {res.get('category')}")
    print(f"VERIFIED: {res.get('verified')}")
    print("-" * 40)
