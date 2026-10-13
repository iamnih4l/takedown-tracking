/**
 * Social Media Takedown Accountability Platform - Frontend Controller
 * Minimal, Fast, Reliable Law-Enforcement Operational Interface
 */

let cachedScoreboardData = null;
let currentPlatformFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize core UI controls immediately (zero blocking)
  initThemeToggle();
  initTabs();
  initPlatformFilters();
  initRetryButton();

  // 2. Fetch and render primary operational data immediately
  fetchAndRenderScoreboard();

  // 3. Check background API health
  checkApiHealth();

  // 4. Initialize non-essential 3D hero visualization after DOM is interactive
  setTimeout(() => {
    initHero3DCanvas();
  }, 50);
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
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
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
    });
  });
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

// --- Primary Data Fetch & Render (Tested Contract) ---
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
      errorMessage.textContent = `Unable to retrieve metrics from backend API (${err.message}). Verify that python -m takedown_tracking.cli serve is running.`;
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

  // 3. Core Metrics Bento Cards
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

  // Statutory Deadline Compliance
  renderText('metric-deadline-compliance', perf.deadline_compliance_rate_pct !== null && perf.deadline_compliance_rate_pct !== undefined
    ? perf.deadline_compliance_rate_pct.toFixed(1)
    : 'N/A');
  const progressBar = document.getElementById('compliance-progress-bar');
  if (progressBar && perf.deadline_compliance_rate_pct !== null && perf.deadline_compliance_rate_pct !== undefined) {
    progressBar.style.width = `${Math.min(100, Math.max(0, perf.deadline_compliance_rate_pct))}%`;
  }

  // Still Available Rate
  renderText('metric-still-available', perf.still_available_rate_pct !== null && perf.still_available_rate_pct !== undefined
    ? perf.still_available_rate_pct.toFixed(1)
    : '0.0');

  // Data Request SLA Turnaround
  renderText('metric-median-data', perf.median_data_response_hours !== null && perf.median_data_response_hours !== undefined
    ? perf.median_data_response_hours.toFixed(1)
    : 'N/A');

  // Quarantined Deficiencies
  renderText('metric-incomplete-count', perf.incomplete_police_requests_count !== null && perf.incomplete_police_requests_count !== undefined
    ? perf.incomplete_police_requests_count.toLocaleString()
    : '[Protected < k]');

  // Benchmark Indicators
  const medianIndicator = document.getElementById('median-benchmark-status');
  if (medianIndicator) {
    if (perf.median_removal_censored) {
      medianIndicator.textContent = 'Overdue (Right-Censored)';
      medianIndicator.className = 'status-indicator warn';
    } else if (perf.median_removal_hours !== null && perf.median_removal_hours !== undefined) {
      if (perf.median_removal_hours <= 3.0) {
        medianIndicator.textContent = 'Rule 3(1)(d) Compliant (<= 3h)';
        medianIndicator.className = 'status-indicator pass';
      } else if (perf.median_removal_hours <= 24.0) {
        medianIndicator.textContent = 'Standard Turnaround (<= 24h)';
        medianIndicator.className = 'status-indicator pass';
      } else {
        medianIndicator.textContent = 'Exceeds Statutory SLAs';
        medianIndicator.className = 'status-indicator warn';
      }
    }
  }

  const dataIndicator = document.getElementById('data-sla-status');
  if (dataIndicator) {
    if (perf.median_data_response_hours !== null && perf.median_data_response_hours !== undefined) {
      if (perf.median_data_response_hours <= 72.0) {
        dataIndicator.textContent = 'Within 72.0h Statutory SLA';
        dataIndicator.className = 'status-indicator pass';
      } else {
        dataIndicator.textContent = 'Exceeds 72.0h Statutory SLA';
        dataIndicator.className = 'status-indicator warn';
      }
    } else {
      dataIndicator.textContent = 'No Data Requests';
      dataIndicator.className = 'status-indicator';
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
    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No platform records match the filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = platforms.map(p => {
    if (p.is_suppressed) {
      return `
        <tr>
          <td><strong>${escapeHtml(p.platform)}</strong></td>
          <td><span class="suppressed-badge" title="Cohort is below the k-anonymity publication threshold.">Suppressed</span></td>
          <td colspan="8" class="text-muted"><em>Protected cohort &lt; 10 cases suppressed under k-anonymity privacy policy.</em></td>
        </tr>
      `;
    }

    const medDisp = p.median_removal_censored 
      ? `<span class="badge-neutral" title="Unresolved overdue requests exceed median rank">${escapeHtml(p.median_removal_display || '> window')}</span>`
      : (p.median_removal_hours !== null && p.median_removal_hours !== undefined ? `${p.median_removal_hours.toFixed(1)}h` : '--');

    const p90Disp = p.p90_removal_censored
      ? `<span class="badge-neutral" title="Unresolved overdue requests exceed p90 rank">${escapeHtml(p.p90_removal_display || '> window')}</span>`
      : (p.p90_removal_hours !== null && p.p90_removal_hours !== undefined ? `${p.p90_removal_hours.toFixed(1)}h` : '--');

    let compClass = 'status-indicator';
    if (p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct !== undefined) {
      compClass = p.deadline_compliance_rate_pct >= 80 ? 'status-indicator pass' : (p.deadline_compliance_rate_pct < 50 ? 'status-indicator danger' : 'status-indicator warn');
    }

    const rejectDisp = p.rejections_count !== null && p.rejections_count !== undefined
      ? `${p.rejections_count} (${(p.rejection_rate_pct || 0).toFixed(1)}%)`
      : (p.rejection_rate_pct !== null && p.rejection_rate_pct !== undefined ? `${p.rejection_rate_pct.toFixed(1)}%` : '--');

    const verifiedDisp = p.verified_takedowns_count !== null && p.verified_takedowns_count !== undefined
      ? `${p.verified_takedowns_count}`
      : '--';

    return `
      <tr>
        <td><strong>${escapeHtml(p.platform)}</strong></td>
        <td><span class="public-badge">Audited</span></td>
        <td>${p.sample_size !== null && p.sample_size !== undefined ? p.sample_size : '--'}</td>
        <td>${medDisp}</td>
        <td>${p90Disp}</td>
        <td class="${compClass}">${p.deadline_compliance_rate_pct !== null && p.deadline_compliance_rate_pct !== undefined ? p.deadline_compliance_rate_pct.toFixed(1) + '%' : 'N/A'}</td>
        <td class="${p.still_available_rate_pct > 15 ? 'status-indicator warn' : ''}">${p.still_available_rate_pct !== null && p.still_available_rate_pct !== undefined ? p.still_available_rate_pct.toFixed(1) + '%' : '0.0%'}</td>
        <td>${rejectDisp}</td>
        <td>${p.median_data_response_hours !== null && p.median_data_response_hours !== undefined ? p.median_data_response_hours.toFixed(1) + 'h' : 'N/A'}</td>
        <td><span class="verified-pill">${verifiedDisp}</span></td>
      </tr>
    `;
  }).join('');
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
          <td><span class="suppressed-badge">Suppressed</span></td>
          <td colspan="4" class="text-muted"><em>Protected cohort &lt; 10 cases suppressed under k-anonymity.</em></td>
        </tr>
      `;
    }

    const medDisp = c.median_removal_censored 
      ? `<span class="badge-neutral">${escapeHtml(c.median_removal_display || '> window')}</span>`
      : (c.median_removal_hours !== null && c.median_removal_hours !== undefined ? `${c.median_removal_hours.toFixed(1)}h` : '--');

    const p90Disp = c.p90_removal_censored
      ? `<span class="badge-neutral">${escapeHtml(c.p90_removal_display || '> window')}</span>`
      : (c.p90_removal_hours !== null && c.p90_removal_hours !== undefined ? `${c.p90_removal_hours.toFixed(1)}h` : '--');

    return `
      <tr>
        <td><strong>${escapeHtml(c.category)}</strong></td>
        <td><span class="public-badge">Audited</span></td>
        <td>${c.sample_size !== null && c.sample_size !== undefined ? c.sample_size : '--'}</td>
        <td>${medDisp}</td>
        <td>${p90Disp}</td>
        <td>${c.deadline_compliance_rate_pct !== null && c.deadline_compliance_rate_pct !== undefined ? c.deadline_compliance_rate_pct.toFixed(1) + '%' : 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

function initPlatformFilters() {
  const searchInput = document.getElementById('platform-search');
  const filterBtns = document.querySelectorAll('.filter-tag-btn');

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

// --- Lightweight Non-Blocking 3D Verification Hero Canvas ---
function initHero3DCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const fallback = document.getElementById('canvas-fallback');
  if (!canvas) return;

  // Respect prefers-reduced-motion
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

  // Verification Constellation Nodes in 3D Space (X, Y, Z)
  // 3 Primary Nodes: Police Unit (center-left), Platform (center), External Verifier (center-right)
  const nodes = [
    { x: -90, y: 0, z: 0, label: 'Police Order', primary: true, color: '#f59e0b' },
    { x: 0, y: -20, z: 20, label: 'Platform Intermediary', primary: true, color: '#ff6b2b' },
    { x: 90, y: 15, z: -10, label: 'Independent Verifier', primary: true, color: '#10b981' },
    // Surrounding Verification & Timing Checkpoints
    { x: -55, y: -35, z: -30, color: '#ff8542' },
    { x: -40, y: 40, z: 25, color: '#ff8542' },
    { x: 45, y: -45, z: 20, color: '#10b981' },
    { x: 50, y: 40, z: -25, color: '#10b981' },
    { x: -110, y: -25, z: 15, color: '#f59e0b' },
    { x: 110, y: -20, z: 30, color: '#10b981' },
    { x: 0, y: 55, z: -20, color: '#ff6b2b' }
  ];

  // Optical verification packet trails
  const packets = [
    { from: 0, to: 1, progress: 0.1, speed: 0.008 },
    { from: 1, to: 2, progress: 0.5, speed: 0.010 },
    { from: 0, to: 3, progress: 0.8, speed: 0.007 },
    { from: 2, to: 6, progress: 0.3, speed: 0.009 }
  ];

  let mouseX = 0;
  let mouseY = 0;
  let rotX = 0;
  let rotY = 0;
  let isHovered = false;
  let animationFrameId = null;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    isHovered = true;
  });

  canvas.addEventListener('mouseleave', () => {
    isHovered = false;
  });

  function project(p, width, height) {
    // 3D Rotation matrices
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    // Rotate Y
    let x1 = p.x * cosY + p.z * sinY;
    let z1 = -p.x * sinY + p.z * cosY;

    // Rotate X
    let y1 = p.y * cosX - z1 * sinX;
    let z2 = p.y * sinX + z1 * cosX;

    // Perspective projection
    const fov = 260;
    const distance = 260;
    const scale = fov / (distance + z2);

    return {
      x: width / 2 + x1 * scale,
      y: height / 2 + y1 * scale,
      scale: scale,
      z: z2
    };
  }

  function renderFrame() {
    // Pause animation when tab is not visible to save CPU/battery
    if (document.hidden) {
      animationFrameId = requestAnimationFrame(renderFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Smooth inertia interpolation
    const targetRotY = isHovered ? mouseX * 0.45 : Math.sin(Date.now() * 0.0006) * 0.15;
    const targetRotX = isHovered ? -mouseY * 0.35 : Math.cos(Date.now() * 0.0007) * 0.08;

    rotY += (targetRotY - rotY) * 0.05;
    rotX += (targetRotX - rotX) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // Project nodes
    const projected = nodes.map(n => ({
      ...n,
      proj: project(n, width, height)
    }));

    // Draw connecting lines
    ctx.lineWidth = 1;
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const dx = projected[i].x - projected[j].x;
        const dy = projected[i].y - projected[j].y;
        const dz = projected[i].z - projected[j].z;
        const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist3d < 95) {
          const alpha = (1 - dist3d / 95) * 0.22;
          ctx.strokeStyle = `rgba(255, 107, 43, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(projected[i].proj.x, projected[i].proj.y);
          ctx.lineTo(projected[j].proj.x, projected[j].proj.y);
          ctx.stroke();
        }
      }
    }

    // Draw traveling verification pulse packets
    packets.forEach(pkt => {
      pkt.progress += pkt.speed;
      if (pkt.progress > 1) pkt.progress = 0;

      const p1 = projected[pkt.from].proj;
      const p2 = projected[pkt.to].proj;
      const curX = p1.x + (p2.x - p1.x) * pkt.progress;
      const curY = p1.y + (p2.y - p1.y) * pkt.progress;

      ctx.fillStyle = '#ff8542';
      ctx.beginPath();
      ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw nodes
    projected.sort((a, b) => b.proj.z - a.proj.z);
    projected.forEach(node => {
      const p = node.proj;
      const radius = node.primary ? Math.max(3.5, 4.8 * p.scale) : Math.max(1.8, 2.5 * p.scale);

      ctx.fillStyle = node.color || '#ff6b2b';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow on primary nodes
      if (node.primary) {
        ctx.strokeStyle = `rgba(255, 107, 43, ${0.35 * p.scale})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    animationFrameId = requestAnimationFrame(renderFrame);
  }

  // Start animation loop
  animationFrameId = requestAnimationFrame(renderFrame);
}
