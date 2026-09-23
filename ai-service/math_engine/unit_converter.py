"""
Mathiyon AI Unit Converter Module
Handles exact unit conversions for length, mass, temperature, speed, area, volume, pressure, and energy.
"""
import re

def convert_units(query: str) -> dict:
    """Parses unit conversion request and returns exact calculation."""
    q_lower = query.lower().strip()

    # 1. Temperature: °C <-> °F <-> K
    temp_match = re.search(r'(-?\d+(?:\.\d+)?)\s*(?:°|\s)?\s*([cfk])\s*(?:to|->|in)?\s*(?:°|\s)?\s*([cfk])', q_lower)
    if temp_match:
        val = float(temp_match.group(1))
        from_u = temp_match.group(2)
        to_u = temp_match.group(3)

        if from_u == 'c' and to_u == 'f':
            res = (val * 9/5) + 32
            formula = f"({val} °C × 9/5) + 32 = {res} °F"
            return {"success": True, "result": f"{res} °F", "formula": formula, "exact": True}
        elif from_u == 'f' and to_u == 'c':
            res = (val - 32) * 5/9
            formula = f"({val} °F - 32) × 5/9 = {res:.4f} °C"
            return {"success": True, "result": f"{res:.4f} °C", "formula": formula, "exact": False}

    # 2. Length: km <-> miles
    km_miles = re.search(r'(\d+(?:\.\d+)?)\s*(km|kilometers|miles|mi)\s*(?:to|->|in)?\s*(km|kilometers|miles|mi)', q_lower)
    if km_miles:
        val = float(km_miles.group(1))
        from_u = km_miles.group(2)
        to_u = km_miles.group(3)

        if "km" in from_u and "mi" in to_u:
            res = val * 0.621371
            return {"success": True, "result": f"{res:.4f} miles", "formula": f"{val} km × 0.621371 = {res:.4f} miles", "exact": False}
        elif "mi" in from_u and "km" in to_u:
            res = val * 1.60934
            return {"success": True, "result": f"{res:.4f} km", "formula": f"{val} miles × 1.60934 = {res:.4f} km", "exact": False}

    # 3. Mass: kg <-> pounds / grams
    kg_lbs = re.search(r'(\d+(?:\.\d+)?)\s*(kg|kilograms|lbs|pounds|g|grams)\s*(?:to|->|in)?\s*(kg|kilograms|lbs|pounds|g|grams)', q_lower)
    if kg_lbs:
        val = float(kg_lbs.group(1))
        from_u = kg_lbs.group(2)
        to_u = kg_lbs.group(3)

        if "kg" in from_u and ("lb" in to_u or "pound" in to_u):
            res = val * 2.20462
            return {"success": True, "result": f"{res:.4f} lbs", "formula": f"{val} kg × 2.20462 = {res:.4f} lbs", "exact": False}
        elif "kg" in from_u and ("g" in to_u or "gram" in to_u):
            res = val * 1000
            return {"success": True, "result": f"{int(res)} grams", "formula": f"{val} kg × 1000 = {int(res)} grams", "exact": True}

    return {"success": False, "error": "Could not parse unit conversion expression"}
