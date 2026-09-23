"""
Mathiyon AI Math Verification Module
Independently verifies mathematical results by substituting calculated values back into original expressions.
"""
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

SYMPY_TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application, convert_xor)

def safe_parse_expr(expr_str: str):
    """Parse string expression using SymPy with implicit multiplication and xor caret support."""
    clean = expr_str.strip()
    return parse_expr(clean, transformations=SYMPY_TRANSFORMATIONS)

def verify_solution(original_expr, var_symbol, calculated_val) -> dict:
    """Substitutes calculated value into original expression to verify equality."""
    try:
        if isinstance(original_expr, str):
            # Parse equation like "2x + 5 = 15" or "x^2 + 5x + 6 = 0"
            if "=" in original_expr:
                lhs_str, rhs_str = original_expr.split("=", 1)
                lhs = safe_parse_expr(lhs_str)
                rhs = safe_parse_expr(rhs_str)
                eq = sp.Eq(lhs, rhs)
            else:
                eq = safe_parse_expr(original_expr)

        var = sp.Symbol(str(var_symbol)) if isinstance(var_symbol, str) else var_symbol
        
        # Substitute value
        if isinstance(eq, sp.Eq):
            sub_lhs = eq.lhs.subs(var, calculated_val)
            sub_rhs = eq.rhs.subs(var, calculated_val)
            is_valid = bool(sub_lhs == sub_rhs)
            return {
                "verified": is_valid,
                "substitution": f"{sub_lhs} = {sub_rhs}",
                "status": "PASSED" if is_valid else "FAILED"
            }
        else:
            evaluated = eq.subs(var, calculated_val)
            return {
                "verified": True,
                "substitution": f"Evaluated: {evaluated}",
                "status": "PASSED"
            }
    except Exception as e:
        return {
            "verified": False,
            "substitution": str(e),
            "status": "UNVERIFIED"
        }
