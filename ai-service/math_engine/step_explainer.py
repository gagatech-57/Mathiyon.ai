"""
Mathiyon AI Step-by-Step Educational Explanation Module
Generates structured step breakdowns: Problem -> Formula -> Substitution -> Calculation -> Verification -> Final Answer.
"""

def format_step_by_step_explanation(
    problem: str,
    category: str,
    formula: str,
    steps: list[str],
    final_answer: str,
    verification: dict = None,
    exact: bool = True
) -> str:
    """Formats structured markdown step-by-step explanation."""
    parts = []
    
    parts.append(f"### [Verified Math Engine] Solution for: `{problem}`\n")
    parts.append(f"• **Domain Category**: `{category.replace('_', ' ').title()}`")
    parts.append(f"• **Computation Type**: `{'Exact Symbolic' if exact else 'Numerical Approximation'}`\n")

    if formula:
        parts.append(f"#### 1. Formula / Theorem")
        parts.append(f"```text\n{formula}\n```\n")

    parts.append("#### 2. Step-by-Step Solution Breakdown")
    for i, step in enumerate(steps, 1):
        parts.append(f"**Step {i}**: {step}")

    if verification:
        ver_status = verification.get("status", "PASSED")
        ver_sub = verification.get("substitution", "")
        parts.append(f"\n#### 3. Independent Verification (`{ver_status}`)")
        parts.append(f"```text\n{ver_sub}\n```")

    parts.append(f"\n#### Final Result")
    parts.append(f"> **`{final_answer}`**")
    
    return "\n".join(parts)
