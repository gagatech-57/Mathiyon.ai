"""
Mathiyon AI Universal Math Intent & Category Router Module
Detects and classifies mathematical expressions and natural language queries into 21 distinct mathematical categories.
Supports English, Tamil, and Tanglish mathematics.
"""
import re

MATH_KEYWORDS = [
    # English Math Terms
    "add", "subtract", "multiply", "divide", "plus", "minus", "times", "divided",
    "calculate", "compute", "solve", "equation", "evaluate", "simplify", "factor",
    "expand", "derivative", "differentiate", "integral", "integrate", "limit", "matrix",
    "determinant", "transpose", "inverse", "eigenvalue", "vector", "dot product", "cross product",
    "magnitude", "percentage", "percent", "%", "ratio", "proportion", "fraction", "gcd", "hcf",
    "lcm", "prime", "fibonacci", "quadratic", "linear", "polynomial", "logarithm", "log", "ln",
    "sin", "cos", "tan", "asin", "acos", "atan", "area", "perimeter", "volume", "surface area",
    "mean", "median", "mode", "variance", "standard deviation", "probability", "combination", "permutation",
    "convert", "celsius", "fahrenheit", "km", "miles", "kg", "pounds", "grams",
    "interest", "compound interest", "emi", "profit", "loss", "discount", "increased by", "decreased by",
    "is greater than", "is less than", "greater than or equal", "less than or equal", "is equal to",
    "does equal", "compare", "not equal",
    
    # Tamil Math Terms
    "கூட்டுக", "கழிக்க", "பெருக்குக", "வகுக்க", "கூட்டல்", "கழித்தல்", "பெருக்கல்",
    "வகுத்தல்", "சமன்பாடு", "தீர்க்கவும்", "கணக்கிடுக", "சதவீதம்", "பரப்பளவு",
    "சுற்றளவு", "கனஅளவு", "காரணி", "வகைக்கெழு", "தொகைக்கெழு", "அணி",
    
    # Tanglish Terms
    "calculate pannu", "solve pannu", "add pannu", "convert pannu", "percent evvalavu",
    "oda", "adhigam", "kuraivu"
]

NL_BLOCKLIST = frozenset([
    'today', 'tomorrow', 'yesterday', 'date', 'time', 'day', 'month', 'year',
    'hello', 'hi', 'hey', 'thanks', 'help', 'please', 'what', 'when', 'where',
    'react', 'python', 'javascript', 'java', 'node', 'html', 'css', 'sql',
    'computer', 'weather', 'news', 'current', 'latest', 'version',
    'good', 'morning', 'afternoon', 'evening',
])

MATH_FUNCS = frozenset([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'exp', 'sqrt', 'abs', 'gcd', 'lcm', 'det', 'pi', 'e'
])

def is_math_query(text: str) -> bool:
    """Returns True if input text contains mathematical expressions, operators, or math keywords."""
    if not text:
        return False
        
    text_lower = text.lower().strip()

    # Safety gate against plain words
    words = re.findall(r'[a-z]+', text_lower)
    has_digit = bool(re.search(r'\d', text_lower))
    has_op = bool(re.search(r'[+\-*/^=<>%≠≤≥|!]', text_lower))
    has_math_func = any(w in MATH_FUNCS for w in words)
    has_nl_math = any(k in text_lower for k in [
        "greater than", "less than", "equal to", "derivative", "integral", "differentiate",
        "integrate", "square root", "cube root", "percent of", "solve", "evaluate",
        "factor", "expand", "mean of", "median of", "mode of", "area of", "volume of"
    ])

    if not has_digit and not has_op and not has_math_func and not has_nl_math:
        all_natural = all(
            w in NL_BLOCKLIST or (len(w) > 2 and w not in MATH_FUNCS)
            for w in words
        )
        if all_natural:
            return False

    # Comparison symbols check (e.g. 3>5, 3=3, 3!=5, det([[1,2],[3,4]]))
    if re.search(r'\d+\s*(?:>|<|>=|<=|==|=|!=|≠|≤|≥)\s*-?\d+', text_lower) or "[[" in text:
        return True

    # Natural language comparison check
    if re.search(r'(?:is|check|does|compare)\s+-?\d+(?:\.\d+)?\s*(?:greater than|less than|equal to|equals|equal|not equal|>=|<=|>|<|=|!=|≠)', text_lower):
        return True

    # Direct arithmetic or equation pattern matching
    if re.search(r'[\d\.\s\+\-\*\/\^\=\%\(\)\[\]]{3,}', text_lower) and any(c.isdigit() for c in text_lower):
        return True
        
    # Equation patterns with letters/variables
    if re.search(r'[a-zA-Z0-9\s]+\s*[\=\<\>]\s*[a-zA-Z0-9\s]+', text_lower) and (has_digit or has_op):
        return True

    # Keyword matching
    for kw in MATH_KEYWORDS:
        if kw in text_lower:
            return True

    return False


