/**
 * Social Media Takedown Accountability Platform - Modern Frontend Controller
 * Minimalist, Fast, and Reliable Law-Enforcement Interface
 * Features: Hardware-Accelerated Ambient Shader, Radial Gauges, Interactive 3D Mesh
 */

let cachedScoreboardData = null;
let currentPlatformFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize UI interactions immediately
  initThemeToggle();
  initTabs();
  initPlatformFilters();
  initPlatformDrawer();
  initUploadModal();
  initRetryButton();

  // 2. Fetch and render primary operational metrics immediately (zero-wait)
  fetchAndRenderScoreboard();

  // 3. Check live backend API connectivity
  checkApiHealth();

  // 4. Initialize ambient WebGL glow shader in background
  initAmbientShader();

  // 5. Initialize 3D hero constellation mesh
  setTimeout(() => {
    initHero3DCanvas();
  }, 40);
});

// --- Theme Switcher ---
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  const body = document.body;
  const savedTheme = localStorage.getItem('ttp-theme');

  if (savedTheme === 'light') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
  }

  toggleBtn.addEventListener('click', () => {
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
      localStorage.setItem('ttp-theme', 'light');
    } else {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
      localStorage.setItem('ttp-theme', 'dark');
    }
  });
}

// --- Progressive Tab Navigation ---
function initTabs() {
  const tabButtons = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');

  function activateTab(btn) {
    if (!btn) return;
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    panels.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const targetPanelId = btn.getAttribute('aria-controls');
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
  });

  const inspectRulesBtn = document.getElementById('btn-inspect-rules');
  if (inspectRulesBtn) {
    inspectRulesBtn.addEventListener('click', () => {
      const methTab = document.getElementById('tab-methodology');
      if (methTab) activateTab(methTab);
    });
  }
}

// --- Connectivity & Health ---
async function checkApiHealth() {
  const healthBadge = document.getElementById('health-badge');
  const healthText = document.getElementById('health-text');
  if (!healthBadge || !healthText) return;

  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    healthBadge.classList.remove('offline');
    healthText.textContent = `Operational (v${data.version || '0.1.0'})`;
  } catch (err) {
    healthBadge.classList.add('offline');
    healthText.textContent = 'API Offline';
  }
}

function initRetryButton() {
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      const errorState = document.getElementById('error-state');
      if (errorState) errorState.style.display = 'none';
      fetchAndRenderScoreboard();
      checkApiHealth();
    });
  }
}

// --- Primary Data Fetch & Render (Tested Public Contract) ---
async function fetchAndRenderScoreboard() {
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');

  try {
    const res = await fetch('/api/scoreboard');
    if (!res.ok) {
      throw new Error(`API returned HTTP status ${res.status}`);
    }
    const data = await res.json();
    cachedScoreboardData = data;
    if (errorState) errorState.style.display = 'none';
    renderDashboard(data);
  } catch (err) {
    console.error('Failed to load scoreboard metrics:', err);
    if (errorState && errorMessage) {
      errorMessage.textContent = `Unable to retrieve metrics from backend API (${err.message}). Check service connectivity.`;
      errorState.style.display = 'flex';
    }
    showErrorInTables('Backend API unavailable. Check service connectivity.');
  }
}

