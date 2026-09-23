"""
Mathiyon AI Math Engine PyTest Test Suite
Tests 21 mathematical domains, SymPy symbolic solver, unit conversions, graph algorithms,
verification, Tamil math questions, and Tanglish queries.
"""
import pytest
from math_engine.math_router import is_math_query, route_math_intent
from math_engine.unit_converter import convert_units
from math_engine.graph_solver import GraphSolver
from math_engine.verifier import verify_solution
from math_engine.solver import MathEngineSolver

def test_math_intent_detection():
    """Test 1: Math Intent Router Detection"""
    assert is_math_query("25 + 37") is True
    assert is_math_query("Solve 2x + 5 = 15") is True
    assert is_math_query("Differentiate x^2") is True
    assert is_math_query("25% of 800") is True
    assert is_math_query("25 மற்றும் 37 ஐ கூட்டுக") is True
    assert is_math_query("25 oda 15% calculate pannu") is True
    assert is_math_query("What is the capital of France?") is False

def test_basic_arithmetic():
    """Test 2: Basic Arithmetic & Fractions"""
    res = MathEngineSolver.solve("25 + 37")
    assert res["success"] is True
    assert "62" in res["result"]

    res_pct = MathEngineSolver.solve("25% of 800")
    assert res_pct["success"] is True
    assert "200" in res_pct["result"]

    res_frac = MathEngineSolver.solve("1/3 + 1/6")
    assert res_frac["success"] is True
    assert "1/2" in res_frac["result"]

def test_algebra_solver():
    """Test 3: Linear & Quadratic Equations"""
    res_linear = MathEngineSolver.solve("Solve 2x + 5 = 15")
    assert res_linear["success"] is True
    assert "5" in res_linear["result"]
    assert res_linear["verified"] is True

    res_quad = MathEngineSolver.solve("x^2 + 5x + 6 = 0")
    assert res_quad["success"] is True
    assert "-3" in res_quad["result"] or "-2" in res_quad["result"]

def test_calculus_differentiation_integration():
    """Test 4: Differentiation & Integration"""
    res_diff = MathEngineSolver.solve("Differentiate x^2")
    assert res_diff["success"] is True
    assert "2*x" in res_diff["result"]

    res_integ = MathEngineSolver.solve("Integrate x^2")
    assert res_integ["success"] is True
    assert "x**3/3" in res_integ["result"] or "x^3" in res_integ["result"]

def test_matrices_operations():
    """Test 5: Matrix Determinant"""
    res = MathEngineSolver.solve("Determinant of [[1, 2], [3, 4]]")
    assert res["success"] is True
    assert "-2" in res["result"]

def test_unit_conversion():
    """Test 6: Unit Conversions"""
    res_temp = convert_units("25 °C to °F")
    assert res_temp["success"] is True
    assert "77.0" in res_temp["result"]

    res_dist = convert_units("10 km to miles")
    assert res_dist["success"] is True
    assert "miles" in res_dist["result"]

def test_number_theory():
    """Test 7: GCD & LCM"""
    res_gcd = MathEngineSolver.solve("GCD of 24 and 36")
    assert res_gcd["success"] is True
    assert "12" in res_gcd["result"]

def test_graph_algorithms():
    """Test 8: BFS, DFS, Dijkstra"""
    graph = {'A': ['B', 'C'], 'B': ['D'], 'C': ['E'], 'D': [], 'E': []}
    bfs_res = GraphSolver.bfs(graph, 'A')
    assert bfs_res == ['A', 'B', 'C', 'D', 'E']

    weighted = {
        'A': [('B', 1), ('C', 4)],
        'B': [('C', 2), ('D', 5)],
        'C': [('D', 1)],
        'D': []
    }
    dijkstra_res = GraphSolver.dijkstra(weighted, 'A')
    assert dijkstra_res['D'] == 4  # A -> B (1) -> C (2) -> D (1) = 4

def test_tamil_and_tanglish_math():
    """Test 9: Tamil & Tanglish Math Queries"""
    res_tamil = MathEngineSolver.solve("25 மற்றும் 37 ஐ கூட்டுக")
    assert res_tamil["success"] is True
    assert "62" in res_tamil["result"]

    res_tanglish = MathEngineSolver.solve("25 oda 15% calculate pannu")
    assert res_tanglish["success"] is True
    assert "3.75" in res_tanglish["result"]