def route_math_intent(text: str) -> dict:
    """Analyzes text query and accurately categorizes the mathematical intent."""
    text_clean = text.strip()
    text_lower = text_clean.lower()
    
    category = "general_math"
    math_type = "arithmetic"
    difficulty = "beginner"
    is_concise_preferred = True

    # Check if real algebraic variables (x, y, z, a, b, c, etc.) are present
    # Strip comparison words, function names, and math keywords first
    clean_for_var = text_lower
    for w in ["is", "check", "whether", "greater", "than", "less", "equal", "to", "equals", "not", "compare", "does", "can", "you", "tell", "me", "if", "solve", "evaluate", "calculate", "find", "and", "or", "det", "sin", "cos", "tan", "log", "ln", "exp", "sqrt", "abs", "gcd", "lcm"]:
        clean_for_var = re.sub(rf'\b{w}\b', '', clean_for_var)
    
    has_var = bool(re.search(r'[a-zA-Z]', clean_for_var))

    # 1. Comparison & Boolean Logic
    # Pure numeric comparisons (e.g., 3 > 5, 3 = 3, 3 != 5, 5 >= 5, 4 <= 3, is 3 greater than 5?, does 3 equal 3?)
    is_pure_num_comp = bool(re.search(r'^\s*(?:is|check|does|tell me if)?\s*-?\d+(?:\.\d+)?\s*(?:>=|<=|==|!=|≠|≤|≥|>|<|=|is greater than or equal to|greater than or equal to|is less than or equal to|less than or equal to|is not equal to|not equal to|not equal|is greater than|greater than|is less than|less than|is equal to|equal to|equals|equal)\s*-?\d+(?:\.\d+)?\s*\??\s*$', text_lower))
    has_comp_symbols = bool(re.search(r'(?:>=|<=|==|!=|≠|≤|≥|>|<|=)', text_clean))
    has_comp_words = any(w in text_lower for w in ["greater than", "less than", "equal to", "equals", "not equal", "compare "])

    if (is_pure_num_comp or (has_comp_symbols and not has_var) or (has_comp_words and not has_var and bool(re.search(r'\d', text_lower)))) and not any(k in text_lower for k in ["solve", "differentiate", "integrate", "integral", "derivative", "x^", "y^"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "comparison",
            "math_type": "comparison",
            "domain": "Logic / Comparison",
            "difficulty": "beginner",
            "concise": True
        }

    # 2. Logic / Boolean Expressions (e.g., NOT True, True AND False)
    if any(k in text_lower for k in ["not true", "not false", "true and", "true or", "false and", "false or"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "logic_boolean",
            "math_type": "logic",
            "domain": "Mathematical Logic",
            "difficulty": "beginner",
            "concise": True
        }

    # 3. Inequalities with Variables (e.g. x > 5, 2x + 3 > 9, x^2 - 4 < 0)
    has_inequality_symbols = bool(re.search(r'(?:>=|<=|!=|≠|≤|≥|>|<)', text_clean))
    if has_inequality_symbols and has_var:
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "inequality",
            "math_type": "inequality",
            "domain": "Algebraic Inequality",
            "difficulty": "intermediate",
            "concise": False
        }

    # 3B. Algebraic Equations (Linear, Quadratic, Polynomials, Systems)
    if ("=" in text_clean or "solve" in text_lower or "samanpaadu" in text_lower or "தீர்க்கவும்" in text_lower) and has_var:
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "algebra",
            "math_type": "algebra",
            "domain": "Algebra",
            "difficulty": "intermediate",
            "concise": not ("step" in text_lower or "explain" in text_lower)
        }

    # 4. Calculus (Differentiation, Integration, Limits)
    if any(k in text_lower for k in ["differentiate", "derivative", "d/dx", "dy/dx", "integrate", "integral", "limit", "வகைக்கெழு", "தொகைக்கெழு"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "calculus",
            "math_type": "calculus",
            "domain": "Calculus",
            "difficulty": "advanced",
            "concise": not ("step" in text_lower or "explain" in text_lower)
        }

    # 5. Matrices & Linear Algebra
    if any(k in text_lower for k in ["matrix", "determinant", "det(", "transpose", "eigenvalue", "eigenvector", "inverse of", "அணி"]) or "[[" in text_clean:
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "matrices",
            "math_type": "linear_algebra",
            "domain": "Linear Algebra",
            "difficulty": "intermediate",
            "concise": not ("step" in text_lower or "explain" in text_lower)
        }

    # 6. Vectors
    if any(k in text_lower for k in ["vector", "dot product", "cross product", "magnitude of vector", "unit vector"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "vectors",
            "math_type": "vectors",
            "domain": "Vector Algebra",
            "difficulty": "intermediate",
            "concise": True
        }

    # 7. Complex Numbers
    if bool(re.search(r'\b\d*[ij]\b', text_lower)) and any(c in text_lower for c in ['+', '-', '*', '/', 'modulus', 'conjugate']):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "complex_numbers",
            "math_type": "complex_numbers",
            "domain": "Complex Numbers",
            "difficulty": "intermediate",
            "concise": True
        }

    # 8. Statistics & Probability
    if any(k in text_lower for k in ["mean", "median", "mode", "variance", "standard deviation", "probability", "bayes", "permutation", "combination", "npr", "ncr"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "probability_statistics",
            "math_type": "statistics",
            "domain": "Statistics & Probability",
            "difficulty": "intermediate",
            "concise": True
        }

    # 9. Geometry
    if any(k in text_lower for k in ["area of", "perimeter of", "volume of", "surface area", "radius", "hypotenuse", "pythagorean", "circle", "triangle", "cylinder", "sphere", "cone", "rectangle", "பரப்பளவு", "சுற்றளவு"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "geometry",
            "math_type": "geometry",
            "domain": "Geometry",
            "difficulty": "beginner",
            "concise": True
        }

    # 10. Trigonometry
    if any(k in text_lower for k in ["sin(", "cos(", "tan(", "cot(", "sec(", "csc(", "cosec(", "asin(", "acos(", "atan(", "sin ", "cos ", "tan ", "trigonometry", "radians", "degrees", "°"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "trigonometry",
            "math_type": "trigonometry",
            "domain": "Trigonometry",
            "difficulty": "intermediate",
            "concise": True
        }

    # 11. Logarithms & Exponentials
    if any(k in text_lower for k in ["log(", "ln(", "log10(", "log2(", "exp(", "e^", "log "]) or bool(re.search(r'\b(log|ln)\b', text_lower)):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "logarithms",
            "math_type": "logarithms",
            "domain": "Logarithms & Exponents",
            "difficulty": "intermediate",
            "concise": True
        }

    # 12. Roots & Powers
    if any(k in text_lower for k in ["sqrt", "√", "cube root", "∛", "cbrt", "square root"]) or ("^" in text_clean and not has_var):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "roots_powers",
            "math_type": "roots_powers",
            "domain": "Roots & Powers",
            "difficulty": "beginner",
            "concise": True
        }

    # 13. Absolute Value
    if bool(re.search(r'\|.*\|', text_clean)) or "abs(" in text_lower:
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "absolute_value",
            "math_type": "absolute_value",
            "domain": "Algebra",
            "difficulty": "beginner",
            "concise": True
        }

    # 14. Financial Math & Interest
    if any(k in text_lower for k in ["simple interest", "compound interest", "interest on", "emi", "profit", "loss", "discount", "increased by", "decreased by"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "financial_math",
            "math_type": "financial_math",
            "domain": "Financial Mathematics",
            "difficulty": "intermediate",
            "concise": True
        }

    # 15. Unit Conversion
    if any(k in text_lower for k in ["convert", "celsius", "fahrenheit", "km to", "miles to", "kg to", "°c", "°f", "to °f", "to °c", "to miles", "to km", "to lbs", "to meters", "to feet"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "unit_conversion",
            "math_type": "unit_conversion",
            "domain": "Unit Conversion",
            "difficulty": "beginner",
            "concise": True
        }

    # 16. Percentages
    if "%" in text_lower or any(k in text_lower for k in ["percent of", "percentage of", "percent evvalavu"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "percentage",
            "math_type": "percentage",
            "domain": "Percentages",
            "difficulty": "beginner",
            "concise": True
        }

    # 17. Number Theory (GCD, LCM, Prime, Factorial)
    if any(k in text_lower for k in ["gcd", "hcf", "lcm", "prime", "fibonacci", "factorial", "!", "modular", "mod "]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "number_theory",
            "math_type": "number_theory",
            "domain": "Number Theory",
            "difficulty": "intermediate",
            "concise": True
        }

    # 18. Polynomials (Expand, Factor, Simplify)
    if any(k in text_lower for k in ["expand", "factorize", "factor ", "simplify"]):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "polynomials",
            "math_type": "algebra",
            "domain": "Algebra",
            "difficulty": "intermediate",
            "concise": True
        }

    # 19. Algebraic Equations & Systems (Linear, Quadratic, Systems)
    if ("=" in text_clean or "solve" in text_lower or "samanpaadu" in text_lower or "தீர்க்கவும்" in text_lower) and has_var:
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "algebra",
            "math_type": "algebra",
            "domain": "Algebra",
            "difficulty": "intermediate",
            "concise": not ("step" in text_lower or "explain" in text_lower)
        }

    # 20. Fractions & Rational Arithmetic
    if bool(re.search(r'\d+\s*/\s*\d+', text_clean)) and not any(c in text_clean for c in ['=', '<', '>']):
        return {
            "is_math": True,
            "raw_query": text_clean,
            "category": "fractions",
            "math_type": "fractions",
            "domain": "Fractions & Rational Arithmetic",
            "difficulty": "beginner",
            "concise": True
        }

    # 21. Basic Arithmetic / Decimal Operations
    return {
        "is_math": True,
        "raw_query": text_clean,
        "category": "basic_arithmetic",
        "math_type": "arithmetic",
        "domain": "Arithmetic",
        "difficulty": "beginner",
        "concise": True
    }