function renderDashboard(data) {
  const meta = data.metadata || {};
  const perf = data.overall_performance || {};

  // 1. Render Demonstration Notice Banner
  const banner = document.getElementById('demo-banner');
  const bannerText = document.getElementById('banner-text');
  if (banner && bannerText) {
    if (meta.is_demonstration_mode) {
      banner.style.display = 'block';
      bannerText.innerHTML = meta.disclaimer || 'DEMONSTRATION NOTICE: Synthetic test records active with fictional intermediaries (Platform A - Platform J).';
    } else {
      banner.style.display = 'none';
    }
  }

  // 2. Render Context & Metadata Bar
  if (meta.measurement_period_start && meta.measurement_period_end) {
    const startStr = meta.measurement_period_start.split('T')[0];
    const endStr = meta.measurement_period_end.split('T')[0];
    renderText('meta-period', `${startStr} to ${endStr}`);
  }
  if (meta.as_of) {
    const asOfStr = meta.as_of.split('T')[0];
    renderText('meta-as-of', asOfStr);
  }
  renderText('meta-total-requests', meta.total_requests_analyzed ? meta.total_requests_analyzed.toLocaleString() : '--');
  renderText('meta-incomplete-requests', perf.incomplete_police_requests_count !== null && perf.incomplete_police_requests_count !== undefined
    ? `${perf.incomplete_police_requests_count.toLocaleString()} cases`
    : '[Protected < k]');
  renderText('meta-verified-takedowns', perf.verified_takedowns_count !== undefined
    ? `${perf.verified_takedowns_count.toLocaleString()} verified`
    : '--');

  // 3. Radial Progress Donut Ring (Orbit Pattern)
  const complianceVal = perf.deadline_compliance_rate_pct !== null && perf.deadline_compliance_rate_pct !== undefined
    ? perf.deadline_compliance_rate_pct
    : null;
  const complianceText = complianceVal !== null ? complianceVal.toFixed(1) : 'N/A';
  renderText('metric-deadline-compliance', complianceText);

  const radialCircle = document.getElementById('radial-compliance-circle');
  if (radialCircle && complianceVal !== null) {
    const circumference = 251.2; // 2 * PI * 40
    const offset = circumference * (1 - Math.min(100, Math.max(0, complianceVal)) / 100);
    radialCircle.style.strokeDashoffset = offset;
    if (complianceVal >= 80) {
      radialCircle.style.stroke = 'var(--accent-emerald)';
    } else if (complianceVal < 50) {
      radialCircle.style.stroke = 'var(--accent-rose)';
    } else {
      radialCircle.style.stroke = 'var(--accent-orange)';
    }
  }

  // Linear progress bar fallback
  const progressBar = document.getElementById('compliance-progress-bar');
  if (progressBar && complianceVal !== null) {
    progressBar.style.width = `${Math.min(100, Math.max(0, complianceVal))}%`;
  }

  // Median Removal Time (with Right-Censoring Clarity)
  const medianEl = document.getElementById('metric-median-removal');
  const medianUnitEl = document.getElementById('metric-median-unit');
  if (medianEl) {
    if (perf.median_removal_censored) {
      medianEl.textContent = perf.median_removal_display || '> measurement window';
      medianEl.classList.add('censored');
      if (medianUnitEl) medianUnitEl.style.display = 'none';
    } else if (perf.median_removal_hours !== null && perf.median_removal_hours !== undefined) {
      medianEl.textContent = perf.median_removal_hours.toFixed(1);
      medianEl.classList.remove('censored');
      if (medianUnitEl) medianUnitEl.style.display = 'inline';
    } else {
      medianEl.textContent = 'N/A';
      medianEl.classList.remove('censored');
    }
  }

  // Tail Removal p90
  const p90El = document.getElementById('metric-p90-removal');
  const p90UnitEl = document.getElementById('metric-p90-unit');
  if (p90El) {
    if (perf.p90_removal_censored) {
      p90El.textContent = perf.p90_removal_display || '> measurement window';
      p90El.classList.add('censored');
      if (p90UnitEl) p90UnitEl.style.display = 'none';
    } else if (perf.p90_removal_hours !== null && perf.p90_removal_hours !== undefined) {
      p90El.textContent = perf.p90_removal_hours.toFixed(1);
      p90El.classList.remove('censored');
      if (p90UnitEl) p90UnitEl.style.display = 'inline';
    } else {
      p90El.textContent = 'N/A';
      p90El.classList.remove('censored');
    }
  }

  // Still Available Rate
  renderText('metric-still-available', perf.still_available_rate_pct !== null && perf.still_available_rate_pct !== undefined
    ? perf.still_available_rate_pct.toFixed(1)
    : '0.0');

  // Data Assistance SLA Turnaround
  renderText('metric-median-data', perf.median_data_response_hours !== null && perf.median_data_response_hours !== undefined
    ? perf.median_data_response_hours.toFixed(1)
    : 'N/A');

  // Quarantined Procedural Defects
  renderText('metric-incomplete-count', perf.incomplete_police_requests_count !== null && perf.incomplete_police_requests_count !== undefined
    ? perf.incomplete_police_requests_count.toLocaleString()
    : '[Protected < k]');

  // Benchmark Indicators
  const medianIndicator = document.getElementById('median-benchmark-status');
  if (medianIndicator) {
    if (perf.median_removal_censored) {
      medianIndicator.textContent = 'Overdue (Right-Censored)';
      medianIndicator.className = 'status-tag warn';
    } else if (perf.median_removal_hours !== null && perf.median_removal_hours !== undefined) {
      if (perf.median_removal_hours <= 3.0) {
        medianIndicator.textContent = 'Rule 3(1)(d) <= 3h Compliant';
        medianIndicator.className = 'status-tag pass';
      } else if (perf.median_removal_hours <= 24.0) {
        medianIndicator.textContent = 'Standard <= 24h Turnaround';
        medianIndicator.className = 'status-tag pass';
      } else {
        medianIndicator.textContent = 'Exceeds Statutory SLAs';
        medianIndicator.className = 'status-tag warn';
      }
    }
  }

  const dataIndicator = document.getElementById('data-sla-status');
  if (dataIndicator) {
    if (perf.median_data_response_hours !== null && perf.median_data_response_hours !== undefined) {
      if (perf.median_data_response_hours <= 72.0) {
        dataIndicator.textContent = 'Within 72h SLA';
        dataIndicator.className = 'status-tag pass';
      } else {
        dataIndicator.textContent = 'Exceeds 72h SLA';
        dataIndicator.className = 'status-tag warn';
      }
    } else {
      dataIndicator.textContent = 'No Data Requests';
      dataIndicator.className = 'status-tag';
    }
  }

  // 4. Render Integrity Metrics (Half 2)
  renderIntegrityPanel(data);

  // 5. Render Tables & Badges
  const platforms = data.platform_breakdown || [];
  const categories = data.category_breakdown || [];
  renderText('tab-platforms-count', platforms.length.toString());
  renderText('tab-categories-count', categories.length.toString());

  renderPlatformsTable(platforms);
  renderCategoriesTable(categories);
}

