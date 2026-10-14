"""Tests for Kerala regional jurisdiction scoping, validation, and privacy filtering."""

from datetime import datetime, timezone
from http.server import HTTPServer
import json
import threading
import urllib.request
import pytest

from takedown_tracking.generator.synthetic_generator import SyntheticDataGenerator
from takedown_tracking.ingest.validator import RequestValidator
from takedown_tracking.models.request import (
    Category,
    LegalRoute,
    Platform,
    Priority,
    RequestRecord,
    RequestStatus,
    RequestType,
)
from takedown_tracking.models.scoreboard import ScoreboardMetadata
from takedown_tracking.privacy.filter import PrivacyFilter
from takedown_tracking.web.app import TakedownRequestHandler


def test_generator_assigns_kerala_jurisdiction_and_districts() -> None:
    """SyntheticDataGenerator must produce records tagged with jurisdiction 'Kerala' and valid Kerala districts."""
    gen = SyntheticDataGenerator(seed=123)
    records = gen.generate(count=50)

    assert len(records) == 50
    for r in records:
        assert r.jurisdiction == "Kerala"
        assert r.district is not None
        assert r.district in {
            "Thiruvananthapuram",
            "Ernakulam",
            "Kozhikode",
            "Thrissur",
            "Kollam",
            "Kannur",
            "Statewide",
        }


def test_request_record_jurisdiction_serialization() -> None:
    """RequestRecord must serialize and deserialize jurisdiction and district fields."""
    rec = RequestRecord(
        request_id="REQ-KL-001",
        is_synthetic=True,
        request_type=RequestType.TAKEDOWN,
        platform=Platform.PLATFORM_A,
        category=Category.CSAM,
        priority=Priority.URGENT,
        sent_at=datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        police_unit_id="KL-CCPS-EKM",
        is_complete_request=True,
        status=RequestStatus.CLAIMED_REMOVED,
        legal_route=LegalRoute.COURT_ORDER_OR_GOVT_INTIMATION,
        content_url_hmac="a" * 64,
        jurisdiction="Kerala",
        district="Ernakulam",
    )
    d = rec.to_dict()
    assert d["jurisdiction"] == "Kerala"
    assert d["district"] == "Ernakulam"

    recovered = RequestRecord.from_dict(d)
    assert recovered.jurisdiction == "Kerala"
    assert recovered.district == "Ernakulam"


def test_request_record_default_backward_compatibility() -> None:
    """RequestRecord must default to jurisdiction 'Kerala' when omitted in legacy inputs."""
    legacy_dict = {
        "request_id": "REQ-LEGACY-01",
        "is_synthetic": True,
        "request_type": "takedown",
        "platform": "Platform A",
        "category": "CSAM",
        "priority": "routine",
        "sent_at": "2026-03-01T10:00:00Z",
        "police_unit_id": "KL-CCPS-TVM",
        "is_complete_request": True,
        "status": "claimed_removed",
        "legal_route": "court_order_or_govt_intimation",
        "content_url_hmac": "b" * 64,
    }
    rec = RequestRecord.from_dict(legacy_dict)
    assert rec.jurisdiction == "Kerala"
    assert rec.district is None


def test_validator_accepts_and_preserves_jurisdiction() -> None:
    """RequestValidator must extract jurisdiction and district."""
    row = {
        "request_id": "REQ-VAL-01",
        "is_synthetic": True,
        "request_type": "takedown",
        "platform": "Platform B",
        "category": "FinancialFraud",
        "priority": "urgent",
        "sent_at": "2026-03-01T10:00:00Z",
        "police_unit_id": "KL-CCPS-KZD",
        "is_complete_request": True,
        "status": "claimed_removed",
        "claimed_removal_at": "2026-03-01T11:00:00Z",
        "legal_route": "court_order_or_govt_intimation",
        "content_url_hmac": "c" * 64,
        "jurisdiction": "Kerala",
        "district": "Kozhikode",
    }
    rec, failures = RequestValidator.validate_row(row, 0)
    assert len(failures) == 0
    assert rec is not None
    assert rec.jurisdiction == "Kerala"
    assert rec.district == "Kozhikode"


