/**
 * ui.js — Handle DOM manipulation, rendering, and UI state
 *
 * Dependencies: None (Data passed in via app.js)
 * Side effects: Mutates DOM
 */

var UI = (function () {

  // --- Element References ---
  var els = {
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    mobileThemeBtn: document.getElementById('mobile-theme-btn'),
    // Mobile menu
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    // Username
    usernameInput: document.getElementById('username-input'),
    // Main Content Areas
    emptyState: document.getElementById('empty-state'),
    dashboard: document.getElementById('dashboard'),
    // PGN Modal
    pgnModal: document.getElementById('pgn-modal'),
    pgnInput: document.getElementById('pgn-input'),
    pgnCloseBtn: document.getElementById('pgn-modal-close'),
    pgnCancelBtn: document.getElementById('pgn-modal-cancel'),
    analyzeBtn: document.getElementById('analyze-btn'),
    analyzeSpinner: document.getElementById('analyze-spinner'),
    processingFeedback: document.getElementById('processing-feedback'),
    feedbackText: document.getElementById('feedback-text'),
    parseWarnings: document.getElementById('parse-warnings'),
    warningText: document.getElementById('warning-text'),
    // Overview
    valTotalGames: document.getElementById('val-total-games'),
    valWinrate: document.getElementById('val-winrate'),
    valWins: document.getElementById('val-wins'),
    valLosses: document.getElementById('val-losses'),
    valDraws: document.getElementById('val-draws'),
    // Cards
    colorStats: document.getElementById('color-stats'),
    insightColor: document.getElementById('insight-color'),
    timecontrolStats: document.getElementById('timecontrol-stats'),
    insightTimecontrol: document.getElementById('insight-timecontrol'),
    openingStats: document.getElementById('opening-stats'),
    insightOpenings: document.getElementById('insight-openings'),
    outcomeStats: document.getElementById('outcome-stats'),
    insightOutcomes: document.getElementById('insight-outcomes'),
    gamelengthStats: document.getElementById('gamelength-stats'),
    insightGamelength: document.getElementById('insight-gamelength'),
    gamephaseStats: document.getElementById('gamephase-stats'),
    insightGamephase: document.getElementById('insight-gamephase'),
    insightsList: document.getElementById('insights-list'),
    // Footer Stats
    sidebarGameCount: document.getElementById('sidebar-game-count'),
    sidebarLastUpdated: document.getElementById('sidebar-last-updated'),
    // Confirm Modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('modal-title'),
    confirmText: document.getElementById('modal-text'),
    confirmCancelBtn: document.getElementById('modal-cancel'),
    confirmBtn: document.getElementById('modal-confirm'),
  };

  // FEATURE: Chart.js migration
  const chartInstances = {};

  // --- Lichess brand color helpers ---
  function lcColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  var LC = {
    win:   function(){ return lcColor('--color-win')   || '#4CAF50'; },
    loss:  function(){ return lcColor('--color-loss')  || '#E53935'; },
    draw:  function(){ return lcColor('--color-draw')  || '#FFB300'; },
    blue:  function(){ return lcColor('--lc-blue')     || '#3692E7'; },
    biscuit: function(){ return lcColor('--lc-biscuit')|| '#F0D9B5'; },
    gray:  function(){ return '#71717A'; },
  };



  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'data-theme') {
          var style = getComputedStyle(document.documentElement);
          var textColor = style.getPropertyValue('--text-secondary').trim() || '#3F3F46';
          var gridColor = style.getPropertyValue('--card-border').trim() || '#E4E4E7';
          
          if (typeof Chart !== 'undefined') {
            Chart.defaults.color = textColor;
            Chart.defaults.borderColor = gridColor;
            
            Object.keys(chartInstances).forEach(function(id) {
              if (chartInstances[id]) {
                chartInstances[id].update();
              }
            });
          }
        }
      });
    }).observe(document.documentElement, { attributes: true });
  }

  function initChart(id, config) {
    if (typeof Chart === 'undefined') return;
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
    var el = document.getElementById(id);
    if (!el) return;
    
    var style = getComputedStyle(document.documentElement);
    Chart.defaults.color = style.getPropertyValue('--text-secondary').trim() || '#3F3F46';
    Chart.defaults.borderColor = style.getPropertyValue('--card-border').trim() || '#E4E4E7';

    var ctx = el.getContext('2d');
    chartInstances[id] = new Chart(ctx, config);
  }

  // --- Theme ---

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Sync pill toggle visual state
    var isLight = theme === 'light';
    [els.themeToggle, els.mobileThemeBtn].forEach(function(btn) {
      if (!btn) return;
      if (isLight) btn.classList.add('is-light');
      else btn.classList.remove('is-light');
    });
    // Update Chart.js defaults to match new theme
    if (typeof Chart !== 'undefined') {
      var s = getComputedStyle(document.documentElement);
      Chart.defaults.color = s.getPropertyValue('--text-secondary').trim() || '#3F3F46';
      Chart.defaults.borderColor = s.getPropertyValue('--card-border').trim() || '#E4E4E7';
    }
  }

  // --- Views ---

  function showEmptyState() {
    if (els.dashboard) els.dashboard.classList.add('hidden');
    if (els.emptyState) els.emptyState.classList.remove('hidden');
    var demoAlert = document.getElementById('demo-mode-alert');
    if (demoAlert) demoAlert.remove();
  }

  function showDashboard() {
    if (els.emptyState) els.emptyState.classList.add('hidden');
    if (els.dashboard) els.dashboard.classList.remove('hidden');
    skeletonizeStats();
  }

  // --- Modals ---

  function showPgnModal() {
    if (els.pgnInput) els.pgnInput.value = '';
    hideProcessingFeedback();
    hideParseWarnings();
    if (els.pgnModal) els.pgnModal.classList.remove('hidden');
    if (els.pgnInput) els.pgnInput.focus();
  }

  function hidePgnModal() {
    if (els.pgnModal) els.pgnModal.classList.add('hidden');
  }

  var currentConfirmCallback = null;

  function showConfirmModal(title, text, onConfirm) {
    if (els.confirmTitle) els.confirmTitle.textContent = title;
    if (els.confirmText) els.confirmText.textContent = text;
    currentConfirmCallback = onConfirm;
    if (els.confirmModal) els.confirmModal.classList.remove('hidden');
  }

  function hideConfirmModal() {
    if (els.confirmModal) els.confirmModal.classList.add('hidden');
    currentConfirmCallback = null;
  }

  function showAlertModal(title, text) {
    if (els.confirmTitle) els.confirmTitle.textContent = title;
    if (els.confirmText) els.confirmText.textContent = text;
    if (els.confirmCancelBtn) els.confirmCancelBtn.style.display = 'none';
    if (els.confirmBtn) els.confirmBtn.textContent = 'OK';
    
    currentConfirmCallback = function() {
      if (els.confirmCancelBtn) els.confirmCancelBtn.style.display = '';
      if (els.confirmBtn) els.confirmBtn.textContent = 'Confirm';
      hideConfirmModal();
    };
    
    if (els.confirmModal) els.confirmModal.classList.remove('hidden');
  }

  // --- Processing Feedback ---

  function showProcessingFeedback(text) {
    if (els.feedbackText) els.feedbackText.textContent = text;
    if (els.processingFeedback) els.processingFeedback.classList.remove('hidden');
    if (els.analyzeSpinner) els.analyzeSpinner.classList.remove('hidden');
    if (els.analyzeBtn) els.analyzeBtn.disabled = true;
  }

  function hideProcessingFeedback() {
    if (els.processingFeedback) els.processingFeedback.classList.add('hidden');
    if (els.analyzeSpinner) els.analyzeSpinner.classList.add('hidden');
    if (els.analyzeBtn) els.analyzeBtn.disabled = false;
  }

  function showParseWarnings(text) {
    if (els.warningText) els.warningText.textContent = text;
    if (els.parseWarnings) els.parseWarnings.classList.remove('hidden');
  }

  function hideParseWarnings() {
    if (els.parseWarnings) els.parseWarnings.classList.add('hidden');
  }

  // --- Rendering ---

  function txt(id, v) {
    var e = document.getElementById(id);
    if (!e) return;
    e.textContent = v;
    // Remove skeleton state when real value arrives
    if (v && v !== '—' && v !== '') e.removeAttribute('data-empty');
  }

  // Set all stat card values to skeleton state on load
  function skeletonizeStats() {
    ['val-total-games','val-winrate','val-best-tc','val-common-loss',
     'val-white-wr','val-black-wr','val-best-color','val-color-diff',
     'val-tc-best','val-tc-most','val-tc-vol','val-tc-timeout',
     'val-best-opening','val-worst-opening',
     'val-streak-wins','val-streak-losses','val-current-streak'].forEach(function(id) {
      var e = document.getElementById(id);
      if (e) { e.textContent = ''; e.setAttribute('data-empty', 'true'); }
    });
  }

  function renderDashboard(analysis, insightsSet) {
    if (!analysis) { showEmptyState(); return; }
    showDashboard();
    var a = analysis, o = a.overall, c = a.color, tc = a.timeControl, gl = a.gameLength, gp = a.gamePhase, out = a.outcomes;

    // === OVERVIEW (index.html) ===
    txt('val-total-games', o.totalGames);
    txt('val-total-games-sub', o.wins + 'W / ' + o.losses + 'L / ' + o.draws + 'D');
    txt('val-winrate', o.winRate + '%');
    txt('val-winrate-sub', o.wins + (o.wins === 1 ? ' win of ' : ' wins of ') + o.totalGames);
    if (tc.best !== 'N/A' && tc[tc.best]) { txt('val-best-tc', tc.best); txt('val-best-tc-sub', tc[tc.best].winRate + '% win rate'); }
    if (out.mostCommonLoss !== 'N/A') { txt('val-common-loss', capitalize(out.mostCommonLoss)); txt('val-common-loss-sub', out.losses[out.mostCommonLoss] ? out.losses[out.mostCommonLoss].pct + '% of losses' : ''); }
    renderOverviewDonut(a);
    renderOverviewTimeline(a);
    renderRecentGames(a);
    renderOverviewInsights(insightsSet);

    // === PERFORMANCE (performance.html) ===
    txt('val-white-wr', c.white.winRate + '%');
    txt('val-white-wr-sub', c.white.total + ' games / ' + c.white.wins + 'W');
    txt('val-black-wr', c.black.winRate + '%');
    txt('val-black-wr-sub', c.black.total + ' games / ' + c.black.wins + 'W');
    txt('val-best-color', c.bestColor);
    txt('val-best-color-sub', c.differential !== 'N/A' ? '+' + c.differential + '% advantage' : '');
    txt('val-color-diff', c.differential !== 'N/A' ? c.differential + '%' : 'N/A');
    if (document.getElementById('color-stats')) {
      renderColorStats(c, a.confidence.color);
      renderColorBreakdown(c);
      renderColorTable(c);
      renderInsightBox(document.getElementById('insight-color'), insightsSet.color);
    }

    // === TIME CONTROL (time-control.html) ===
    if (tc.best !== 'N/A' && tc[tc.best]) { txt('val-tc-best', tc.best); txt('val-tc-best-sub', tc[tc.best].winRate + '% win rate'); }
    if (tc.highestVolume !== 'N/A' && tc[tc.highestVolume]) { txt('val-tc-most', tc.highestVolume); txt('val-tc-most-sub', tc[tc.highestVolume].total + (tc[tc.highestVolume].total === 1 ? ' game' : ' games')); }
    if (tc.highestVolume !== 'N/A' && tc[tc.highestVolume]) { txt('val-tc-vol', tc[tc.highestVolume].total); txt('val-tc-vol-sub', tc.highestVolume + ' format'); }
    if (tc.timeoutRisk !== 'N/A' && tc[tc.timeoutRisk]) { txt('val-tc-timeout', tc.timeoutRisk); txt('val-tc-timeout-sub', tc[tc.timeoutRisk].lossCauses.timeout + (tc[tc.timeoutRisk].lossCauses.timeout === 1 ? ' timeout loss' : ' timeout losses')); }
    if (document.getElementById('timecontrol-stats')) {
      renderTimeControlStats(tc, a.confidence.timeControl);
      renderTCLossCause(tc);
      renderTCTable(tc);
      renderInsightBox(document.getElementById('insight-timecontrol'), insightsSet.timeControl);
    }

    // === OPENINGS (openings.html) ===
    var ops = a.openings;
    var qOps = ops.filter(function(x){return x.total>=5 && x.name!=='Unknown';});
    if (qOps.length > 0) { txt('val-best-opening', qOps[0].name); txt('val-best-opening-sub', qOps[0].winRate + '% over ' + qOps[0].total + (qOps[0].total === 1 ? ' game' : ' games')); }
    else { txt('val-best-opening', 'N/A'); txt('val-best-opening-sub', 'Not enough data'); }
    if (qOps.length > 1) { var wo=qOps[qOps.length-1]; txt('val-worst-opening', wo.name); txt('val-worst-opening-sub', wo.winRate + '% over ' + wo.total + (wo.total === 1 ? ' game' : ' games')); }
    else { txt('val-worst-opening', 'N/A'); txt('val-worst-opening-sub', 'Not enough data'); }
    if (a.mostPlayedOpening) { txt('val-most-played-op', a.mostPlayedOpening.name); txt('val-most-played-op-sub', a.mostPlayedOpening.total + (a.mostPlayedOpening.total === 1 ? ' game' : ' games')); }
    else { txt('val-most-played-op', 'N/A'); txt('val-most-played-op-sub', 'Not enough data'); }
    txt('val-op-diversity', a.openingDiversity);
    if (document.getElementById('opening-stats')) {
      renderOpeningCharts(qOps);
      renderOpeningStats(ops);
      renderInsightBox(document.getElementById('insight-openings'), insightsSet.openings);
    }

    // === OUTCOMES (outcomes.html) ===
    if (out.mostCommonWin !== 'N/A') { txt('val-common-win', capitalize(out.mostCommonWin)); txt('val-common-win-sub', out.wins[out.mostCommonWin] ? out.wins[out.mostCommonWin].pct + '% of wins' : ''); }
    var toPct = out.losses.timeout ? out.losses.timeout.pct : 0;
    var toCount = out.losses.timeout ? out.losses.timeout.count : 0;
    txt('val-timeout-pct', toPct + '%'); txt('val-timeout-pct-sub', toCount + (toCount === 1 ? ' timeout loss' : ' timeout losses'));
    if (out.mostCommonLoss !== 'N/A') { txt('val-common-loss-out', capitalize(out.mostCommonLoss)); txt('val-common-loss-out-sub', out.losses[out.mostCommonLoss] ? out.losses[out.mostCommonLoss].pct + '% of losses' : ''); }
    var drawR = o.totalGames > 0 ? Math.round((o.draws/o.totalGames)*1000)/10 : 0;
    txt('val-draw-rate', drawR + '%'); txt('val-draw-rate-sub', o.draws + (o.draws === 1 ? ' draw total' : ' draws total'));
    if (document.getElementById('outcome-stats')) {
      renderOutcomeStats(out);
      renderOutcomeLossDonut(out);
      renderOutcomeBars(out);
      renderOutcomeTable(out);
      renderInsightBox(document.getElementById('insight-outcomes'), insightsSet.outcomes);
    }

    // === GAME LENGTH (game-length.html) ===
    txt('val-avg-win-moves', gl.avgWinMoves);
    txt('val-avg-loss-moves', gl.avgLossMoves);
    txt('val-gl-diff', gl.differential);
    txt('val-longest-game', gl.longest);
    if (document.getElementById('gamelength-stats')) {
      renderGameLengthStats(gl);
      renderGLDistribution(gl);
      renderGLTable(gl);
      renderInsightBox(document.getElementById('insight-gamelength'), insightsSet.gameLength);
    }

    // === GAME PHASE (game-phase.html) ===
    var phaseTotal = gp.opening.count+gp.middlegame.count+gp.endgame.count;
    txt('val-opening-pct', gp.opening.pct + '%'); txt('val-opening-pct-sub', gp.opening.count + ' of ' + phaseTotal + (phaseTotal === 1 ? ' game' : ' games'));
    txt('val-mid-pct', gp.middlegame.pct + '%'); txt('val-mid-pct-sub', gp.middlegame.count + ' of ' + phaseTotal + (phaseTotal === 1 ? ' game' : ' games'));
    txt('val-end-pct', gp.endgame.pct + '%'); txt('val-end-pct-sub', gp.endgame.count + ' of ' + phaseTotal + (phaseTotal === 1 ? ' game' : ' games'));
    txt('val-weakest-phase', gp.mostCommonLossPhase !== 'N/A' ? capitalize(gp.mostCommonLossPhase) : 'N/A');
    if (document.getElementById('gamephase-stats')) {
      renderGamePhaseStats(gp);
      renderGPWinLoss(gp);
      renderGPTable(gp);
      renderInsightBox(document.getElementById('insight-gamephase'), insightsSet.gamePhase);
    }

    // === INSIGHTS (insights.html) ===
    if (insightsSet.strongestArea) { txt('val-strongest', insightsSet.strongestArea.label); txt('val-strongest-sub', insightsSet.strongestArea.rate + '% win rate'); }
    else { txt('val-strongest', 'N/A'); txt('val-strongest-sub', 'Not enough data'); }
    if (insightsSet.weakestArea) { txt('val-weakest', insightsSet.weakestArea.label); txt('val-weakest-sub', insightsSet.weakestArea.rate + '% win rate'); }
    else { txt('val-weakest', 'N/A'); txt('val-weakest-sub', 'Not enough data'); }
    if (insightsSet.mostReliableOpening) { txt('val-reliable-op', insightsSet.mostReliableOpening.label); txt('val-reliable-op-sub', insightsSet.mostReliableOpening.rate + '% over ' + insightsSet.mostReliableOpening.games + (insightsSet.mostReliableOpening.games === 1 ? ' game' : ' games')); }
    else { txt('val-reliable-op', 'N/A'); txt('val-reliable-op-sub', 'Not enough data'); }
    txt('val-main-target', insightsSet.mainTarget || 'Keep playing');
    if (document.getElementById('insights-list')) {
      renderKeyInsights(insightsSet);
    }
  }

  // --- Specific Renders ---

  function renderColorStats(colorData, conf) {
    var el = document.getElementById('color-stats'); if (!el) return;
    
    // FEATURE: Chart.js migration
    var html = '<div style="position:relative; height:150px; width:100%;"><canvas id="color-comparison-chart"></canvas></div>';
    if (colorData.bestColor !== 'N/A') {
      html += '<p style="font-size: var(--font-sm); text-align: center; margin-top: var(--sp-sm);">Best color: <strong>' + colorData.bestColor + '</strong></p>';
    }
    el.innerHTML = html;

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var wC = isDark ? '#E4E4E7' : '#FAFAFA';
    var bC = isDark ? '#27272A' : '#18181B';
    var borderColor = isDark ? '#3F3F46' : '#E4E4E7';

    initChart('color-comparison-chart', {
      type: 'bar',
      data: {
        labels: ['White', 'Black'],
        datasets: [{
          label: 'Win Rate (%)',
          data: [colorData.white.winRate, colorData.black.winRate],
          backgroundColor: [wC, bC],
          borderColor: borderColor,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 100 }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function getColorClassByRate(rate) {
    if (rate >= 50) return 'win';
    if (rate < 40) return 'loss';
    return 'draw';
  }

  function renderTimeControlStats(tcData, conf) {
    var buckets = ['Bullet', 'Blitz', 'Rapid', 'Classical'];
    var activeBuckets = buckets;
    
    // Filter logic
    var tcFilters = document.getElementById('tc-filters');
    if (tcFilters) {
      var checkboxes = tcFilters.querySelectorAll('input[type="checkbox"]');
      activeBuckets = [];
      for (var j = 0; j < checkboxes.length; j++) {
        if (checkboxes[j].checked) activeBuckets.push(checkboxes[j].value);
        
        // Bind event once
        if (!checkboxes[j].dataset.bound) {
          checkboxes[j].addEventListener('change', function() {
            renderTimeControlStats(tcData, conf);
          });
          checkboxes[j].dataset.bound = 'true';
        }
      }
    }

    var el = document.getElementById('timecontrol-stats'); if (!el) return;

    var labels = [];
    var rates = [];
    var colors = [];
    var wC = LC.win();
    var lC = LC.loss();
    var dC = LC.draw();

    for (var i = 0; i < activeBuckets.length; i++) {
      var b = activeBuckets[i];
      if (tcData[b] && tcData[b].total > 0) {
        labels.push(b);
        rates.push(tcData[b].winRate);
        var cls = getColorClassByRate(tcData[b].winRate);
        colors.push(cls === 'win' ? wC : (cls === 'loss' ? lC : dC));
      }
    }
    
    if (labels.length === 0) {
      el.innerHTML = '<p class="card-disclaimer">No time control data available for the selected filters.</p>';
      return;
    }

    // FEATURE: Chart.js migration
    el.innerHTML = '<div style="position:relative; height:' + Math.max(150, labels.length * 40) + 'px; width:100%;"><canvas id="time-control-chart"></canvas></div>';

    initChart('time-control-chart', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Win Rate (%)',
          data: rates,
          backgroundColor: colors
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { min: 0, max: 100 } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderOpeningStats(openings) {
    var statsEl = document.getElementById('opening-stats');
    if (!statsEl) return;
    if (!openings || openings.length === 0) {
      statsEl.innerHTML = '<p class="card-disclaimer">No opening data available.</p>';
      return;
    }

    var searchInput = document.getElementById('opening-search');
    var filterText = '';
    if (searchInput) {
      filterText = searchInput.value.toLowerCase();
      if (!searchInput.dataset.bound) {
        searchInput.addEventListener('input', function() {
          renderOpeningStats(openings);
        });
        searchInput.dataset.bound = 'true';
      }
    }

    // Filter >= 5 games and search text
    var filteredOpenings = [];
    for (var k = 0; k < openings.length; k++) {
      if (openings[k].total >= 5 && openings[k].name !== 'Unknown') {
        if (!filterText || openings[k].name.toLowerCase().indexOf(filterText) !== -1) {
          filteredOpenings.push(openings[k]);
        }
      }
    }

    if (filteredOpenings.length === 0) {
      statsEl.innerHTML = '<p class="card-disclaimer">No matching openings with &ge; 5 games.</p>';
      return;
    }

    var html = '<div style="overflow-x: auto;"><table class="data-table">';
    html += '<thead><tr><th>Opening</th><th>Games</th><th>Win%</th><th>W/L/D</th><th>Conf.</th></tr></thead><tbody>';

    for (var i = 0; i < filteredOpenings.length; i++) {
      var op = filteredOpenings[i];
      var rowClass = '';
      if (i === 0 && op.winRate >= 50 && op.total >= 5 && !filterText) rowClass = 'row-best';
      else if (i === filteredOpenings.length - 1 && op.winRate < 40 && op.total >= 5 && !filterText) rowClass = 'row-worst';

      html += '<tr class="' + rowClass + '">';
      html += '<td>' + escapeHTML(op.name);
      var barClass = getColorClassByRate(op.winRate);
      html += '<div class="tbl-bar-track"><div class="tbl-bar-fill bar-fill--' + barClass + '" style="width: ' + op.winRate + '%"></div></div>';
      html += '</td>';
      html += '<td>' + op.total + '</td>';
      html += '<td style="font-weight: 600;">' + op.winRate + '%</td>';
      html += '<td>' + op.wins + '/' + op.losses + '/' + op.draws + '</td>';
      html += '<td>' + buildBadge(op.confidence) + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    statsEl.innerHTML = html;
  }

  function buildDonut(data, title) {
    var types = ['checkmate', 'resignation', 'timeout', 'other'];
    var colors = { checkmate: LC.loss(), resignation: LC.draw(), timeout: LC.blue(), other: LC.gray() };
    var total = 0;
    for (var i = 0; i < types.length; i++) total += data[types[i]].count;

    if (total === 0) return '';

    var stops = [];
    var currentPct = 0;
    for (var j = 0; j < types.length; j++) {
      var count = data[types[j]].count;
      if (count > 0) {
        var pct = (count / total) * 100;
        var nextPct = currentPct + pct;
        stops.push(colors[types[j]] + ' ' + currentPct + '% ' + nextPct + '%');
        currentPct = nextPct;
      }
    }

    var html = '<div class="donut-wrapper">';
    html += '<h4 style="font-size: var(--font-sm); margin: 0;">' + title + '</h4>';
    html += '<div class="donut-chart" style="background: conic-gradient(' + stops.join(', ') + ');">';
    html += '<div class="donut-hole">';
    html += '<span class="donut-hole-val">' + total + '</span>';
    html += '<span class="donut-hole-lbl">Total</span>';
    html += '</div></div>';

    html += '<div class="donut-legend">';
    for (var k = 0; k < types.length; k++) {
      var t = types[k];
      if (data[t].count > 0) {
        html += '<div class="legend-item"><div class="legend-swatch" style="background: ' + colors[t] + ';"></div>' + capitalize(t) + ' (' + data[t].pct + '%)</div>';
      }
    }
    html += '</div></div>';
    return html;
  }

  function renderOutcomeStats(out) {
    var el = document.getElementById('outcome-stats'); if (!el) return;
    
    // FEATURE: Chart.js migration
    el.innerHTML = '<div style="position:relative; height:250px; width:100%;"><canvas id="win-outcomes-chart"></canvas></div>';
    
    var data = out.wins;
    var types = ['checkmate', 'resignation', 'timeout', 'other'];
    var colors = { checkmate: LC.loss(), resignation: LC.draw(), timeout: LC.blue(), other: LC.gray() };
    
    var counts = [];
    var bgColors = [];
    var labels = [];
    var total = 0;
    
    types.forEach(function(t) {
      if (data[t].count > 0) {
        counts.push(data[t].count);
        bgColors.push(colors[t]);
        labels.push(capitalize(t));
        total += data[t].count;
      }
    });

    if (total === 0) {
      el.innerHTML = '<p class="card-disclaimer">No data available.</p>';
      return;
    }

    initChart('win-outcomes-chart', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: counts, backgroundColor: bgColors, borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var val = ctx.raw;
                var pct = Math.round((val / total) * 100);
                return ' ' + ctx.label + ': ' + val + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderGameLengthStats(gl) {
    var html = '<div class="bar-chart">';
    var maxVal = Math.max(gl.avgWinMoves, gl.avgLossMoves, 1); // for scaling
    
    // Win moves
    var winPct = Math.round((gl.avgWinMoves / maxVal) * 100);
    html += '<div class="bar-row">';
    html += '<span class="bar-label">Wins</span>';
    html += '<div class="bar-track"><div class="bar-fill bar-fill--win" style="width: ' + winPct + '%;"></div></div>';
    html += '<span class="bar-value" style="flex:0 0 60px;">' + gl.avgWinMoves + ' m</span>';
    html += '</div>';

    // Loss moves
    var lossPct = Math.round((gl.avgLossMoves / maxVal) * 100);
    html += '<div class="bar-row">';
    html += '<span class="bar-label">Losses</span>';
    html += '<div class="bar-track"><div class="bar-fill bar-fill--loss" style="width: ' + lossPct + '%;"></div></div>';
    html += '<span class="bar-value" style="flex:0 0 60px;">' + gl.avgLossMoves + ' m</span>';
    html += '</div>';

    html += '</div>';
    var el = document.getElementById('gamelength-stats'); if (el) el.innerHTML = html;
  }

  function renderGamePhaseStats(gp) {
    var el = document.getElementById('gamephase-stats');
    if (!el) return;
    var colors = {opening:LC.blue(),middlegame:LC.biscuit(),endgame:LC.win()};
    var total = gp.opening.losses + gp.middlegame.losses + gp.endgame.losses;
    if (total === 0) { el.innerHTML = '<p class="card-disclaimer">No loss data available.</p>'; return; }
    
    // FEATURE: Chart.js migration
    el.innerHTML = '<div style="position:relative; height:250px; width:100%;"><canvas id="phase-chart"></canvas></div>';
    
    var labels = [];
    var counts = [];
    var bgColors = [];
    
    ['opening', 'middlegame', 'endgame'].forEach(function(p) {
      if (gp[p].losses > 0) {
        labels.push(capitalize(p));
        counts.push(gp[p].losses);
        bgColors.push(colors[p]);
      }
    });

    initChart('phase-chart', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: counts, backgroundColor: bgColors, borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var val = ctx.raw;
                var pct = Math.round((val / total) * 100);
                return ' ' + ctx.label + ': ' + val + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  // --- Overview Page Renders ---
  function renderOverviewDonut(a) {
    var el = document.getElementById('overview-donut'); if (!el) return;
    var o = a.overall; if (o.totalGames === 0) { el.innerHTML = '<p class="card-disclaimer">No data.</p>'; return; }
    
    // FEATURE: Chart.js migration
    el.innerHTML = '<div style="position:relative; height:250px; width:100%;"><canvas id="win-loss-donut"></canvas></div>';
    
    var wC = LC.win();
    var lC = LC.loss();
    var dC = LC.draw();
    
    initChart('win-loss-donut', {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses', 'Draws'],
        datasets: [{
          data: [o.wins, o.losses, o.draws],
          backgroundColor: [wC, lC, dC],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var val = ctx.raw;
                var pct = Math.round((val / o.totalGames) * 100);
                return ' ' + ctx.label + ': ' + val + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderOverviewTimeline(a) {
    var el = document.getElementById('overview-timeline'); if (!el) return;
    var months = a.gamesByMonth; if (!months || months.length === 0) { el.innerHTML = '<p class="card-disclaimer">No timeline data.</p>'; return; }
    var maxT = 1; months.forEach(function(m){ if(m.total>maxT) maxT=m.total; });
    var html = '<div class="bar-chart">';
    months.forEach(function(m){
      var pct = Math.round((m.total/maxT)*100);
      html += '<div class="bar-row"><span class="bar-label">'+escapeHTML(m.month)+'</span>';
      html += '<div class="bar-track"><div class="bar-fill bar-fill--accent" style="width:'+pct+'%"></div></div>';
      html += '<span class="bar-value">'+m.total+'</span></div>';
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderRecentGames(a) {
    var el = document.getElementById('recent-games-table'); if (!el) return;
    var games = a.recentGames; if (!games || games.length === 0) { el.innerHTML = '<p class="card-disclaimer">No recent games.</p>'; return; }
    var html = '<table class="data-table"><thead><tr><th>Date</th><th>Color</th><th>Opening</th><th>Time Control</th><th class="text-right">Result</th><th class="text-right">End Type</th></tr></thead><tbody>';
    games.forEach(function(g){
      var rc = g.result === 'win' ? 'result-badge--win' : g.result === 'loss' ? 'result-badge--loss' : 'result-badge--draw';
      html += '<tr><td>'+(g.date||'—')+'</td><td>'+(g.playerColor||'—')+'</td><td>'+escapeHTML(g.opening||'—')+'</td><td>'+(g.timeControl||'—')+'</td>';
      html += '<td class="text-right"><span class="result-badge '+rc+'">'+g.result+'</span></td><td class="text-right">'+(g.outcomeType||'—')+'</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  function renderOverviewInsights(ins) {
    var el = document.getElementById('overview-insights'); if (!el) return;
    var items = ins.allInsights; if (!items || items.length === 0) { el.innerHTML = '<p class="card-disclaimer">No insights yet.</p>'; return; }
    var html = '';
    items.slice(0,4).forEach(function(item){
      var t = item.text, icon = '💡', cls = 'insight-card--info';
      if (t.indexOf('best')!==-1||t.indexOf('better')!==-1) { icon='📈'; cls='insight-card--win'; }
      if (t.indexOf('worst')!==-1||t.indexOf('collapse')!==-1) { icon='📉'; cls='insight-card--loss'; }
      html += '<div class="insight-card '+cls+'"><span class="insight-card-icon">'+icon+'</span><div class="insight-card-content"><p class="insight-card-text">'+escapeHTML(t)+'</p></div></div>';
    });
    el.innerHTML = html;
  }

  // --- Color Page Renders ---
  function renderColorBreakdown(c) {
    var el = document.getElementById('color-result-breakdown'); if (!el) return;
    var html = '<div class="bar-chart">';
    ['white','black'].forEach(function(col){
      var d = c[col]; if (d.total === 0) return;
      var wP=Math.round((d.wins/d.total)*100), lP=Math.round((d.losses/d.total)*100), dP=100-wP-lP;
      html += '<div style="margin-bottom:var(--sp-md)"><div style="font-size:var(--font-sm);font-weight:500;margin-bottom:4px">'+capitalize(col)+' ('+d.total+' games)</div>';
      html += '<div class="stacked-bar"><div class="stacked-segment" style="width:'+wP+'%;background:'+LC.win()+'">W '+wP+'%</div>';
      html += '<div class="stacked-segment" style="width:'+lP+'%;background:'+LC.loss()+'">L '+lP+'%</div>';
      html += '<div class="stacked-segment" style="width:'+dP+'%;background:'+LC.draw()+'">D '+dP+'%</div></div></div>';
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderColorTable(c) {
    var el = document.getElementById('color-table'); if (!el) return;
    var html = '<table class="data-table"><thead><tr><th>Color</th><th class="text-right">Games</th><th class="text-right">Wins</th><th class="text-right">Losses</th><th class="text-right">Draws</th><th class="text-right">Win Rate</th></tr></thead><tbody>';
    ['white','black'].forEach(function(col){
      var d = c[col];
      html += '<tr><td>'+capitalize(col)+'</td><td class="text-right">'+d.total+'</td><td class="text-right">'+d.wins+'</td><td class="text-right">'+d.losses+'</td><td class="text-right">'+d.draws+'</td><td class="text-right" style="font-weight:600">'+d.winRate+'%</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  // --- TC Page Renders ---
  function renderTCLossCause(tc) {
    var el = document.getElementById('tc-loss-cause'); if (!el) return;
    var buckets = ['Bullet','Blitz','Rapid','Classical'];
    var html = '<div class="bar-chart">';
    
    // Legend
    html += '<div style="display:flex; gap:12px; margin-bottom:16px; font-size:var(--font-xs); flex-wrap:wrap;">';
    html += '<div style="display:flex; align-items:center;"><span style="width:10px;height:10px;border-radius:2px;background:'+LC.blue()+';margin-right:6px;"></span>Timeout</div>';
    html += '<div style="display:flex; align-items:center;"><span style="width:10px;height:10px;border-radius:2px;background:'+LC.loss()+';margin-right:6px;"></span>Checkmate</div>';
    html += '<div style="display:flex; align-items:center;"><span style="width:10px;height:10px;border-radius:2px;background:'+LC.draw()+';margin-right:6px;"></span>Resignation</div>';
    html += '<div style="display:flex; align-items:center;"><span style="width:10px;height:10px;border-radius:2px;background:'+LC.gray()+';margin-right:6px;"></span>Other</div>';
    html += '</div>';

    buckets.forEach(function(b){
      var d = tc[b]; if (!d || d.total === 0) return;
      var lc = d.lossCauses, tl = lc.checkmate+lc.resignation+lc.timeout+lc.other;
      if (tl === 0) return;
      html += '<div style="margin-bottom:var(--sp-sm)"><div style="font-size:var(--font-sm);font-weight:500;margin-bottom:4px">'+b+'</div>';
      html += '<div class="stacked-bar">';
      var segs = [{l:'Timeout',c:LC.blue(),v:lc.timeout},{l:'Checkmate',c:LC.loss(),v:lc.checkmate},{l:'Resign',c:LC.draw(),v:lc.resignation},{l:'Other',c:LC.gray(),v:lc.other}];
      segs.forEach(function(s){ if(s.v>0){ var p=Math.round((s.v/tl)*100); html+='<div class="stacked-segment" style="width:'+p+'%;background:'+s.c+'" title="'+s.l+': '+s.v+'">'+p+'%</div>'; }});
      html += '</div></div>';
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderTCTable(tc) {
    var el = document.getElementById('tc-table'); if (!el) return;
    var buckets = ['Bullet','Blitz','Rapid','Classical'];
    var html = '<table class="data-table"><thead><tr><th>Time Control</th><th class="text-right">Games</th><th class="text-right">Wins</th><th class="text-right">Losses</th><th class="text-right">Draws</th><th class="text-right">Win Rate</th></tr></thead><tbody>';
    buckets.forEach(function(b){
      var d = tc[b]; if (!d || d.total === 0) return;
      html += '<tr><td>'+b+'</td><td class="text-right">'+d.total+'</td><td class="text-right">'+d.wins+'</td><td class="text-right">'+d.losses+'</td><td class="text-right">'+d.draws+'</td><td class="text-right" style="font-weight:600">'+d.winRate+'%</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  // --- Opening Page Renders ---
  function renderOpeningCharts(qOps) {
    var el1 = document.getElementById('opening-winrate-chart');
    var el2 = document.getElementById('opening-games-chart');
    
    var wC = LC.win();
    var lC = LC.loss();
    var dC = LC.draw();
    var aC = LC.blue();

    if (el1) {
      if (qOps.length === 0) {
        el1.innerHTML = '<p class="card-disclaimer">No openings with ≥ 5 games yet.</p>';
      } else {
        // FEATURE: Chart.js migration
        var labels1 = [];
        var data1 = [];
        var colors1 = [];
        qOps.slice(0, 8).forEach(function(op) {
          labels1.push(op.name);
          data1.push(op.winRate);
          var cls = getColorClassByRate(op.winRate);
          colors1.push(cls === 'win' ? wC : (cls === 'loss' ? lC : dC));
        });
        
        el1.innerHTML = '<div style="position:relative; height:' + Math.max(150, labels1.length * 40) + 'px; width:100%;"><canvas id="winrate-opening-chart"></canvas></div>';
        initChart('winrate-opening-chart', {
          type: 'bar',
          data: {
            labels: labels1,
            datasets: [{ label: 'Win Rate (%)', data: data1, backgroundColor: colors1 }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { min: 0, max: 100 } },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
    
    if (el2) {
      if (qOps.length === 0) {
        el2.innerHTML = '<p class="card-disclaimer">No openings with ≥ 5 games yet.</p>';
      } else {
        // Sort by total games descending for this chart
        var byGames = qOps.slice().sort(function(a,b){ return b.total - a.total; });
        var labels2 = [];
        var data2 = [];
        byGames.slice(0, 8).forEach(function(op) {
          labels2.push(op.name);
          data2.push(op.total);
        });

        // FEATURE: Chart.js migration
        el2.innerHTML = '<div style="position:relative; height:' + Math.max(150, labels2.length * 40) + 'px; width:100%;"><canvas id="games-opening-chart"></canvas></div>';
        initChart('games-opening-chart', {
          type: 'bar',
          data: {
            labels: labels2,
            datasets: [{ label: 'Games Played', data: data2, backgroundColor: aC }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true } },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
  }

  // --- Outcome Page Renders ---
  function renderOutcomeLossDonut(out) {
    var el = document.getElementById('outcome-loss-donut'); if (!el) return;
    
    // FEATURE: Chart.js migration
    el.innerHTML = '<div style="position:relative; height:250px; width:100%;"><canvas id="loss-outcomes-chart"></canvas></div>';
    
    var data = out.losses;
    var types = ['checkmate', 'resignation', 'timeout', 'other'];
    var colors = { checkmate: LC.loss(), resignation: LC.draw(), timeout: LC.blue(), other: LC.gray() };
    
    var counts = [];
    var bgColors = [];
    var labels = [];
    var total = 0;
    
    types.forEach(function(t) {
      if (data[t].count > 0) {
        counts.push(data[t].count);
        bgColors.push(colors[t]);
        labels.push(capitalize(t));
        total += data[t].count;
      }
    });

    if (total === 0) {
      el.innerHTML = '<p class="card-disclaimer">No data available.</p>';
      return;
    }

    initChart('loss-outcomes-chart', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: counts, backgroundColor: bgColors, borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var val = ctx.raw;
                var pct = Math.round((val / total) * 100);
                return ' ' + ctx.label + ': ' + val + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderOutcomeBars(out) {
    var el = document.getElementById('outcome-bars'); if (!el) return;
    var types = ['checkmate','resignation','timeout','other'];
    var html = '<div class="bar-chart">';
    types.forEach(function(t){
      var wc = out.wins[t] ? out.wins[t].count : 0;
      var lc = out.losses[t] ? out.losses[t].count : 0;
      var maxV = Math.max(wc, lc, 1);
      html += '<div style="margin-bottom:var(--sp-sm)"><div style="font-size:var(--font-sm);font-weight:500;margin-bottom:4px">'+capitalize(t)+'</div>';
      html += '<div class="bar-row"><span class="bar-label" style="flex:0 0 40px">W</span><div class="bar-track"><div class="bar-fill bar-fill--win" style="width:'+Math.round((wc/maxV)*100)+'%"></div></div><span class="bar-value">'+wc+'</span></div>';
      html += '<div class="bar-row"><span class="bar-label" style="flex:0 0 40px">L</span><div class="bar-track"><div class="bar-fill bar-fill--loss" style="width:'+Math.round((lc/maxV)*100)+'%"></div></div><span class="bar-value">'+lc+'</span></div></div>';
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderOutcomeTable(out) {
    var el = document.getElementById('outcome-table'); if (!el) return;
    var types = ['checkmate','resignation','timeout','other'];
    var html = '<table class="data-table"><thead><tr><th>Outcome</th><th class="text-right">Wins</th><th class="text-right">Win%</th><th class="text-right">Losses</th><th class="text-right">Loss%</th></tr></thead><tbody>';
    types.forEach(function(t){
      var w=out.wins[t],l=out.losses[t];
      html += '<tr><td>'+capitalize(t)+'</td><td>'+(w?w.count:0)+'</td><td>'+(w?w.pct:0)+'%</td><td>'+(l?l.count:0)+'</td><td>'+(l?l.pct:0)+'%</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  // --- Game Length Page Renders ---
  function renderGLDistribution(gl) {
    var el = document.getElementById('gl-distribution'); if (!el) return;
    if (!gl.buckets || gl.buckets.length === 0) { el.innerHTML = '<p class="card-disclaimer">No data.</p>'; return; }
    var maxT = 1; gl.buckets.forEach(function(b){if(b.total>maxT)maxT=b.total;});
    var html = '<div class="bar-chart">';
    gl.buckets.forEach(function(b){
      if (b.total === 0) return;
      var pct = Math.round((b.total/maxT)*100);
      html += buildBarRow(b.label+' moves', pct, b.total, 'accent', null, ' ('+b.total+')');
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderGLTable(gl) {
    var el = document.getElementById('gl-table'); if (!el) return;
    if (!gl.buckets) return;
    var html = '<table class="data-table"><thead><tr><th>Length Bucket</th><th class="text-right">Wins</th><th class="text-right">Losses</th><th class="text-right">Draws</th><th class="text-right">Total</th><th class="text-right">Win Rate</th></tr></thead><tbody>';
    gl.buckets.forEach(function(b){
      if (b.total === 0) return;
      html += '<tr><td>'+b.label+' moves</td><td>'+b.wins+'</td><td>'+b.losses+'</td><td>'+b.draws+'</td><td>'+b.total+'</td><td style="font-weight:600">'+b.winRate+'%</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  // --- Game Phase Page Renders ---
  function renderGPWinLoss(gp) {
    var el = document.getElementById('gp-winloss-chart'); if (!el) return;
    var phases = ['opening','middlegame','endgame'];
    var html = '<div class="bar-chart">';
    phases.forEach(function(p){
      var d = gp[p]; if (d.count === 0) return;
      var maxV = Math.max(d.wins, d.losses, 1);
      html += '<div style="margin-bottom:var(--sp-sm)"><div style="font-size:var(--font-sm);font-weight:500;margin-bottom:4px">'+capitalize(p)+'</div>';
      html += '<div class="bar-row"><span class="bar-label" style="flex:0 0 50px">Wins</span><div class="bar-track"><div class="bar-fill bar-fill--win" style="width:'+Math.round((d.wins/maxV)*100)+'%"></div></div><span class="bar-value">'+d.wins+'</span></div>';
      html += '<div class="bar-row"><span class="bar-label" style="flex:0 0 50px">Losses</span><div class="bar-track"><div class="bar-fill bar-fill--loss" style="width:'+Math.round((d.losses/maxV)*100)+'%"></div></div><span class="bar-value">'+d.losses+'</span></div></div>';
    });
    html += '</div>'; el.innerHTML = html;
  }

  function renderGPTable(gp) {
    var el = document.getElementById('gp-table'); if (!el) return;
    var phases = ['opening','middlegame','endgame'];
    var html = '<table class="data-table"><thead><tr><th>Phase</th><th class="text-right">Games</th><th class="text-right">Wins</th><th class="text-right">Losses</th><th class="text-right">Win Rate</th></tr></thead><tbody>';
    phases.forEach(function(p){
      var d = gp[p];
      html += '<tr><td>'+capitalize(p)+'</td><td>'+d.count+'</td><td>'+d.wins+'</td><td>'+d.losses+'</td><td style="font-weight:600">'+d.winRate+'%</td></tr>';
    });
    html += '</tbody></table>'; el.innerHTML = html;
  }

  // --- Insights Page ---
  function renderKeyInsights(insightsSet) {
    var el = document.getElementById('insights-list'); if (!el) return;
    var items = insightsSet.allInsights;
    if (!items || items.length === 0) { el.innerHTML = '<p class="card-disclaimer">No insights available.</p>'; return; }
    var html = '';
    items.forEach(function(item){
      var t = item.text, icon = '💡', cls = 'insight-card--info';
      if (t.indexOf('best')!==-1||t.indexOf('better')!==-1) { icon='📈'; cls='insight-card--win'; }
      if (t.indexOf('worst')!==-1||t.indexOf('collapse')!==-1||t.indexOf('struggle')!==-1) { icon='📉'; cls='insight-card--loss'; }
      if (t.indexOf('insufficient')!==-1||t.indexOf('limited')!==-1) { icon='⚠️'; cls='insight-card--warn'; }
      html += '<div class="insight-card '+cls+'"><span class="insight-card-icon">'+icon+'</span><div class="insight-card-content"><p class="insight-card-text">'+escapeHTML(t)+'</p></div></div>';
    });
    // Recommendations
    if (insightsSet.recommendations && insightsSet.recommendations.length > 0) {
      html += '<div style="margin-top:var(--sp-lg)"><div style="font-size:var(--font-lg);font-weight:600;margin-bottom:var(--sp-md)">Recommendations</div>';
      html += '<table class="data-table"><thead><tr><th>Issue</th><th>Evidence</th><th>Focus</th></tr></thead><tbody>';
      insightsSet.recommendations.forEach(function(r){ html += '<tr><td>'+escapeHTML(r.issue)+'</td><td>'+escapeHTML(r.evidence)+'</td><td>'+escapeHTML(r.focus)+'</td></tr>'; });
      html += '</tbody></table></div>';
    }
    el.innerHTML = html;

    // Combined Insights
    var cel = document.getElementById('combined-insights-list');
    if (cel) {
       var combined = insightsSet.combined;
       if (!combined || combined.length === 0) {
           cel.innerHTML = '<p class="card-disclaimer">Not enough cross-category correlation data yet. Play more games in different time controls.</p>';
       } else {
           var ch = '';
           combined.forEach(function(t) {
              var icon = '🔥', cls = 'insight-card--accent';
              if (t.indexOf('issue') !== -1 || t.indexOf('struggle') !== -1) { icon = '⚠️'; cls = 'insight-card--warn'; }
              ch += '<div class="insight-card '+cls+'"><span class="insight-card-icon">'+icon+'</span><div class="insight-card-content"><p class="insight-card-text">'+escapeHTML(t)+'</p></div></div>';
           });
           cel.innerHTML = ch;
       }
    }
  }

  // --- Helper Renders ---

  function renderInsightBox(el, text) {
    if (!el) return;
    if (text) {
      el.textContent = text;
      el.style.display = 'block';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  function buildBarRow(label, fillPct, gamesCount, colorClass, confLevel, suffix) {
    var s = (suffix !== undefined && suffix !== null) ? suffix : '%';
    var badgeHtml = confLevel ? '<span style="margin-left: 8px;">' + buildBadge(confLevel) + '</span>' : '';
    var labelHtml = '<span class="bar-label">' + escapeHTML(label) + badgeHtml + '</span>';
    
    var html = '<div class="bar-row">';
    html += labelHtml;
    html += '<div class="bar-track"><div class="bar-fill bar-fill--' + colorClass + '" style="width: ' + Math.min(fillPct, 100) + '%;"></div></div>';
    html += '<span class="bar-value" title="' + gamesCount + ' games">' + fillPct + s + '</span>';
    html += '</div>';
    return html;
  }

  function buildBadge(conf) {
    if (conf === 'high') return '<span class="badge badge--high" title="High Confidence (≥30 games)">High</span>';
    if (conf === 'medium') return '<span class="badge badge--medium" title="Limited Sample (10-29 games)">Med</span>';
    return '<span class="badge badge--low" title="Insufficient Data (<10 games)">Low</span>';
  }

  function updateSidebarStats(count, lastUpdated) {
    if (els.sidebarGameCount) els.sidebarGameCount.textContent = count;
    if (els.sidebarLastUpdated) els.sidebarLastUpdated.textContent = lastUpdated;
  }

  function setUsernameInput(name) {
    if (els.usernameInput) els.usernameInput.value = name || '';
  }

  function getUsernameInput() {
    return els.usernameInput ? els.usernameInput.value.trim() : '';
  }

  function highlightUsernameInput() {
    if (els.usernameInput) {
      els.usernameInput.focus();
      var originalBorder = els.usernameInput.style.borderColor;
      var originalShadow = els.usernameInput.style.boxShadow;
      var originalPlaceholder = els.usernameInput.placeholder;
      
      els.usernameInput.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      els.usernameInput.style.borderColor = 'var(--color-loss, #ef4444)';
      els.usernameInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
      els.usernameInput.placeholder = 'Username required!';
      
      setTimeout(function() {
        els.usernameInput.style.borderColor = originalBorder;
        els.usernameInput.style.boxShadow = originalShadow;
        els.usernameInput.placeholder = originalPlaceholder;
      }, 3000);
    }
  }

  function getPgnInput() {
    return els.pgnInput ? els.pgnInput.value : '';
  }

  // --- Trends Page Renders ---
  function renderTrendsDashboard(gbm, a, iSet) {
    if (!gbm || gbm.length === 0) return;
    
    var lastMonth = gbm[gbm.length - 1];
    var firstMonth = gbm[0];
    var diffWr = gbm.length > 1 ? Math.round((lastMonth.winRate - firstMonth.winRate) * 10) / 10 : 0;
    var wrTrendText = diffWr > 0 ? '+' + diffWr + '%' : diffWr + '%';
    var wrTrendIcon = diffWr > 0 ? '📈' : (diffWr < 0 ? '📉' : '➖');
    var wrTrendClass = diffWr > 0 ? 'val-win' : (diffWr < 0 ? 'val-loss' : 'val-draw');

    var gamesCount = 0;
    gbm.forEach(function(m) { gamesCount += m.total; });

    var diffElo = (lastMonth.avgElo && firstMonth.avgElo) ? (lastMonth.avgElo - firstMonth.avgElo) : null;
    var eloTrendText = diffElo !== null ? (diffElo > 0 ? '+' + diffElo : diffElo) : 'N/A';
    var eloTrendClass = diffElo > 0 ? 'val-win' : (diffElo < 0 ? 'val-loss' : 'val-draw');

    var bestStreak = a.streaks ? a.streaks.longestWinStreak.length : 0;
    var currStreak = a.streaks ? a.streaks.currentWinStreak.length : 0;

    var longestImprov = 0;
    var currImprov = 0;
    gbm.forEach(function(m) {
      if (m.winRate >= 50) { currImprov++; if (currImprov > longestImprov) longestImprov = currImprov; }
      else currImprov = 0;
    });

    var formatPeriodText = gbm.length === 1 ? 'this month' : 'over ' + gbm.length + ' months';

    // SECTION 1: Top Summary Cards
    txt('val-trend-winrate', wrTrendText);
    document.getElementById('val-trend-winrate').className = 'stat-card-value ' + wrTrendClass;
    txt('val-trend-winrate-sub', wrTrendIcon + ' ' + formatPeriodText);
    
    txt('val-trend-games', gamesCount);
    txt('val-trend-games-sub', formatPeriodText);

    txt('val-trend-rating', eloTrendText);
    if (diffElo !== null) document.getElementById('val-trend-rating').className = 'stat-card-value ' + eloTrendClass;
    txt('val-trend-rating-sub', diffElo !== null ? formatPeriodText : 'upload games with Elo');

    txt('val-trend-streak', bestStreak);
    txt('val-trend-streak-sub', 'Current: ' + currStreak);

    txt('val-trend-improvement', longestImprov + (longestImprov===1?' month':' months'));
    txt('val-trend-improvement-sub', 'above 50% win rate');

    // SECTION 2: Charts
    var labels = gbm.map(function(m) { return m.month; });
    var wC = LC.win();
    var lC = LC.loss();
    var dC = LC.draw();
    var aC = LC.blue();
    var style = getComputedStyle(document.documentElement);
    var wBg = style.getPropertyValue('--color-win-soft').trim() || 'rgba(76, 175, 80, 0.1)';

    initChart('trend-winrate-chart', {
      type: 'line',
      data: { labels: labels, datasets: [{ label: 'Win Rate (%)', data: gbm.map(function(m){return m.winRate;}), borderColor: wC, backgroundColor: wBg, fill: true, tension: 0.1 }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: { right: 20 } }, scales: { y: { min: 0, max: 100 }, x: { ticks: { maxRotation: 45, minRotation: 45 } } } }
    });

    var hasElo = gbm.some(function(m){ return m.avgElo !== null; });
    var ratingContainer = document.getElementById('trend-rating-container');
    if (!hasElo) {
      if (ratingContainer) ratingContainer.innerHTML = '<p class="card-disclaimer" style="margin-top: 100px;">No rating data available.</p>';
    } else {
      if (ratingContainer && ratingContainer.innerHTML.indexOf('canvas') === -1) {
         ratingContainer.innerHTML = '<canvas id="trend-rating-chart"></canvas>';
      }
      initChart('trend-rating-chart', {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Avg Rating', data: gbm.map(function(m){return m.avgElo;}), borderColor: aC, backgroundColor: aC, tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, spanGaps: true }
      });
    }

    initChart('trend-games-chart', {
      type: 'line',
      data: { labels: labels, datasets: [{ label: 'Games Played', data: gbm.map(function(m){return m.total;}), borderColor: LC.biscuit(), backgroundColor: LC.biscuit(), tension: 0.1 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    initChart('trend-breakdown-chart', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Wins', data: gbm.map(function(m){return m.wins;}), backgroundColor: wC },
          { label: 'Losses', data: gbm.map(function(m){return m.losses;}), backgroundColor: lC },
          { label: 'Draws', data: gbm.map(function(m){return m.draws;}), backgroundColor: dC }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    var tcKeys = ['Bullet', 'Blitz', 'Rapid', 'Classical'];
    var tcColors = [wC, lC, aC, dC];
    var tcDatasets = [];
    tcKeys.forEach(function(tc, idx) {
      var data = gbm.map(function(m) {
        if (m.tc && m.tc[tc] && m.tc[tc].total > 0) return Math.round((m.tc[tc].wins / m.tc[tc].total)*1000)/10;
        return null;
      });
      if (data.some(function(d){ return d !== null; })) {
        tcDatasets.push({ label: tc, data: data, borderColor: tcColors[idx], backgroundColor: tcColors[idx], spanGaps: true, tension: 0.1 });
      }
    });

    if (tcDatasets.length > 0) {
      initChart('trend-tc-chart', {
        type: 'line',
        data: { labels: labels, datasets: tcDatasets },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });
    } else {
      var tcContainer = document.getElementById('trend-tc-chart');
      if (tcContainer && tcContainer.parentNode) tcContainer.parentNode.innerHTML = '<p class="card-disclaimer" style="margin-top: 100px;">No Time Control data available.</p>';
    }

    // SECTION 3: Insights
    var insightsHtml = '';
    insightsHtml += '<div class="insight-card ' + (diffWr > 0 ? 'insight-card--win' : (diffWr < 0 ? 'insight-card--loss' : '')) + '"><span class="insight-card-icon">📈</span><div class="insight-card-content"><p class="insight-card-title">Win Rate Change</p><p class="insight-card-text">Your win rate ' + (diffWr > 0 ? 'improved' : (diffWr < 0 ? 'dropped' : 'stayed flat')) + ' by ' + Math.abs(diffWr) + '% ' + formatPeriodText + '.</p></div></div>';
    
    var activeDay = null, maxDay = 0;
    if (a.dayOfWeek) {
      Object.keys(a.dayOfWeek).forEach(function(d) {
        if (a.dayOfWeek[d].total > maxDay) { maxDay = a.dayOfWeek[d].total; activeDay = d; }
      });
    }
    if (activeDay) {
      insightsHtml += '<div class="insight-card insight-card--info"><span class="insight-card-icon">📅</span><div class="insight-card-content"><p class="insight-card-title">Most Active Day</p><p class="insight-card-text">You play most games on ' + activeDay + ' (' + maxDay + ' games total).</p></div></div>';
    }
    
    if (currStreak > 3) {
      insightsHtml += '<div class="insight-card insight-card--win"><span class="insight-card-icon">🔥</span><div class="insight-card-content"><p class="insight-card-title">Winning Momentum</p><p class="insight-card-text">You are currently on a ' + currStreak + '-game win streak.</p></div></div>';
    } else if (bestStreak > 0) {
      insightsHtml += '<div class="insight-card insight-card--info"><span class="insight-card-icon">🔥</span><div class="insight-card-content"><p class="insight-card-title">Best Win Streak</p><p class="insight-card-text">Your best streak is ' + bestStreak + ' wins.</p></div></div>';
    }
    document.getElementById('trend-insights-list').innerHTML = insightsHtml;

    // SECTION 4: Table
    var tableHtml = '<table class="data-table"><thead><tr><th>Month</th><th class="text-right">Games</th><th class="text-right">Wins</th><th class="text-right">Losses</th><th class="text-right">Draws</th><th class="text-right">Win Rate</th><th>Avg Rating</th></tr></thead><tbody>';
    var revGbm = gbm.slice().reverse();
    var bestMonth = null, maxWr = -1;
    revGbm.forEach(function(m) { if (m.winRate > maxWr && m.total >= 5) { maxWr = m.winRate; bestMonth = m.month; } });
    
    revGbm.forEach(function(m) {
      var rowCls = (m.month === bestMonth) ? 'row-best' : '';
      tableHtml += '<tr class="' + rowCls + '"><td>' + m.month + '</td><td>' + m.total + '</td><td>' + m.wins + '</td><td>' + m.losses + '</td><td>' + m.draws + '</td><td style="font-weight:600">' + m.winRate + '%</td><td>' + (m.avgElo || 'N/A') + '</td></tr>';
    });
    tableHtml += '</tbody></table>';
    document.getElementById('trend-monthly-table').innerHTML = tableHtml;
  }

  // --- Utils ---

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // --- Streaks Page --- FEATURE: Streaks page
  function renderStreaksDashboard(streaks, analysis) {
    if (!streaks) return;
    var s = streaks;

    // Helper: format date for display
    function fmtDate(d) {
      if (!d || d === 'Unknown') return '—';
      return d.replace(/\./g, '-');
    }

    // SECTION 2: Summary Cards
    txt('val-streak-lw', s.longestWinStreak.length);
    txt('val-streak-lw-sub', s.longestWinStreak.length > 0 ? fmtDate(s.longestWinStreak.startDate) + ' — ' + fmtDate(s.longestWinStreak.endDate) : 'No win streaks');
    txt('val-streak-cw', s.currentWinStreak.length);
    txt('val-streak-cw-sub', s.currentWinStreak.length > 0 ? s.currentWinStreak.lastGames : 'Lost last game');
    txt('val-streak-ll', s.longestLossStreak.length);
    txt('val-streak-ll-sub', s.longestLossStreak.length > 0 ? fmtDate(s.longestLossStreak.startDate) + ' — ' + fmtDate(s.longestLossStreak.endDate) : 'No loss streaks');
    txt('val-streak-cl', s.currentLossStreak.length);
    txt('val-streak-cl-sub', s.currentLossStreak.length > 0 ? s.currentLossStreak.lastGames : 'Won last game');
    txt('val-streak-tw', s.totalWinStreaks.count);
    txt('val-streak-tw-sub', 'Avg length: ' + s.totalWinStreaks.avgLength + ' games');
    txt('val-streak-tl', s.totalLossStreaks.count);
    txt('val-streak-tl-sub', 'Avg length: ' + s.totalLossStreaks.avgLength + ' games');

    // SECTION 3: Charts
    var wC = LC.win(), lC = LC.loss();

    // Chart 1: Streaks Over Time (bar with positive/negative)
    if (s.streaksOverTime && s.streaksOverTime.length > 0) {
      var otLabels = s.streaksOverTime.map(function(p) { return p.period; });
      var otWins = s.streaksOverTime.map(function(p) { return p.winMax; });
      var otLosses = s.streaksOverTime.map(function(p) { return -p.lossMax; });

      initChart('streak-timeline-chart', {
        type: 'bar',
        data: {
          labels: otLabels,
          datasets: [
            { label: 'Win Streak', data: otWins, backgroundColor: wC, borderRadius: 3 },
            { label: 'Loss Streak', data: otLosses, backgroundColor: lC, borderRadius: 3 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { tooltip: { callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + Math.abs(ctx.raw) + ' games'; }
          }}},
          scales: {
            x: { grid: { display: false } },
            y: { title: { display: true, text: 'Streak Length' }, ticks: { callback: function(v) { return Math.abs(v); } } }
          }
        }
      });
    }

    // Chart 2: Streak Length Distribution
    var dist = s.streakLengthDistribution;
    if (dist) {
      var distLabels = ['1', '2', '3', '4', '5', '6', '7+'];
      var distWins = distLabels.map(function(k) { return dist[k] ? dist[k].wins : 0; });
      var distLosses = distLabels.map(function(k) { return dist[k] ? dist[k].losses : 0; });

      initChart('streak-dist-chart', {
        type: 'bar',
        data: {
          labels: distLabels,
          datasets: [
            { label: 'Win Streaks', data: distWins, backgroundColor: wC, borderRadius: 3 },
            { label: 'Loss Streaks', data: distLosses, backgroundColor: lC, borderRadius: 3 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: {
            x: { title: { display: true, text: 'Streak Length (Games)' }, ticks: { display: true, autoSkip: false } },
            y: { title: { display: true, text: 'Number of Streaks' }, beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }

    // SECTION 4: Tables
    // Table 1: Streaks by Time Control
    var tcEl = document.getElementById('streak-tc-table');
    if (tcEl) {
      var tcKeys = ['Bullet', 'Blitz', 'Rapid', 'Classical'];
      var tcHtml = '<table class="data-table"><thead><tr><th>Time Control</th><th class="text-right">Longest Win</th><th class="text-right">Longest Loss</th><th class="text-right">Current</th></tr></thead><tbody>';
      var tcFound = false;
      tcKeys.forEach(function(tc) {
        var d = s.streaksByTimeControl[tc];
        if (d) {
          tcFound = true;
          var curBadge = '';
          if (d.currentStreak) {
            var isW = d.currentStreak.charAt(0) === 'W';
            curBadge = '<span class="result-badge result-badge--' + (isW ? 'win' : 'loss') + '">' + d.currentStreak + '</span>';
          } else {
            curBadge = '—';
          }
          tcHtml += '<tr><td>' + tc + '</td><td class="val-win" style="font-weight:600">' + d.longestWin + '</td><td class="val-loss" style="font-weight:600">' + d.longestLoss + '</td><td>' + curBadge + '</td></tr>';
        }
      });
      if (!tcFound) tcHtml += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No time control data</td></tr>';
      tcHtml += '</tbody></table>';
      tcEl.innerHTML = tcHtml;
    }

    // Table 2: Streaks by Color
    var colEl = document.getElementById('streak-color-table');
    if (colEl) {
      var colHtml = '<table class="data-table"><thead><tr><th>Color</th><th class="text-right">Longest Win</th><th class="text-right">Longest Loss</th><th class="text-right">Current</th></tr></thead><tbody>';
      ['white', 'black'].forEach(function(c) {
        var d = s.streaksByColor[c];
        colHtml += '<tr><td>' + capitalize(c) + '</td><td class="val-win" style="font-weight:600">' + d.longestWin + '</td><td class="val-loss" style="font-weight:600">' + d.longestLoss + '</td><td>' + (d.currentStreak || '—') + '</td></tr>';
      });
      colHtml += '</tbody></table>';
      colEl.innerHTML = colHtml;
    }

    // SECTION 5: Recent Streak History
    var histEl = document.getElementById('streak-history-table');
    if (histEl) {
      var hist = s.streakHistory.slice(0, 20);
      if (hist.length === 0) {
        histEl.innerHTML = '<p class="card-disclaimer">No streak data to display.</p>';
      } else {
        var hHtml = '<table class="data-table"><thead><tr><th>Type</th><th>Length</th><th>Start Date</th><th>End Date</th><th>Results</th></tr></thead><tbody>';
        hist.forEach(function(h) {
          var badge = '<span class="result-badge result-badge--' + (h.type === 'win' ? 'win' : 'loss') + '">' + capitalize(h.type) + '</span>';
          var resultStr = h.results.map(function(r) {
            return '<span class="result-badge result-badge--' + (r === 'W' ? 'win' : 'loss') + '" style="padding:1px 5px;margin:1px">' + r + '</span>';
          }).join(' ');
          hHtml += '<tr><td>' + badge + '</td><td style="font-weight:600">' + h.length + '</td><td>' + fmtDate(h.startDate) + '</td><td>' + fmtDate(h.endDate) + '</td><td>' + resultStr + '</td></tr>';
        });
        hHtml += '</tbody></table>';
        histEl.innerHTML = hHtml;
      }
    }

    // SECTION 6: Insight Cards
    var insEl = document.getElementById('streak-insights-list');
    if (insEl) {
      var iHtml = '';

      // Card 1: Current Momentum
      if (s.currentWinStreak.length > 0) {
        iHtml += buildInsightCard('🔥', 'Current Momentum', 'You are currently on a ' + s.currentWinStreak.length + '-game winning streak. Keep it up!', 'win');
      } else if (s.currentLossStreak.length > 0) {
        iHtml += buildInsightCard('⚠️', 'Current Momentum', 'You are currently on a ' + s.currentLossStreak.length + '-game losing streak. Consider taking a break.', 'loss');
      } else {
        iHtml += buildInsightCard('➖', 'Current Momentum', 'No active streak. Your last game was a draw or the start of a new session.', 'info');
      }

      // Card 2: Best Period
      if (s.longestWinStreak.length > 0) {
        var bestMonth = s.longestWinStreak.startDate ? s.longestWinStreak.startDate.substring(0, 7) : 'unknown';
        iHtml += buildInsightCard('🏆', 'Best Period', 'Your longest winning streak of ' + s.longestWinStreak.length + ' games happened in ' + bestMonth + '. Great month!', 'win');
      }

      // Card 3: Tilt Warning
      if (s.longestLossStreak.length > 0) {
        var worstMonth = s.longestLossStreak.startDate ? s.longestLossStreak.startDate.substring(0, 7) : 'unknown';
        iHtml += buildInsightCard('⚠️', 'Tilt Warning', 'Your longest loss streak of ' + s.longestLossStreak.length + ' games happened in ' + worstMonth + '. Try to stay consistent.', 'warn');
      }

      // Card 4: Average Comparison
      var avgW = s.totalWinStreaks.avgLength;
      var avgL = s.totalLossStreaks.avgLength;
      var cmp = avgW > avgL ? 'longer' : (avgW < avgL ? 'shorter' : 'equal to');
      iHtml += buildInsightCard('📊', 'Average Streak Comparison', 'You average ' + avgW + ' games in win streaks and ' + avgL + ' in loss streaks.', avgW >= avgL ? 'win' : 'loss');

      // Card 5: Format Momentum
      var bestTC = null, bestTCLen = 0;
      for (var tc in s.streaksByTimeControl) {
        if (tc === 'Unknown') continue;
        if (s.streaksByTimeControl[tc].longestWin > bestTCLen) {
          bestTCLen = s.streaksByTimeControl[tc].longestWin;
          bestTC = tc;
        }
      }
      if (bestTC) {
        iHtml += buildInsightCard('⭐', 'Format Momentum', 'Your longest win streaks tend to occur in ' + bestTC + ' (' + bestTCLen + ' games). You perform well in momentum.', 'info');
      }

      insEl.innerHTML = iHtml;
    }
  }

  function buildInsightCard(icon, title, text, type) {
    var cls = 'insight-card--info';
    if (type === 'win') cls = 'insight-card--win';
    else if (type === 'loss') cls = 'insight-card--loss';
    else if (type === 'warn') cls = 'insight-card--warn';
    return '<div class="insight-card ' + cls + '"><span class="insight-card-icon">' + icon + '</span><div class="insight-card-content"><p class="insight-card-title">' + escapeHTML(title) + '</p><p class="insight-card-text">' + escapeHTML(text) + '</p></div></div>';
  }

  // --- Public API ---
  return {
    els: els,
    applyTheme: applyTheme,
    showEmptyState: showEmptyState,
    showDashboard: showDashboard,
    renderDashboard: renderDashboard,
    showPgnModal: showPgnModal,
    hidePgnModal: hidePgnModal,
    showConfirmModal: showConfirmModal,
    hideConfirmModal: hideConfirmModal,
    showAlertModal: showAlertModal,
    showProcessingFeedback: showProcessingFeedback,
    hideProcessingFeedback: hideProcessingFeedback,
    showParseWarnings: showParseWarnings,
    hideParseWarnings: hideParseWarnings,
    updateSidebarStats: updateSidebarStats,
    setUsernameInput: setUsernameInput,
    getUsernameInput: getUsernameInput,
    highlightUsernameInput: highlightUsernameInput,
    getPgnInput: getPgnInput,
    getConfirmCallback: function() { return currentConfirmCallback; },
    renderTrendsDashboard: renderTrendsDashboard,
    renderStreaksDashboard: renderStreaksDashboard
  };
})();