function renderIntegrityPanel(data) {
  const perf = data.overall_performance || {};
  const integrity = data.integrity_summary || {};

  const falseCount = integrity.false_removal_claims_count !== undefined ? integrity.false_removal_claims_count : (perf.false_removal_claims_count || 0);
  const falseRate = integrity.false_removal_claim_rate_pct !== undefined ? integrity.false_removal_claim_rate_pct : (perf.false_removal_claim_rate_pct || 0);
  const reuploadCount = integrity.observed_reuploads_count !== undefined ? integrity.observed_reuploads_count : (perf.observed_reuploads_count || 0);
  const reuploadRate = integrity.reupload_rate_pct !== undefined ? integrity.reupload_rate_pct : 0;
  const verifiedCount = integrity.verified_takedowns_count !== undefined ? integrity.verified_takedowns_count : (perf.verified_takedowns_count || 0);
  const coverage = integrity.verification_coverage_pct !== undefined ? integrity.verification_coverage_pct : (perf.verification_coverage_pct || 100);

  // Overview Donut Card
  renderText('overview-verified-count', verifiedCount.toLocaleString());
  renderText('overview-false-claims', falseCount.toLocaleString());
  renderText('overview-reuploads', reuploadCount.toLocaleString());
  renderText('overview-coverage-pct', `${coverage.toFixed(0)}%`);

  // Dedicated Integrity Panel
  renderText('int-verified-count', verifiedCount.toLocaleString());
  renderText('int-false-claims-count', falseCount.toLocaleString());
  renderText('int-reuploads-count', reuploadCount.toLocaleString());
  renderText('int-coverage-pct', `${coverage.toFixed(1)}%`);

  renderText('table-false-rate', `${falseCount} cases (${falseRate.toFixed(1)}%)`);
  renderText('table-reupload-rate', `${reuploadCount} cases (${reuploadRate.toFixed(1)}%)`);
}