def test_privacy_filter_enforces_kerala_territorial_scoping() -> None:
    """PrivacyFilter with target_jurisdiction='Kerala' must exclude records from other jurisdictions."""
    kerala_rec = RequestRecord(
        request_id="REQ-KL-01",
        is_synthetic=True,
        request_type=RequestType.TAKEDOWN,
        platform=Platform.PLATFORM_A,
        category=Category.CSAM,
        priority=Priority.URGENT,
        sent_at=datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        police_unit_id="KL-CCPS-TVM",
        is_complete_request=True,
        status=RequestStatus.CLAIMED_REMOVED,
        legal_route=LegalRoute.COURT_ORDER_OR_GOVT_INTIMATION,
        content_url_hmac="1" * 64,
        claimed_removal_at=datetime(2026, 3, 1, 11, 0, 0, tzinfo=timezone.utc),
        jurisdiction="Kerala",
        district="Thiruvananthapuram",
    )
    other_rec = RequestRecord(
        request_id="REQ-OTHER-01",
        is_synthetic=True,
        request_type=RequestType.TAKEDOWN,
        platform=Platform.PLATFORM_A,
        category=Category.CSAM,
        priority=Priority.URGENT,
        sent_at=datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        police_unit_id="KA-CCPS-BLR",
        is_complete_request=True,
        status=RequestStatus.CLAIMED_REMOVED,
        legal_route=LegalRoute.COURT_ORDER_OR_GOVT_INTIMATION,
        content_url_hmac="2" * 64,
        claimed_removal_at=datetime(2026, 3, 1, 11, 0, 0, tzinfo=timezone.utc),
        jurisdiction="Karnataka",
        district="Bengaluru",
    )

    pfilter = PrivacyFilter(k_threshold=1, target_jurisdiction="Kerala")
    scoreboard = pfilter.filter_and_publish([kerala_rec, other_rec])

    # Only 1 record should be analyzed
    assert scoreboard.metadata.total_requests_analyzed == 1
    assert scoreboard.metadata.jurisdiction == "Kerala"
    assert "Kerala Police" in scoreboard.metadata.jurisdiction_scope


def test_scoreboard_metadata_contains_kerala_jurisdiction() -> None:
    """ScoreboardMetadata must serialize jurisdiction fields."""
    now = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    meta = ScoreboardMetadata(
        generated_at=now,
        as_of=now,
        measurement_period_start=now,
        measurement_period_end=now,
        is_demonstration_mode=True,
        disclaimer="Demonstration",
        k_anonymity_threshold=10,
        total_requests_analyzed=100,
        jurisdiction="Kerala",
        jurisdiction_scope="Kerala State Cyber Police Jurisdiction (Kerala Police Cyber Operations Wing & Cyberdome)",
    )
    d = meta.to_dict()
    assert d["jurisdiction"] == "Kerala"
    assert "Kerala State Cyber Police" in d["jurisdiction_scope"]


def test_web_api_serves_kerala_jurisdiction_metadata() -> None:
    """Web server endpoints /api/health and /api/scoreboard must expose Kerala jurisdiction."""
    gen = SyntheticDataGenerator(seed=99)
    records = gen.generate(count=30)
    pfilter = PrivacyFilter(k_threshold=2, target_jurisdiction="Kerala", is_demonstration_mode=True)
    TakedownRequestHandler.scoreboard = pfilter.filter_and_publish(records)

    server = HTTPServer(("127.0.0.1", 0), TakedownRequestHandler)
    host, port = server.server_address

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    base_url = f"http://{host}:{port}"
    try:
        # Check /api/health
        with urllib.request.urlopen(f"{base_url}/api/health") as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert data["jurisdiction"] == "Kerala"
            assert "Kerala" in data["jurisdiction_scope"]

        # Check /api/scoreboard
        with urllib.request.urlopen(f"{base_url}/api/scoreboard") as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            meta = data["metadata"]
            assert meta["jurisdiction"] == "Kerala"
            assert "Kerala" in meta["jurisdiction_scope"]
    finally:
        server.shutdown()
        server.server_close()
