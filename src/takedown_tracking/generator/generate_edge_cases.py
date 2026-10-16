"""Script to generate a comprehensive edge-cases dataset for takedown tracking."""

from datetime import datetime, timezone, timedelta
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"

# Standard reference cutoff for edge-case evaluation
AS_OF = datetime(2026, 3, 15, 0, 0, 0, tzinfo=timezone.utc)

def iso(dt: datetime) -> str:
    return dt.isoformat()

def make_hmac(seed_str: str) -> str:
    import hashlib
    return hashlib.sha256(seed_str.encode("utf-8")).hexdigest()

def build_dataset():
    requests = []
    observations = []

    def add_req(
        req_id: str,
        platform: str,
        req_type: str,
        category: str,
        priority: str,
        sent_at: datetime,
        police_unit_id: str,
        is_complete: bool = True,
        status: str = "claimed_removed",
        legal_route: str = "court_order_or_govt_intimation",
        claimed_removal_at: datetime = None,
        data_provided_at: datetime = None,
        incompletion_reason: str = None,
        rejection_reason: str = None,
        jurisdiction: str = "Kerala",
        district: str = "Thiruvananthapuram",
    ):
        r = {
            "request_id": req_id,
            "is_synthetic": True,
            "request_type": req_type,
            "platform": platform,
            "category": category,
            "priority": priority,
            "sent_at": iso(sent_at),
            "acknowledged_at": iso(sent_at + timedelta(minutes=15)) if status != "rejected" else None,
            "claimed_removal_at": iso(claimed_removal_at) if claimed_removal_at else None,
            "data_provided_at": iso(data_provided_at) if data_provided_at else None,
            "police_unit_id": police_unit_id,
            "is_complete_request": is_complete,
            "incompletion_reason": incompletion_reason,
            "status": status,
            "rejection_reason": rejection_reason,
            "content_url_hmac": make_hmac(req_id),
            "content_url_hash": make_hmac(req_id),
            "legal_route": legal_route,
            "jurisdiction": jurisdiction,
            "district": district,
        }
        requests.append(r)
        return r

    def add_obs(
        req_id: str,
        status: str,
        first_checked: datetime,
        last_seen_up: datetime = None,
        verified_removed: datetime = None,
        reupload_detected: datetime = None,
        last_checked: datetime = None,
        check_error: str = None,
    ):
        o = {
            "request_id": req_id,
            "observation_status": status,
            "first_checked_at": iso(first_checked),
            "last_seen_up_at": iso(last_seen_up) if last_seen_up else None,
            "verified_removed_at": iso(verified_removed) if verified_removed else None,
            "reupload_detected_at": iso(reupload_detected) if reupload_detected else None,
            "last_checked_at": iso(last_checked or first_checked + timedelta(hours=4)),
            "check_error": check_error,
            "verifier_agent_id": "test_edge_case_crawler_v1",
        }
        observations.append(o)
        return o

    # =========================================================================
    # Group A: Platform A (Meets k=10 threshold with 14 records)
    # Covering Core Statutory Deadlines & Verification Interactions
    # =========================================================================
    t0 = AS_OF - timedelta(days=5)

    # 1. Rule 3(1)(d) Compliant Takedown (3h SLA, removed in 1.5h)
    add_req(
        "EDGE-A-01-31D-PASS",
        "Platform A", "takedown", "CSAM", "urgent",
        t0, "KL-CCPS-TVM",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=1.5),
        status="claimed_removed",
        district="Thiruvananthapuram",
    )
    add_obs(
        "EDGE-A-01-31D-PASS", "confirmed_removed",
        t0, t0 + timedelta(minutes=45), t0 + timedelta(hours=1.5),
        last_checked=t0 + timedelta(hours=3),
    )

    # 2. Rule 3(2)(b) Grievance Complaint Compliant (2h SLA, removed in 1.2h)
    add_req(
        "EDGE-A-02-32B-PASS",
        "Platform A", "takedown", "NonConsensualImagery", "urgent",
        t0 + timedelta(hours=2), "KL-CCPS-EKM",
        legal_route="grievance_complaint_3_2_b",
        claimed_removal_at=t0 + timedelta(hours=3.2),
        status="claimed_removed",
        district="Ernakulam",
    )
    add_obs(
        "EDGE-A-02-32B-PASS", "confirmed_removed",
        t0 + timedelta(hours=2), t0 + timedelta(hours=2, minutes=30), t0 + timedelta(hours=3.2),
        last_checked=t0 + timedelta(hours=5),
    )

    # 3. Rule 3(2)(b) Missed SLA (2h SLA, claimed removed in 3.5h -> OVERDUE)
    add_req(
        "EDGE-A-03-32B-MISS",
        "Platform A", "takedown", "NonConsensualImagery", "urgent",
        t0 + timedelta(hours=4), "KL-CCPS-EKM",
        legal_route="grievance_complaint_3_2_b",
        claimed_removal_at=t0 + timedelta(hours=7.5), # 3.5h elapsed > 2h
        status="claimed_removed",
        district="Ernakulam",
    )
    add_obs(
        "EDGE-A-03-32B-MISS", "confirmed_removed",
        t0 + timedelta(hours=4), t0 + timedelta(hours=6), t0 + timedelta(hours=7.5),
        last_checked=t0 + timedelta(hours=9),
    )

    # 4. Strictest-Wins Priority Conflict: Rule 3(1)(d) [3h] + emergency_life_threat [2h] -> 2h SLA
    # Claimed removed in 2.5h -> FAILS strictest 2h SLA even though < 3h!
    add_req(
        "EDGE-A-04-STRICTEST-WINS",
        "Platform A", "takedown", "ViolenceIncitement", "emergency_life_threat",
        t0 + timedelta(hours=8), "KL-CYBERDOME",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=10.5), # 2.5h elapsed
        status="claimed_removed",
        district="Statewide",
    )
    add_obs(
        "EDGE-A-04-STRICTEST-WINS", "confirmed_removed",
        t0 + timedelta(hours=8), t0 + timedelta(hours=9), t0 + timedelta(hours=10.5),
        last_checked=t0 + timedelta(hours=12),
    )

    # 5. Verified Removal Wins over Late Platform Claim:
    # Platform claims removed at 6.0h (after 3h SLA), but crawler verified removal at 2.0h -> COUNTED AS 2.0h (COMPLIANT)!
    add_req(
        "EDGE-A-05-VERIFIER-WINS",
        "Platform A", "takedown", "CSAM", "urgent",
        t0 + timedelta(hours=12), "KL-CCPS-KZD",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=18), # Platform claimed 6h
        status="claimed_removed",
        district="Kozhikode",
    )
    add_obs(
        "EDGE-A-05-VERIFIER-WINS", "confirmed_removed",
        t0 + timedelta(hours=12), t0 + timedelta(hours=13), t0 + timedelta(hours=14), # Crawler verified at 2.0h
        last_checked=t0 + timedelta(hours=20),
    )

    # 6. Contradicted Removal Claim (False Claim):
    # Platform claimed removed at 1.0h, but crawler saw it UP at 4.0h -> treated as STILL UP, flagged as False Claim!
    add_req(
        "EDGE-A-06-FALSE-CLAIM",
        "Platform A", "takedown", "FinancialFraud", "urgent",
        t0 + timedelta(hours=15), "KL-CCPS-TCR",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=16), # Claims removed at +1h
        status="claimed_removed",
        district="Thrissur",
    )
    add_obs(
        "EDGE-A-06-FALSE-CLAIM", "confirmed_available",
        t0 + timedelta(hours=15), t0 + timedelta(hours=19), None, # Last seen up at +4h (> 15 min tolerance)
        last_checked=t0 + timedelta(hours=20),
    )

    # 7. Silent Removal:
    # Platform status is acknowledged (never claimed removed), but crawler verified DOWN at 2.5h -> Counted as verified removal!
    add_req(
        "EDGE-A-07-SILENT-REMOVAL",
        "Platform A", "takedown", "CSAM", "urgent",
        t0 + timedelta(hours=20), "KL-CCPS-KLM",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=None,
        status="acknowledged",
        district="Kollam",
    )
    add_obs(
        "EDGE-A-07-SILENT-REMOVAL", "confirmed_removed",
        t0 + timedelta(hours=20), t0 + timedelta(hours=21), t0 + timedelta(hours=22.5),
        last_checked=t0 + timedelta(hours=26),
    )

    # 8. Inconclusive Verifier Check (Fallback to platform claim):
    # Verifier status uncertain (login wall). Falls back to platform claim.
    add_req(
        "EDGE-A-08-UNCERTAIN-FALLBACK",
        "Platform A", "takedown", "Impersonation", "urgent",
        t0 + timedelta(hours=24), "KL-CCPS-KNR",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=26.5), # 2.5h
        status="claimed_removed",
        district="Kannur",
    )
    add_obs(
        "EDGE-A-08-UNCERTAIN-FALLBACK", "uncertain",
        t0 + timedelta(hours=24), None, None,
        last_checked=t0 + timedelta(hours=28),
        check_error="login_wall",
    )

    # 9. Re-Upload Detected within 7 Days:
    # Verified removed in 2.0h, but identical re-upload detected 48h later.
    add_req(
        "EDGE-A-09-REUPLOAD",
        "Platform A", "takedown", "CSAM", "urgent",
        t0 + timedelta(hours=28), "KL-CYBERDOME",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=30),
        status="claimed_removed",
        district="Statewide",
    )
    add_obs(
        "EDGE-A-09-REUPLOAD", "confirmed_removed",
        t0 + timedelta(hours=28), t0 + timedelta(hours=29), t0 + timedelta(hours=30),
        reupload_detected=t0 + timedelta(hours=76), # 48h later
        last_checked=t0 + timedelta(days=8),
    )

    # 10. Immature Pending Request (as_of Cutoff Protection):
    # Sent 1.5h before as_of with 3h deadline. Pending. MUST be excluded from SLA denominator!
    t_immature = AS_OF - timedelta(hours=1.5)
    add_req(
        "EDGE-A-10-IMMATURE-PENDING",
        "Platform A", "takedown", "CSAM", "urgent",
        t_immature, "KL-CCPS-TVM",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=None,
        status="pending",
        district="Thiruvananthapuram",
    )
    # No observation or ongoing checks

    # 11. Mature Pending Request (SLA Violation):
    # Sent 24h before as_of with 3h deadline. Still pending. MUST count against SLA compliance!
    t_mature = AS_OF - timedelta(hours=24)
    add_req(
        "EDGE-A-11-MATURE-OVERDUE",
        "Platform A", "takedown", "CSAM", "urgent",
        t_mature, "KL-CCPS-TVM",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=None,
        status="pending",
        district="Thiruvananthapuram",
    )
    add_obs(
        "EDGE-A-11-MATURE-OVERDUE", "confirmed_available",
        t_mature, AS_OF - timedelta(hours=1), None,
        last_checked=AS_OF - timedelta(hours=1),
    )

    # 12. Procedural Incomplete Request (Excluded from platform penalty):
    add_req(
        "EDGE-A-12-INCOMPLETE-QUARANTINE",
        "Platform A", "takedown", "FinancialFraud", "urgent",
        t0 + timedelta(hours=36), "KL-CCPS-EKM",
        is_complete=False,
        incompletion_reason="MissingCourtOrder",
        status="pending",
        district="Ernakulam",
    )

    # 13. Platform Lawful Rejection (Excluded from removal speed cohort):
    add_req(
        "EDGE-A-13-REJECTION",
        "Platform A", "takedown", "Defamation", "routine",
        t0 + timedelta(hours=40), "KL-CCPS-TCR",
        status="rejected",
        rejection_reason="UnspecifiedJurisdiction",
        district="Thrissur",
    )

    # 14. Data Assistance Request under Section 79(3)(b) (72h SLA, isolated):
    add_req(
        "EDGE-A-14-DATA-REQ-PASS",
        "Platform A", "data_request", "FinancialFraud", "urgent",
        t0 + timedelta(hours=45), "KL-CCPS-TVM",
        legal_route="data_assistance_order",
        data_provided_at=t0 + timedelta(hours=75), # 30h turnaround <= 72h
        status="data_provided",
        district="Thiruvananthapuram",
    )

    # =========================================================================
    # Group B: Platform B (Meets k=10 threshold with 11 records)
    # =========================================================================
    tB = AS_OF - timedelta(days=6)
    for i in range(1, 11):
        add_req(
            f"EDGE-B-{i:02d}-SLA-PASS",
            "Platform B", "takedown", "CSAM" if i % 2 == 0 else "NonConsensualImagery", "urgent",
            tB + timedelta(hours=i * 4), "KL-CCPS-EKM",
            legal_route="court_order_or_govt_intimation",
            claimed_removal_at=tB + timedelta(hours=i * 4 + 2),
            status="claimed_removed",
            district="Ernakulam",
        )
        add_obs(
            f"EDGE-B-{i:02d}-SLA-PASS", "confirmed_removed",
            tB + timedelta(hours=i * 4), tB + timedelta(hours=i * 4 + 1), tB + timedelta(hours=i * 4 + 2),
            last_checked=tB + timedelta(hours=i * 4 + 5),
        )

    # Data request for Platform B (met in 50h <= 72h)
    add_req(
        "EDGE-B-11-DATA-REQ",
        "Platform B", "data_request", "FinancialFraud", "routine",
        tB + timedelta(hours=50), "KL-CCPS-KZD",
        legal_route="data_assistance_order",
        data_provided_at=tB + timedelta(hours=100), # 50h turnaround <= 72h
        status="data_provided",
        district="Kozhikode",
    )

    # =========================================================================
    # Group C: Platform C (Small Cohort with 3 records < k=10)
    # Tests k-Anonymity Group Suppression
    # =========================================================================
    tC = AS_OF - timedelta(days=4)
    for i in range(1, 4):
        add_req(
            f"EDGE-C-{i:02d}-SUPPRESSED",
            "Platform C", "takedown", "Impersonation", "urgent",
            tC + timedelta(hours=i * 5), "KL-CCPS-KLM",
            legal_route="court_order_or_govt_intimation",
            claimed_removal_at=tC + timedelta(hours=i * 5 + 2),
            status="claimed_removed",
            district="Kollam",
        )

    # =========================================================================
    # Group D: Out-of-Jurisdiction Record (Karnataka State Police)
    # Tests Regional Territorial Filter Exclusions
    # =========================================================================
    add_req(
        "EDGE-OUT-OF-REGION-KA",
        "Platform A", "takedown", "CSAM", "urgent",
        t0 + timedelta(hours=10), "KA-CCPS-BLR",
        legal_route="court_order_or_govt_intimation",
        claimed_removal_at=t0 + timedelta(hours=12),
        status="claimed_removed",
        jurisdiction="Karnataka",
        district="Bengaluru",
    )

    # Write files
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    req_path = DATA_DIR / "edge_cases_requests.json"
    obs_path = DATA_DIR / "edge_cases_observations.json"

    with open(req_path, "w", encoding="utf-8") as f:
        json.dump(requests, f, indent=2)

    with open(obs_path, "w", encoding="utf-8") as f:
        json.dump(observations, f, indent=2)

    print(f"Generated {len(requests)} edge-case requests -> {req_path}")
    print(f"Generated {len(observations)} edge-case observations -> {obs_path}")

if __name__ == "__main__":
    build_dataset()