function renderText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// --- Platform Table & Filters ---
function renderPlatformsTable(platforms) {
  const tbody = document.getElementById('platforms-table-body');
  if (!tbody) return;

  if (!platforms || platforms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="loading-cell">No platform records match the filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = platforms.map((p, idx) => {
    // Generate clean glyph letter
    const initial = (p.platform.split(' ').pop() || p.platform.charAt(0)).toUpperCase();

    if (p.is_suppressed) {
      return `
        <tr class="suppressed-row">
          <td>
            <div class="platform-cell">
              <span class="platform-glyph">${escapeHtml(initial)}</span>
              <strong>${escapeHtml(p.platform)}</strong>
            </div>
          </td>
          <td><span class="badge-suppressed" title="Cohort is below the k-anonymity publication threshold.">Suppressed</span></td>
          <td colspan="9" class="text-muted"><em>Protected cohort &lt; 10 cases suppressed under k-anonymity privacy policy.</em></td>
        </tr>
      `;
    }

    const medDisp = p.median_removal_censored 
      ? `<span class="badge-censored" title="Unresolved overdue requests exceed median rank">${escapeHtml(p.median_removal_display || '> window')}</span>`
      : (p.median_removal_hours !== null && p.median_removal_hours !== undefined ? `${p.median_removal_hours.toFixed(1)}h` : '--');

    const p90Disp = p.p90_removal_censored
      ? `<span class="badge-censored" title="Unresolved overdue requests exceed p90 rank">${escapeHtml(p.p90_removal_display || '> window')}</span>`
      : (p.p90_removal_hours !== null && p.p90_removal_hours !== undefined ? `${p.p90_removal_hours.toFixed(1)}h` : '--');

    let compClass = 'status-tag';
    let compWidth = 0;
    if (p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct !== undefined) {
      compWidth = Math.min(100, Math.max(0, p.deadline_compliance_rate_pct));
      compClass = p.deadline_compliance_rate_pct >= 80 ? 'status-tag pass' : (p.deadline_compliance_rate_pct < 50 ? 'status-tag danger' : 'status-tag warn');
    }

    const rejectDisp = p.rejections_count !== null && p.rejections_count !== undefined
      ? `${p.rejections_count} (${(p.rejection_rate_pct || 0).toFixed(1)}%)`
      : (p.rejection_rate_pct !== null && p.rejection_rate_pct !== undefined ? `${p.rejection_rate_pct.toFixed(1)}%` : '--');

    const verifiedDisp = p.verified_takedowns_count !== null && p.verified_takedowns_count !== undefined
      ? `${p.verified_takedowns_count}`
      : '--';

    return `
      <tr class="clickable-row" data-platform-index="${idx}" title="Click to inspect ${escapeHtml(p.platform)} in detail">
        <td>
          <div class="platform-cell">
            <span class="platform-glyph">${escapeHtml(initial)}</span>
            <strong>${escapeHtml(p.platform)}</strong>
          </div>
        </td>
        <td><span class="badge-audited">Audited</span></td>
        <td>${p.sample_size !== null && p.sample_size !== undefined ? p.sample_size : '--'}</td>
        <td>${medDisp}</td>
        <td>${p90Disp}</td>
        <td>
          <div class="mini-progress-bar"><div class="mini-progress-fill" style="width: ${compWidth}%;"></div></div>
          <span class="${compClass}">${p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct !== undefined ? p.deadline_compliance_rate_pct.toFixed(1) + '%' : 'N/A'}</span>
        </td>
        <td class="${p.still_available_rate_pct > 15 ? 'status-tag warn' : ''}">${p.still_available_rate_pct !== null && p.still_available_rate_pct !== undefined ? p.still_available_rate_pct.toFixed(1) + '%' : '0.0%'}</td>
        <td>${rejectDisp}</td>
        <td>${p.median_data_response_hours !== null && p.median_data_response_hours !== undefined ? p.median_data_response_hours.toFixed(1) + 'h' : 'N/A'}</td>
        <td><span style="color: var(--accent-emerald); font-weight: 700;">${verifiedDisp}</span></td>
        <td>
          <button type="button" class="inspect-pill-btn" aria-label="Deep dive into ${escapeHtml(p.platform)}">Inspect &rarr;</button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach interactive click listeners to rows
  const rows = tbody.querySelectorAll('.clickable-row');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.getAttribute('data-platform-index'), 10);
      if (!isNaN(idx) && platforms[idx]) {
        openPlatformDrawer(platforms[idx]);
      }
    });
  });
}

function renderCategoriesTable(categories) {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (!categories || categories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No harm category data available.</td></tr>';
    return;
  }

  tbody.innerHTML = categories.map(c => {
    if (c.is_suppressed) {
      return `
        <tr>
          <td><strong>${escapeHtml(c.category)}</strong></td>
          <td><span class="badge-suppressed">Suppressed</span></td>
          <td colspan="4" class="text-muted"><em>Protected cohort &lt; 10 cases suppressed under k-anonymity.</em></td>
        </tr>
      `;
    }

    const medDisp = c.median_removal_censored 
      ? `<span class="badge-censored">${escapeHtml(c.median_removal_display || '> window')}</span>`
      : (c.median_removal_hours !== null && c.median_removal_hours !== undefined ? `${c.median_removal_hours.toFixed(1)}h` : '--');

    const p90Disp = c.p90_removal_censored
      ? `<span class="badge-censored">${escapeHtml(c.p90_removal_display || '> window')}</span>`
      : (c.p90_removal_hours !== null && c.p90_removal_hours !== undefined ? `${c.p90_removal_hours.toFixed(1)}h` : '--');

    let compWidth = c.deadline_compliance_rate_pct !== null && c.deadline_compliance_rate_pct !== undefined ? Math.min(100, Math.max(0, c.deadline_compliance_rate_pct)) : 0;

    return `
      <tr>
        <td><strong>${escapeHtml(c.category)}</strong></td>
        <td><span class="badge-audited">Audited</span></td>
        <td>${c.sample_size !== null && c.sample_size !== undefined ? c.sample_size : '--'}</td>
        <td>${medDisp}</td>
        <td>${p90Disp}</td>
        <td>
          <div class="mini-progress-bar"><div class="mini-progress-fill" style="width: ${compWidth}%;"></div></div>
          ${c.deadline_compliance_rate_pct !== null && c.deadline_compliance_rate_pct !== undefined ? c.deadline_compliance_rate_pct.toFixed(1) + '%' : 'N/A'}
        </td>
      </tr>
    `;
  }).join('');
}

function initPlatformFilters() {
  const searchInput = document.getElementById('platform-search');
  const filterBtns = document.querySelectorAll('.pill-filter-btn');

  function applyFilters() {
    if (!cachedScoreboardData) return;
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let list = cachedScoreboardData.platform_breakdown || [];

    // Filter by tag
    if (currentPlatformFilter === 'compliant') {
      list = list.filter(p => !p.is_suppressed && p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct >= 80);
    } else if (currentPlatformFilter === 'overdue') {
      list = list.filter(p => !p.is_suppressed && p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct < 50);
    } else if (currentPlatformFilter === 'nonremoval') {
      list = list.filter(p => !p.is_suppressed && p.still_available_rate_pct !== null && p.still_available_rate_pct >= 10);
    }

    // Search query
    if (query) {
      list = list.filter(p => p.platform.toLowerCase().includes(query));
    }

    renderPlatformsTable(list);
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatformFilter = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });
}

function showErrorInTables(message) {
  const ptbody = document.getElementById('platforms-table-body');
  if (ptbody) {
    ptbody.innerHTML = `<tr><td colspan="10" class="loading-cell" style="color: var(--accent-rose);">${escapeHtml(message)}</td></tr>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Platform Deep-Dive Drawer Controller ---
function initPlatformDrawer() {
  const closeBtn = document.getElementById('drawer-close-btn');
  const backdrop = document.getElementById('drawer-backdrop');

  if (closeBtn) closeBtn.addEventListener('click', closePlatformDrawer);
  if (backdrop) backdrop.addEventListener('click', closePlatformDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlatformDrawer();
      closeUploadModal();
    }
  });
}

function openPlatformDrawer(p) {
  if (!p) return;
  const drawer = document.getElementById('platform-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !backdrop) return;

  const initial = (p.platform.split(' ').pop() || p.platform.charAt(0)).toUpperCase();
  renderText('drawer-platform-glyph', initial);
  renderText('drawer-platform-name', p.platform);

  const sampleSize = p.sample_size !== null && p.sample_size !== undefined ? `${p.sample_size} cases` : '--';
  renderText('drawer-sample-size', sampleSize);

  // SLA Gauge
  const compVal = p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct !== undefined ? p.deadline_compliance_rate_pct : null;
  const compText = compVal !== null ? compVal.toFixed(1) : 'N/A';
  renderText('drawer-compliance-pct', compText);

  const circle = document.getElementById('drawer-compliance-circle');
  const slaTag = document.getElementById('drawer-sla-tag');
  if (circle && compVal !== null) {
    const circumference = 251.2;
    const offset = circumference * (1 - Math.min(100, Math.max(0, compVal)) / 100);
    circle.style.strokeDashoffset = offset;
    if (compVal >= 80) {
      circle.style.stroke = 'var(--accent-emerald)';
      if (slaTag) { slaTag.textContent = 'Compliant'; slaTag.className = 'status-tag pass'; }
    } else if (compVal < 50) {
      circle.style.stroke = 'var(--accent-rose)';
      if (slaTag) { slaTag.textContent = 'Critical Miss'; slaTag.className = 'status-tag danger'; }
    } else {
      circle.style.stroke = 'var(--accent-orange)';
      if (slaTag) { slaTag.textContent = 'Under-Review'; slaTag.className = 'status-tag warn'; }
    }
  }

  // Still Available
  renderText('drawer-still-available', p.still_available_rate_pct !== null && p.still_available_rate_pct !== undefined ? `${p.still_available_rate_pct.toFixed(1)}%` : '0.0%');

  // Speeds
  const medEl = document.getElementById('drawer-median-speed');
  const medUnit = document.getElementById('drawer-median-unit');
  if (medEl) {
    if (p.median_removal_censored) {
      medEl.textContent = p.median_removal_display || '> window';
      if (medUnit) medUnit.style.display = 'none';
    } else if (p.median_removal_hours !== null && p.median_removal_hours !== undefined) {
      medEl.textContent = p.median_removal_hours.toFixed(1);
      if (medUnit) medUnit.style.display = 'inline';
    } else {
      medEl.textContent = '--';
    }
  }

  const p90El = document.getElementById('drawer-p90-speed');
  const p90Unit = document.getElementById('drawer-p90-unit');
  if (p90El) {
    if (p.p90_removal_censored) {
      p90El.textContent = p.p90_removal_display || '> window';
      if (p90Unit) p90Unit.style.display = 'none';
    } else if (p.p90_removal_hours !== null && p.p90_removal_hours !== undefined) {
      p90El.textContent = p.p90_removal_hours.toFixed(1);
      if (p90Unit) p90Unit.style.display = 'inline';
    } else {
      p90El.textContent = '--';
    }
  }

  // Integrity & Crawler Audits
  renderText('drawer-verified-count', p.verified_takedowns_count !== null && p.verified_takedowns_count !== undefined ? `${p.verified_takedowns_count} cases` : '--');
  renderText('drawer-false-claims', p.false_removal_claims_count !== null && p.false_removal_claims_count !== undefined ? `${p.false_removal_claims_count} cases` : '0');
  renderText('drawer-reuploads', p.observed_reuploads_count !== null && p.observed_reuploads_count !== undefined ? `${p.observed_reuploads_count} cases` : '0');

  // Statutory rules
  const medH = p.median_removal_hours;
  if (medH !== null && medH !== undefined && !p.median_removal_censored) {
    renderText('drawer-rule-31d', medH <= 3.0 ? `Compliant (${medH.toFixed(1)}h <= 3.0h)` : `Overdue (${medH.toFixed(1)}h > 3.0h)`);
    renderText('drawer-rule-32b', medH <= 2.0 ? `Compliant (${medH.toFixed(1)}h <= 2.0h)` : `Overdue (${medH.toFixed(1)}h > 2.0h)`);
  } else if (p.median_removal_censored) {
    renderText('drawer-rule-31d', 'Overdue (> window)');
    renderText('drawer-rule-32b', 'Overdue (> window)');
  } else {
    renderText('drawer-rule-31d', 'No qualifying orders');
    renderText('drawer-rule-32b', 'No qualifying orders');
  }

  renderText('drawer-data-speed', p.median_data_response_hours !== null && p.median_data_response_hours !== undefined ? `${p.median_data_response_hours.toFixed(1)}h (SLA <= 72h)` : 'No 79(3)(b) requests');
  renderText('drawer-rejections', p.rejections_count !== null && p.rejections_count !== undefined ? `${p.rejections_count} (${(p.rejection_rate_pct || 0).toFixed(1)}%)` : '--');

  backdrop.classList.add('active');
  drawer.classList.add('active');
  drawer.setAttribute('aria-hidden', 'false');
}

function closePlatformDrawer() {
  const drawer = document.getElementById('platform-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

// --- Dataset Upload Modal Controller ---
function initUploadModal() {
  const openBtn = document.getElementById('btn-open-upload');
  const closeBtn = document.getElementById('upload-close-btn');
  const backdrop = document.getElementById('upload-modal-backdrop');
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('dataset-file-input');
  const browseBtn = document.getElementById('btn-browse-file');

  if (openBtn) openBtn.addEventListener('click', openUploadModal);
  if (closeBtn) closeBtn.addEventListener('click', closeUploadModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeUploadModal();
    });
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleDatasetUpload(e.target.files[0]);
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleDatasetUpload(e.dataTransfer.files[0]);
      }
    });
    dropzone.addEventListener('click', (e) => {
      if (e.target !== browseBtn && fileInput) {
        fileInput.click();
      }
    });
  }
}

