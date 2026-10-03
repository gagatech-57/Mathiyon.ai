"""
Mathiyon AI - Privacy Scrubber (Phase 11.13)
Python implementation of privacy-first sanitizer for live shadow evaluation.

Ensures secrets, PII, auth headers, and private document content NEVER reach
v1.3 shadow inference or log artifacts.
"""
import re
import copy
from typing import Dict, Any, Tuple, List

REDACTED = "[REDACTED]"
DOC_REDACTED = "[PRIVATE_DOCUMENT_CONTENT_REDACTED]"

SECRET_PATTERNS = [
    ("JWT Token", re.compile(r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+")),
    ("Bearer Token", re.compile(r"Bearer\s+[a-zA-Z0-9._\-~+/=]+", re.IGNORECASE)),
    ("API Key", re.compile(r"(?:sk-|key-|api_key=|apikey=)[a-zA-Z0-9_\-]{16,}", re.IGNORECASE)),
    ("Password", re.compile(r"(?:password|passwd|pwd|secret)\s*[:=]\s*[\"']?([^\"'\s,;]+)[\"']?", re.IGNORECASE)),
    ("Access/Refresh Token", re.compile(r"(?:access_token|refresh_token|session_token)\s*[:=]\s*[\"']?([^\"'\s,;]+)[\"']?", re.IGNORECASE)),
    ("MongoDB URI", re.compile(r"mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s\"']+", re.IGNORECASE)),
    ("PostgreSQL URI", re.compile(r"postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s\"']+", re.IGNORECASE)),
    ("Database Connection String", re.compile(r"(?:mysql|oracle|mssql|redis):\/\/[^:]+:[^@]+@[^\s\"']+", re.IGNORECASE)),
]

PII_PATTERNS = [
    ("Email Address", re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")),
    ("Phone Number", re.compile(r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
]


def sanitize_string(text: str) -> Tuple[str, List[str]]:
    """Sanitizes string input by replacing secrets and PII with [REDACTED]."""
    if not isinstance(text, str):
        return text, []

    sanitized = text
    redactions = []

    for name, pattern in SECRET_PATTERNS:
        if pattern.search(sanitized):
            sanitized = pattern.sub(REDACTED, sanitized)
            redactions.append(name)

    for name, pattern in PII_PATTERNS:
        if pattern.search(sanitized):
            sanitized = pattern.sub(REDACTED, sanitized)
            redactions.append(name)

    return sanitized, redactions


def scrub_request(original_request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main python privacy scrubber entry point.
    Deep clones original request and sanitizes all sensitive fields.
    Original request is NEVER mutated.
    """
    if not original_request:
        return {}

    cloned = copy.deepcopy(original_request)
    redaction_log = []

    message = cloned.get("message") or cloned.get("prompt") or ""
    if isinstance(message, str):
        sanitized_msg, redactions = sanitize_string(message)
        message = sanitized_msg
        redaction_log.extend(redactions)

    has_private_doc = False
    for doc_key in ["documentContent", "fileContent", "rawDocument", "pdfText"]:
        if doc_key in cloned:
            has_private_doc = True
            cloned[doc_key] = DOC_REDACTED
            redaction_log.append("Private Document Content")

    headers = cloned.get("headers", {})
    if headers:
        if "authorization" in headers:
            headers["authorization"] = REDACTED
            redaction_log.append("Authorization Header")
        if "cookie" in headers:
            headers["cookie"] = REDACTED
            redaction_log.append("Cookie")

    for auth_field in ["jwt", "token", "bearer", "apiKey", "api_key", "password", "sessionToken", "refreshToken"]:
        if auth_field in cloned:
            cloned[auth_field] = REDACTED
            redaction_log.append(f"Auth Field: {auth_field}")

    return {
        "sanitizedRequest": {
            "message": message,
            "documentIds": cloned.get("documentIds", []),
            "hasPrivateDoc": has_private_doc,
            "enableWebSearch": bool(cloned.get("enableWebSearch", False)),
            "userId": "shadow_user_anon",
        },
        "redactionCount": len(redaction_log),
        "redactionDetails": list(set(redaction_log)),
    }
