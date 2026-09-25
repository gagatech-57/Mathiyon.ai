"""
Mathiyon AI - PyTest Privacy & Security Test Suite (Phase 11.13)
Tests Python privacy scrubber implementation and security constraints.
"""
import copy
import pytest
from evaluation.v1_3.shadow_live.privacy_scrubber import scrub_request, sanitize_string, REDACTED, DOC_REDACTED


def test_jwt_redaction():
    req = {"message": "Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c test"}
    original = copy.deepcopy(req)
    res = scrub_request(req)
    assert req == original  # Immutability check
    assert "eyJhbGciOiJIUzI1Ni" not in res["sanitizedRequest"]["message"]
    assert REDACTED in res["sanitizedRequest"]["message"]


def test_bearer_token_redaction():
    req = {"message": "Bearer secret_bearer_token_12345"}
    res = scrub_request(req)
    assert "secret_bearer_token_12345" not in res["sanitizedRequest"]["message"]
    assert REDACTED in res["sanitizedRequest"]["message"]


def test_api_key_redaction():
    req = {"message": "Key sk-1234567890abcdef1234567890abcdef"}
    res = scrub_request(req)
    assert "sk-1234567890abcdef1234567890abcdef" not in res["sanitizedRequest"]["message"]


def test_password_redaction():
    req = {"message": "password=MySuperSecretPassword123!"}
    res = scrub_request(req)
    assert "MySuperSecretPassword123!" not in res["sanitizedRequest"]["message"]


def test_email_redaction():
    req = {"message": "Email me at dev@mathiyon.ai please"}
    res = scrub_request(req)
    assert "dev@mathiyon.ai" not in res["sanitizedRequest"]["message"]
    assert REDACTED in res["sanitizedRequest"]["message"]


def test_phone_redaction():
    req = {"message": "Call +1-555-019-2834 now"}
    res = scrub_request(req)
    assert "+1-555-019-2834" not in res["sanitizedRequest"]["message"]


def test_database_uri_redaction():
    req = {"message": "mongodb+srv://user:pass123@cluster.mongodb.net/db"}
    res = scrub_request(req)
    assert "pass123" not in res["sanitizedRequest"]["message"]


def test_document_content_redaction():
    req = {"message": "Summarize doc", "documentContent": "SECRET PATENT DOC CONTENT"}
    res = scrub_request(req)
    assert "SECRET PATENT DOC CONTENT" not in str(res["sanitizedRequest"])
    assert res["sanitizedRequest"]["hasPrivateDoc"] is True


def test_synthetic_user_identity():
    req = {"message": "Hello", "jwt": "eyJhbGciOiJIUzI1NiJ9.sig", "headers": {"authorization": "Bearer token"}}
    res = scrub_request(req)
    assert res["sanitizedRequest"]["userId"] == "shadow_user_anon"


if __name__ == "__main__":
    pytest.main([__file__])
