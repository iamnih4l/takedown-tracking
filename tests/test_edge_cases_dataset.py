"""Comprehensive verification test suite asserting all edge cases in data/edge_cases_requests.json."""

from datetime import datetime, timezone
import json
from pathlib import Path
import pytest

from takedown_tracking.ingest.importer import RequestImporter
from takedown_tracking.ingest.validator import RequestValidator
from takedown_tracking.integrity import compute_integrity
from takedown_tracking.metrics.deadline import DeadlineConfig
from takedown_tracking.metrics.engine import MetricsEngine
from takedown_tracking.models.observation import ObservationRecord
from takedown_tracking.models.request import Category, RequestRecord
from takedown_tracking.privacy.filter import PrivacyFilter

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
AS_OF = datetime(2026, 3, 15, 0, 0, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def edge_case_data():
    """Load and validate the curated edge cases dataset."""
    req_file = DATA_DIR / "edge_cases_requests.json"
    obs_file = DATA_DIR / "edge_cases_observations.json"

    assert req_file.exists(), f"Missing {req_file}"
    assert obs_file.exists(), f"Missing {obs_file}"

    with open(req_file, "r", encoding="utf-8") as f:
        raw_requests = json.load(f)

    with open(obs_file, "r", encoding="utf-8") as f:
        raw_observations = json.load(f)

    import_result = RequestImporter.from_dict_list(raw_requests)
    assert len(import_result.valid_records) == len(raw_requests)

    observations = [ObservationRecord.from_dict(o) for o in raw_observations]
    obs_map = {o.request_id: o for o in observations}

    return import_result.valid_records, obs_map, observations


def test_edge_cases_file_schema_and_integrity(edge_case_data):
    """Dataset must load without data corruption or structural defects."""
    records, obs_map, observations = edge_case_data
    assert len(records) >= 25
    assert len(observations) >= 15

    # Check HMAC hash formatting
    for r in records:
        assert len(r.content_url_hmac) == 64
        assert r.is_synthetic is True


def test_edge_case_strictest_wins_sla(edge_case_data):
    """Verify Rule 3(1)(d), Rule 3(2)(b), and strictest-wins resolution."""
    records, obs_map, _ = edge_case_data
    rec_map = {r.request_id: r for r in records}
    cfg = DeadlineConfig()

    # 1. Rule 3(1)(d) court order standard (3.0h)
    r1 = rec_map["EDGE-A-01-31D-PASS"]
    deadline1 = cfg.get_deadline_hours(r1)
    assert deadline1 == 3.0

    # 2. Rule 3(2)(b) grievance complaint for NCII (2.0h)
    r2 = rec_map["EDGE-A-02-32B-PASS"]
    deadline2 = cfg.get_deadline_hours(r2)
    assert deadline2 == 2.0

    # 3. Strictest-wins: court order (3.0h) + emergency_life_threat (2.0h) -> strictest is 2.0h
    r4 = rec_map["EDGE-A-04-STRICTEST-WINS"]
    deadline4 = cfg.get_deadline_hours(r4)
    assert deadline4 == 2.0  # min(3.0, 2.0)


def test_edge_case_verifier_overrides_late_platform_claim(edge_case_data):
    """Verified removal duration replaces late platform self-reporting."""
    records, obs_map, _ = edge_case_data
    rec_map = {r.request_id: r for r in records}

    # EDGE-A-05: Platform claimed removed at +6h (overdue), crawler verified removal at +2h
    r5 = rec_map["EDGE-A-05-VERIFIER-WINS"]
    obs5 = obs_map["EDGE-A-05-VERIFIER-WINS"]

    engine = MetricsEngine()
    perf = engine.compute_performance_metrics([r5], as_of=AS_OF, observations={obs5.request_id: obs5})

    # Should count as on-time (100% compliance) because verified 2.0h <= 3.0h SLA!
    assert perf.deadline_compliance_rate_pct == 100.0
    assert perf.median_removal_hours == 2.0


def test_edge_case_contradicted_claim_detected_as_false_claim(edge_case_data):
    """Platform claimed removal contradicted by crawler seeing content UP -> False Removal Claim."""
    records, obs_map, observations = edge_case_data
    rec_map = {r.request_id: r for r in records}

    r6 = rec_map["EDGE-A-06-FALSE-CLAIM"]
    obs6 = obs_map["EDGE-A-06-FALSE-CLAIM"]

    integ_metrics = compute_integrity([r6], {obs6.request_id: obs6}, as_of=AS_OF)

    assert integ_metrics.false_claims_count == 1
    assert integ_metrics.false_claim_rate_pct == 100.0


def test_edge_case_silent_removal_detected(edge_case_data):
    """Platform left status as acknowledged, but crawler verified removal -> counted as verified."""
    records, obs_map, _ = edge_case_data
    rec_map = {r.request_id: r for r in records}

    r7 = rec_map["EDGE-A-07-SILENT-REMOVAL"]
    obs7 = obs_map["EDGE-A-07-SILENT-REMOVAL"]

    integ_metrics = compute_integrity([r7], {obs7.request_id: obs7}, as_of=AS_OF)

    assert integ_metrics.silent_removals_count == 1
    assert integ_metrics.verified_removals == 1


def test_edge_case_as_of_cutoff_maturity(edge_case_data):
    """Immature requests sent right before as_of are excluded from SLA denominators."""
    records, obs_map, _ = edge_case_data
    rec_map = {r.request_id: r for r in records}

    # EDGE-A-10 sent 1.5h before as_of with 3h deadline -> immature!
    r10 = rec_map["EDGE-A-10-IMMATURE-PENDING"]
    # EDGE-A-11 sent 24h before as_of with 3h deadline -> mature overdue!
    r11 = rec_map["EDGE-A-11-MATURE-OVERDUE"]

    engine = MetricsEngine()
    perf = engine.compute_performance_metrics([r10, r11], as_of=AS_OF, observations={})

    # Out of 2 pending requests, only r11 is mature.
    # Therefore, denominator is 1 (r11), compliance is 0.0%, and still_available is 100.0%
    assert perf.deadline_compliance_rate_pct == 0.0
    assert perf.still_available_rate_pct == 100.0


def test_edge_case_territorial_scoping_excludes_out_of_region(edge_case_data):
    """PrivacyFilter with target_jurisdiction='Kerala' excludes Karnataka records."""
    records, obs_map, observations = edge_case_data

    # Confirm dataset contains Karnataka out-of-jurisdiction record
    ka_records = [r for r in records if r.jurisdiction == "Karnataka"]
    assert len(ka_records) == 1
    assert ka_records[0].request_id == "EDGE-OUT-OF-REGION-KA"

    pfilter = PrivacyFilter(k_threshold=1, target_jurisdiction="Kerala", published_categories=set(Category))
    scoreboard = pfilter.filter_and_publish(records, as_of=AS_OF, observations=obs_map)

    # Scoreboard metadata analyzed count must NOT include the Karnataka record
    total_kerala = sum(1 for r in records if r.jurisdiction == "Kerala")
    assert scoreboard.metadata.total_requests_analyzed == total_kerala
    assert scoreboard.metadata.jurisdiction == "Kerala"


def test_edge_case_k_anonymity_group_suppression(edge_case_data):
    """Platform with < k=10 records is suppressed, platforms with >= 10 are published."""
    records, obs_map, observations = edge_case_data

    pfilter = PrivacyFilter(k_threshold=10, target_jurisdiction="Kerala")
    scoreboard = pfilter.filter_and_publish(records, as_of=AS_OF, observations=obs_map)

    platforms = {p.platform: p for p in scoreboard.platform_breakdown}

    # Platform A (13 Kerala records >= 10) -> Published
    assert platforms["Platform A"].is_suppressed is False

    # Platform B (11 Kerala records >= 10) -> Published
    assert platforms["Platform B"].is_suppressed is False

    # Platform C (3 Kerala records < 10) -> Suppressed
    assert platforms["Platform C"].is_suppressed is True
    assert "below the publication threshold" in platforms["Platform C"].suppression_reason