function openUploadModal() {
  const backdrop = document.getElementById('upload-modal-backdrop');
  const statusEl = document.getElementById('upload-status');
  if (statusEl) statusEl.style.display = 'none';
  if (backdrop) backdrop.classList.add('active');
}

function closeUploadModal() {
  const backdrop = document.getElementById('upload-modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

async function handleDatasetUpload(file) {
  const statusEl = document.getElementById('upload-status');
  if (!statusEl) return;

  statusEl.className = 'upload-status loading';
  statusEl.textContent = `Validating and uploading ${file.name}...`;
  statusEl.style.display = 'block';

  try {
    const isCsv = file.name.endsWith('.csv');
    const textContent = await file.text();

    const contentType = isCsv ? 'text/csv' : 'application/json';
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: textContent,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const respData = await res.json();
    statusEl.className = 'upload-status success';
    statusEl.textContent = `Success! Ingested ${respData.valid_count} valid records (${respData.invalid_count} quarantined defects). Scoreboard refreshed.`;

    if (respData.scoreboard) {
      cachedScoreboardData = respData.scoreboard;
      renderDashboard(respData.scoreboard);
    }

    setTimeout(() => {
      closeUploadModal();
    }, 1800);
  } catch (err) {
    statusEl.className = 'upload-status error';
    statusEl.textContent = `Upload failed: ${err.message}`;
  }
}


// --- Hardware-Accelerated Ambient Glow WebGL Shader ---
function initAmbientShader() {
  const canvas = document.getElementById('ambient-shader');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) {
    return;
  }
  if (!gl) return;

  // Vertex Shader: full quad
  const vsSource = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Fragment Shader: silky warm orange ambient aura + subtle wave distortion
  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      
      // Top right glowing aura center with mouse parallax
      vec2 center = vec2(0.9, 0.9) + (u_mouse - 0.5) * 0.06;
      float dist = distance(st, center);

      // Subtle atmospheric noise undulation
      float wave = sin(st.x * 2.8 + u_time * 0.35) * cos(st.y * 2.6 + u_time * 0.3) * 0.06;
      float glow = smoothstep(1.15, 0.08, dist + wave);

      // Deep orange & warm amber radiance (CoinSphere & Orbit reference)
      vec3 warmOrange = vec3(1.0, 0.46, 0.10); // #FF751A
      vec3 darkAmber = vec3(0.95, 0.22, 0.02);  // #F23805
      vec3 ambientColor = mix(darkAmber, warmOrange, glow * 0.85);

      // Bottom left subtle emerald whisper
      float bDist = distance(st, vec2(0.1, 0.1));
      float bGlow = smoothstep(0.7, 0.0, bDist) * 0.08;
      vec3 emerald = vec3(0.06, 0.72, 0.5);

      vec3 finalColor = ambientColor * (glow * 0.42) + emerald * bGlow;
      float alpha = glow * 0.55 + bGlow * 0.35;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

  gl.useProgram(prog);

  // Buffer setup for fullscreen quad
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouseX = 0.5, mouseY = 0.5;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = 1.0 - (e.clientY / window.innerHeight);
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  let startTime = performance.now();
  function renderShader() {
    if (!document.hidden) {
      const elapsed = (performance.now() - startTime) * 0.001;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(renderShader);
  }
  requestAnimationFrame(renderShader);
}

// --- Interactive 3D Verification Hero Constellation Mesh ---
function initHero3DCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const fallback = document.getElementById('canvas-fallback');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
    return;
  }

  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch (e) {
    canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
    return;
  }

  if (!ctx) {
    canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
    return;
  }

  // Multi-party Verification Nodes in 3D Space
  const nodes = [
    { x: -80, y: 0, z: 0, label: 'Police Order', primary: true, color: '#f59e0b' },
    { x: 0, y: -15, z: 15, label: 'Platform Intermediary', primary: true, color: '#ff7a1a' },
    { x: 80, y: 15, z: -10, label: 'Independent Verifier', primary: true, color: '#10b981' },
    { x: -45, y: -30, z: -25, color: '#ff8c42' },
    { x: -35, y: 35, z: 20, color: '#ff8c42' },
    { x: 40, y: -35, z: 15, color: '#10b981' },
    { x: 45, y: 35, z: -20, color: '#10b981' },
    { x: -95, y: -20, z: 12, color: '#f59e0b' },
    { x: 95, y: -15, z: 25, color: '#10b981' }
  ];

  const packets = [
    { from: 0, to: 1, progress: 0.1, speed: 0.009 },
    { from: 1, to: 2, progress: 0.5, speed: 0.011 },
    { from: 0, to: 3, progress: 0.8, speed: 0.008 }
  ];

  let mouseX = 0, mouseY = 0, rotX = 0, rotY = 0, isHovered = false;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    isHovered = true;
  });

  canvas.addEventListener('mouseleave', () => { isHovered = false; });

  function project(p, width, height) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

    let x1 = p.x * cosY + p.z * sinY;
    let z1 = -p.x * sinY + p.z * cosY;
    let y1 = p.y * cosX - z1 * sinX;
    let z2 = p.y * sinX + z1 * cosX;

    const fov = 240, distance = 240;
    const scale = fov / (distance + z2);

    return {
      x: width / 2 + x1 * scale,
      y: height / 2 + y1 * scale,
      scale: scale,
      z: z2
    };
  }

  function renderFrame() {
    if (document.hidden) {
      requestAnimationFrame(renderFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    const targetRotY = isHovered ? mouseX * 0.4 : Math.sin(Date.now() * 0.0006) * 0.12;
    const targetRotX = isHovered ? -mouseY * 0.3 : Math.cos(Date.now() * 0.0007) * 0.07;

    rotY += (targetRotY - rotY) * 0.05;
    rotX += (targetRotX - rotX) * 0.05;

    ctx.clearRect(0, 0, width, height);

    const projected = nodes.map(n => ({
      ...n,
      proj: project(n, width, height)
    }));

    // Draw connecting edges
    ctx.lineWidth = 1;
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const dx = projected[i].x - projected[j].x;
        const dy = projected[i].y - projected[j].y;
        const dz = projected[i].z - projected[j].z;
        const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist3d < 90) {
          const alpha = (1 - dist3d / 90) * 0.24;
          ctx.strokeStyle = `rgba(255, 122, 26, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(projected[i].proj.x, projected[i].proj.y);
          ctx.lineTo(projected[j].proj.x, projected[j].proj.y);
          ctx.stroke();
        }
      }
    }

    // Draw traveling pulse packets
    packets.forEach(pkt => {
      pkt.progress += pkt.speed;
      if (pkt.progress > 1) pkt.progress = 0;

      const p1 = projected[pkt.from].proj;
      const p2 = projected[pkt.to].proj;
      const curX = p1.x + (p2.x - p1.x) * pkt.progress;
      const curY = p1.y + (p2.y - p1.y) * pkt.progress;

      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw nodes
    projected.sort((a, b) => b.proj.z - a.proj.z);
    projected.forEach(node => {
      const p = node.proj;
      const radius = node.primary ? Math.max(3.5, 4.5 * p.scale) : Math.max(1.8, 2.4 * p.scale);

      ctx.fillStyle = node.color || '#ff7a1a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (node.primary) {
        ctx.strokeStyle = `rgba(255, 122, 26, ${0.4 * p.scale})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    requestAnimationFrame(renderFrame);
  }

  requestAnimationFrame(renderFrame);
}
