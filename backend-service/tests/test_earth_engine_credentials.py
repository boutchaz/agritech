import json

from app.services.earth_engine import (
    _normalize_service_account_key_data,
    _resolve_service_account_email,
)


def test_normalize_service_account_key_data_keeps_dicts():
    payload = {"client_email": "svc@example.com", "private_key": "secret"}

    normalized = _normalize_service_account_key_data(payload)

    assert normalized == payload


def test_normalize_service_account_key_data_parses_wrapped_json_string():
    payload = {
        "client_email": "svc@example.com",
        "private_key": "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
    }
    wrapped_json = "'" + json.dumps(payload) + "'"

    normalized = _normalize_service_account_key_data(wrapped_json)

    assert normalized == payload


def test_resolve_service_account_email_falls_back_to_key_payload():
    payload = {"client_email": "svc@example.com"}

    resolved = _resolve_service_account_email("", payload)

    assert resolved == "svc@example.com"


def test_resolve_service_account_email_requires_any_email_source():
    try:
        _resolve_service_account_email("", {})
    except ValueError as exc:
        assert "GEE service-account email is missing" in str(exc)
    else:
        raise AssertionError("Expected ValueError when no service-account email is available")
