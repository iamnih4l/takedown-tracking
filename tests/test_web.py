"""Unit and integration tests for the web server and API endpoints."""

from http.server import HTTPServer
import json
from pathlib import Path
import threading
import time
import urllib.request
import urllib.error
import pytest

from takedown_tracking.generator.synthetic_generator import SyntheticDataGenerator
from takedown_tracking.privacy.filter import PrivacyFilter
from takedown_tracking.web.app import TakedownRequestHandler


@pytest.fixture(scope="module")
def web_server():
    """Spin up a test HTTP server on localhost with an ephemeral port."""
    # Seed test scoreboard
    gen = SyntheticDataGenerator(seed=42)
    records = gen.generate(count=60)
    pfilter = PrivacyFilter(k_threshold=5, is_demonstration_mode=True)
    TakedownRequestHandler.scoreboard = pfilter.filter_and_publish(records)

    server = HTTPServer(("127.0.0.1", 0), TakedownRequestHandler)
    host, port = server.server_address

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    base_url = f"http://{host}:{port}"
    yield base_url

    server.shutdown()
    server.server_close()


class TestWebServer:
    """Test suite for HTTP endpoints."""

    def test_serve_index_html(self, web_server: str) -> None:
        """GET / must serve HTML with status 200."""
        req = urllib.request.Request(f"{web_server}/")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            assert "text/html" in resp.headers.get("Content-Type", "")
            body = resp.read().decode("utf-8")
            assert "Takedown Accountability" in body
            assert "DEMONSTRATION MODE" in body

    def test_serve_css(self, web_server: str) -> None:
        """GET /styles.css must serve CSS with status 200."""
        req = urllib.request.Request(f"{web_server}/styles.css")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            assert "text/css" in resp.headers.get("Content-Type", "")
            body = resp.read().decode("utf-8")
            assert "--accent-indigo" in body

    def test_serve_javascript(self, web_server: str) -> None:
        """GET /app.js must serve JS with status 200."""
        req = urllib.request.Request(f"{web_server}/app.js")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            assert "application/javascript" in resp.headers.get("Content-Type", "")
            body = resp.read().decode("utf-8")
            assert "fetchAndRenderScoreboard" in body

    def test_api_health(self, web_server: str) -> None:
        """GET /api/health must return healthy status."""
        req = urllib.request.Request(f"{web_server}/api/health")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert data["status"] == "healthy"
            assert data["service"] == "takedown-tracking"

    def test_api_scoreboard(self, web_server: str) -> None:
        """GET /api/scoreboard must return full privacy-filtered scoreboard."""
        req = urllib.request.Request(f"{web_server}/api/scoreboard")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            assert "application/json" in resp.headers.get("Content-Type", "")
            data = json.loads(resp.read().decode("utf-8"))
            assert data["schema_version"] in ("1.0.0", "2.0.0")
            assert "metadata" in data
            assert data["metadata"]["is_demonstration_mode"] is True
            assert "overall_performance" in data
            assert "platform_breakdown" in data
            assert "category_breakdown" in data

    def test_not_found(self, web_server: str) -> None:
        """Nonexistent paths must return 404."""
        req = urllib.request.Request(f"{web_server}/nonexistent_endpoint")
        with pytest.raises(urllib.error.HTTPError) as exc_info:
            urllib.request.urlopen(req)
        assert exc_info.value.code == 404

    def test_serve_index_html_contains_critical_components(self, web_server: str) -> None:
        """GET / must include hero canvas, progressive tabs, error state, and accessibility roles."""
        req = urllib.request.Request(f"{web_server}/")
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            assert 'id="hero-canvas"' in body
            assert 'id="canvas-fallback"' in body
            assert 'id="error-state"' in body
            assert 'role="tablist"' in body
            assert 'id="tab-overview"' in body
            assert 'id="tab-platforms"' in body
            assert 'id="tab-integrity"' in body
            assert 'id="tab-methodology"' in body
            assert 'Platform A' in body or 'Platform Comparisons' in body

    def test_serve_css_contains_design_tokens_and_accessibility(self, web_server: str) -> None:
        """GET /styles.css must include warm orange tokens, near-black backgrounds, and reduced-motion guard."""
        req = urllib.request.Request(f"{web_server}/styles.css")
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            assert "--accent-orange" in body
            assert "--bg-primary: #080b11" in body
            assert "prefers-reduced-motion" in body
            assert ":focus-visible" in body

    def test_serve_javascript_contains_lightweight_canvas_and_resilience(self, web_server: str) -> None:
        """GET /app.js must include canvas projection, reduced-motion check, error retry, and search filters."""
        req = urllib.request.Request(f"{web_server}/app.js")
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            assert "initHero3DCanvas" in body
            assert "prefers-reduced-motion" in body
            assert "initPlatformFilters" in body
            assert "initRetryButton" in body

    def test_api_upload_dataset(self, web_server: str) -> None:
        """POST /api/upload must accept json records and recalculate scoreboard."""
        gen = SyntheticDataGenerator(seed=99)
        records = [r.to_dict() for r in gen.generate(count=40)]
        payload = json.dumps({"records": records}).encode("utf-8")

        req = urllib.request.Request(
            f"{web_server}/api/upload",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            data = json.loads(resp.read().decode("utf-8"))
            assert data["status"] == "success"
            assert data["valid_count"] == 40
            assert "scoreboard" in data


