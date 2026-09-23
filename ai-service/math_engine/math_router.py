"""
Mathiyon AI Math Intent Router Module
Detects mathematical intent from text prompts in English, Tamil, and Tanglish (mixed Tamil-English).
Extracts domain category, equations, parameters, and difficulty level.
"""
import re

MATH_KEYWORDS = [
    # English Math Terms
    "add", "subtract", "multiply", "divide", "plus", "minus", "times", "divided",
    "calculate", "compute", "solve", "equation", "evaluate", "simplify", "factor",
    "derivative", "differentiate", "integral", "integrate", "limit", "matrix",
    "determinant", "transpose", "vector", "dot product", "cross product",
    "percentage", "percent", "%", "ratio", "proportion", "fraction", "gcd", "hcf",
    "lcm", "prime", "fibonacci", "quadratic", "linear", "logarithm", "log", "ln",
    "sin", "cos", "tan", "area", "perimeter", "volume", "surface area",
    "mean", "median", "mode", "standard deviation", "variance", "probability",
    "convert", "celsius", "fahrenheit", "km", "miles", "kg", "pounds", "grams",
    "interest", "compound interest", "emi", "profit", "loss", "discount",
    
    # Tamil Math Terms
    "கூட்டுக", "கழிக்க", "பெருக்குக", "வகுக்க", "கூட்டல்", "கழித்தல்", "பெருக்கல்",
    "வகுத்தல்", "சமன்பாடு", "தீர்க்கவும்", "கணக்கிடுக", "சதவீதம்", "பரப்பளவு",
    "சுற்றளவு", "கனஅளவு", "காரணி", "வகைக்கெழு", "தொகைக்கெழு", "அணி",
    
    # Tanglish Terms
    "calculate pannu", "solve pannu", "add pannu", "convert pannu", "percent evvalavu",
    "oda"
]

def is_math_query(text: str) -> bool:
    """Returns True if input text contains mathematical expressions or intents."""
    if not text:
        return False
        
    text_lower = text.lower().strip()
    
    # 1. Direct arithmetic or equation pattern matching
    if re.search(r'[\d\.\s\+\-\*\/\^\=\%\(\)]{3,}', text_lower) and any(c.isdigit() for c in text_lower):
        return True
        
    # 2. Equation patterns
    if re.search(r'[a-zA-Z0-9\s]+\s*[\=\<\>]\s*[a-zA-Z0-9\s]+', text_lower):
        return True

    # 3. Keyword matching
    for kw in MATH_KEYWORDS:
        if kw in text_lower:
            return True

    return False

def route_math_intent(text: str) -> dict:
    """Analyzes text query and routes to specific math domain category."""
    text_clean = text.strip()
    text_lower = text_clean.lower()
    
    category = "general_math"
    difficulty = "beginner"
    
    if any(k in text_lower for k in ["differentiate", "derivative", "dy/dx", "integrate", "integral", "limit", "வகைக்கெழு", "தொகைக்கெழு"]):
        category = "calculus"
        difficulty = "advanced"
    elif any(k in text_lower for k in ["matrix", "determinant", "transpose", "eigenvalue", "eigenvector", "அணி"]):
        category = "matrices"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["vector", "dot product", "cross product", "magnitude"]):
        category = "vectors"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["convert", "celsius", "fahrenheit", "km to", "miles to", "kg to", "°c", "°f", "to °f", "to °c", "to miles", "to km", "to lbs"]):
        category = "unit_conversion"
        difficulty = "beginner"
    elif any(k in text_lower for k in ["interest", "compound", "emi", "profit", "loss", "discount"]):
        category = "financial_math"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["mean", "median", "mode", "standard deviation", "variance", "probability", "bayes"]):
        category = "probability_statistics"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["sin", "cos", "tan", "cot", "sec", "cosec", "trigonometry", "radians", "degrees"]):
        category = "trigonometry"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["area", "perimeter", "volume", "surface area", "radius", "circle", "triangle", "cylinder", "sphere", "பரப்பளவு", "சுற்றளவு"]):
        category = "geometry"
        difficulty = "beginner"
    elif any(k in text_lower for k in ["gcd", "hcf", "lcm", "prime", "fibonacci", "factorization", "modular"]):
        category = "number_theory"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["solve", "x^2", "x²", "quadratic", "linear equation", "polynomial", "factor", "samanpaadu", "தீர்க்கவும்"]):
        category = "algebra"
        difficulty = "intermediate"
    elif any(k in text_lower for k in ["%", "percent", "fraction", "ratio", "plus", "minus", "times", "divided", "கூட்டுக", "கழிக்க", "oda"]):
        category = "basic_arithmetic"
        difficulty = "beginner"

    return {
        "is_math": True,
        "raw_query": text_clean,
        "category": category,
        "difficulty": difficulty
    }
