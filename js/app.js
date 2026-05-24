/**
 * app.js — Application orchestrator
 *
 * Wires all modules together. Handles event listeners and data flow.
 * Data flows: Storage -> UI, Parser -> Extractor -> Analyzer -> Insights -> UI
 */

(function () {

  // --- Initialization ---

  function init() {
    // 1. Restore Theme
    var theme = Storage.getTheme();
    UI.applyTheme(theme);
    
    // Set initial toggle state if it's light mode (since dark is default)
    if (theme === 'light') {
      if (UI.els.themeToggle) UI.els.themeToggle.classList.add('is-light');
      if (UI.els.mobileThemeBtn) UI.els.mobileThemeBtn.classList.add('is-light');
    }

    // 2. Restore Username
    UI.setUsernameInput(Storage.getUsername());

    // 3. Load games and render
    var count = Storage.getGameCount();
    UI.updateSidebarStats(count, Storage.getLastUpdated());

    // Restore persisted filters before first render
    restoreFilters();

    if (count === 0) {
      UI.showEmptyState();
    } else {
      processAndRender(Storage.loadGames());
    }

    // 4. Bind Events
    bindEvents();
  }

  // --- Data Flow Pipeline ---

  var currentAnalysis = null;
  var currentInsights = null;

  // --- Filter Persistence ---
  var FILTER_KEY = 'lca_filters';

  function saveFilters() {
    var state = {
      tc:    (document.getElementById('page-filter-tc')    || {}).value || 'all',
      date:  (document.getElementById('page-filter-date')  || {}).value || 'all',
      color: (document.getElementById('page-filter-color') || {}).value || 'all'
    };
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function restoreFilters() {
    var raw;
    try { raw = localStorage.getItem(FILTER_KEY); } catch(e) {}
    if (!raw) return;
    var state;
    try { state = JSON.parse(raw); } catch(e) { return; }
    ['tc','date','color'].forEach(function(k) {
      var el = document.getElementById('page-filter-' + k);
      if (el && state[k]) el.value = state[k];
    });
  }

  function clearFilters() {
    try { localStorage.removeItem(FILTER_KEY); } catch(e) {}
    ['page-filter-tc','page-filter-date','page-filter-color'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = 'all';
    });
  }

  function renderActiveFilterChips() {
    var bar = document.getElementById('active-filter-bar');
    if (!bar) return;
    var tc    = (document.getElementById('page-filter-tc')    || {}).value || 'all';
    var date  = (document.getElementById('page-filter-date')  || {}).value || 'all';
    var color = (document.getElementById('page-filter-color') || {}).value || 'all';

    var dateLabels = {'7':'Last 7 days','30':'Last 30 days','90':'Last 90 days','365':'Last year'};
    var chips = [];
    if (tc    !== 'all') chips.push({ label: tc,                 key: 'tc'    });
    if (date  !== 'all') chips.push({ label: dateLabels[date] || date + 'd', key: 'date'  });
    if (color !== 'all') chips.push({ label: color.charAt(0).toUpperCase() + color.slice(1), key: 'color' });

    if (chips.length === 0) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    var html = '<span class="afb-label">Active filters:</span>';
    chips.forEach(function(c) {
      html += '<span class="afb-chip">' + c.label +
              ' <button class="afb-chip-x" data-key="' + c.key + '" aria-label="Remove filter">&times;</button></span>';
    });
    html += '<button class="afb-clear" id="afb-clear-all">Clear all</button>';
    bar.innerHTML = html;

    // Bind chip remove buttons
    bar.querySelectorAll('.afb-chip-x').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var el = document.getElementById('page-filter-' + btn.dataset.key);
        if (el) { el.value = 'all'; saveFilters(); applyFiltersAndRender(); }
      });
    });
    var clearAll = document.getElementById('afb-clear-all');
    if (clearAll) {
      clearAll.addEventListener('click', function() {
        clearFilters();
        applyFiltersAndRender();
      });
    }
  }

  function applyFiltersAndRender() {
    var allGames = Storage.loadGames();
    
    var isDemo = Storage.getIsDemo();
    var existingAlert = document.getElementById('demo-mode-alert');
    if (isDemo && allGames && allGames.length > 0) {
       if (!existingAlert) {
           var alertHtml = '<div id="demo-mode-alert" style="background: var(--card-bg); border: 1px dashed var(--color-primary); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: var(--sp-lg); display: flex; justify-content: space-between; align-items: center;"><span style="font-size: var(--font-sm);"><strong style="color: var(--color-primary);">Demo Mode Active</strong> — Exploring sample data.</span><button class="btn" style="background: var(--color-loss); color: #fff; padding: 6px 12px; font-size: var(--font-xs);" onclick="document.getElementById(\'clear-btn\').click()">Clear Demo Data</button></div>';
           var pageHeader = document.querySelector('.page-header');
           if (pageHeader) pageHeader.insertAdjacentHTML('beforebegin', alertHtml);
       }
    } else if (existingAlert) {
       existingAlert.remove();
    }

    if (!allGames || allGames.length === 0) {
      UI.showEmptyState();
      return;
    }

    // Bind filters once — persist on change
    ['page-filter-tc', 'page-filter-date', 'page-filter-color'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.addEventListener('change', function() {
          saveFilters();
          applyFiltersAndRender();
        });
        el.dataset.bound = 'true';
      }
    });

    // Show active filter chips after binding
    renderActiveFilterChips();

    var isStreaks = document.getElementById('val-streak-lw');
    var isTrends = document.getElementById('trend-winrate-chart');

    if (isStreaks || isTrends) {
      // Always analyze ALL games first so currentAnalysis is populated
      // before streaks/trends pages try to read it.
      if (!currentAnalysis) {
        currentAnalysis = Analyzer.analyze(allGames);
        currentInsights = Insights.generateInsights(currentAnalysis);
      }
      if (isStreaks && typeof renderStreaksPage === 'function') { renderStreaksPage(); return; }
      if (isTrends  && typeof renderTrendsPage  === 'function') { renderTrendsPage();  return; }
    }

    // General dashboard
    var tcFilter = (document.getElementById('page-filter-tc') || {}).value || 'all';
    var dateFilter = (document.getElementById('page-filter-date') || {}).value || 'all';
    var colorFilter = (document.getElementById('page-filter-color') || {}).value || 'all';

    var filtered = allGames.filter(function(g) {
      if (tcFilter !== 'all' && g.timeControl !== tcFilter) return false;
      if (colorFilter !== 'all' && g.playerColor !== colorFilter) return false;
      if (dateFilter !== 'all') {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateFilter));
        var gDate = g.date ? new Date(g.date.replace(/\./g, '-')) : null;
        if (!gDate || isNaN(gDate) || gDate < cutoff) return false;
      }
      return true;
    });

    if (filtered.length < 1) {
      UI.showEmptyState();
      var emptyEl = document.getElementById('empty-state');
      if (emptyEl) {
        emptyEl.innerHTML = '<div class="empty-state-content"><span class="empty-state-icon">📊</span><h2 class="empty-state-title">No Data Matching Filters</h2><p class="empty-state-text">Adjust your filters to see analysis.</p><button class="btn sidebar-btn sidebar-btn--primary" id="reset-filters-btn" style="margin-top:var(--sp-md)">Reset Filters</button></div>';
        var rb = document.getElementById('reset-filters-btn');
        if (rb) rb.addEventListener('click', function() {
          ['page-filter-tc', 'page-filter-date', 'page-filter-color'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = 'all';
          });
          applyFiltersAndRender();
        });
      }
    } else {
      UI.showDashboard();
      renderActiveFilterChips();
      currentAnalysis = Analyzer.analyze(filtered);
      currentInsights = Insights.generateInsights(currentAnalysis);
      UI.renderDashboard(currentAnalysis, currentInsights);
    }
  }


  // --- Post-import Welcome Banner ---
  var BANNER_KEY = 'lca_welcome_shown';
  var IMPORT_COUNT_KEY = 'lca_import_count';

  function showWelcomeBanner(gameCount) {
    var banner = document.getElementById('welcome-banner');
    if (!banner) return;

    banner.innerHTML =
      '<div class="wb-inner">' +
        '<span class="wb-icon">✅</span>' +
        '<div class="wb-body">' +
          '<strong class="wb-title">' + gameCount + ' games imported!</strong>' +
          '<span class="wb-text">Games loaded! Explore by ' +
            '<a href="openings.html" class="wb-link">Openings</a>, ' +
            '<a href="trends.html" class="wb-link">Trends</a>, or ' +
            '<a href="performance.html" class="wb-link">White vs Black</a> next.' +
          '</span>' +
        '</div>' +
        '<button class="wb-close" id="wb-close" aria-label="Dismiss">&times;</button>' +
      '</div>';
    banner.classList.remove('hidden');

    var closeBtn = document.getElementById('wb-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        banner.classList.add('hidden');
        try { sessionStorage.setItem(BANNER_KEY, '1'); } catch(e) {}
      });
    }

    // Auto-hide after 12s
    setTimeout(function() { banner.classList.add('hidden'); }, 12000);
  }

  function maybeShowBanner(newGamesCount) {
    // Don't show if already dismissed this session
    try { if (sessionStorage.getItem(BANNER_KEY)) return; } catch(e) {}
    if (newGamesCount > 0) showWelcomeBanner(newGamesCount);
  }

  // --- Suggested Next Page (bottom of each page) ---
  var PAGE_SUGGESTIONS = {
    'index.html':        { label: 'Explore your openings →', href: 'openings.html' },
    'openings.html':     { label: 'See performance by color →', href: 'performance.html' },
    'performance.html':  { label: 'Check your time control trends →', href: 'time-control.html' },
    'time-control.html': { label: 'Analyse game outcomes →', href: 'outcomes.html' },
    'outcomes.html':     { label: 'Explore game length patterns →', href: 'game-length.html' },
    'game-length.html':  { label: 'Dive into game phases →', href: 'game-phase.html' },
    'game-phase.html':   { label: 'Read your insights →', href: 'insights.html' },
    'insights.html':     { label: 'Track your trends →', href: 'trends.html' },
    'trends.html':       { label: 'Analyse your streaks →', href: 'streaks.html' },
    'streaks.html':      { label: 'Back to overview →', href: 'index.html' },
  };

  function renderNextPageSuggestion() {
    var el = document.getElementById('next-page-suggestion');
    if (!el) return;
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var suggestion = PAGE_SUGGESTIONS[page];
    if (!suggestion) return;
    el.innerHTML =
      '<a href="' + suggestion.href + '" class="next-page-link">' +
        suggestion.label +
      '</a>';
    el.classList.remove('hidden');
  }

  function processAndRender(gameDataArray) {
    if (!gameDataArray || gameDataArray.length === 0) {
      UI.showEmptyState();
      return;
    }
    // Reset so applyFiltersAndRender always rebuilds from fresh data
    currentAnalysis = null;
    currentInsights = null;
    applyFiltersAndRender();
    renderNextPageSuggestion();
  }

  // FEATURE: Streaks page
  function renderStreaksPage() {
    if (!document.getElementById('val-streak-lw')) return; // Not on streaks page
    if (!currentAnalysis || !currentAnalysis.overall || currentAnalysis.overall.totalGames < 1) {
      UI.showEmptyState();
      var emptyEl = document.getElementById('empty-state');
      if (emptyEl) {
        emptyEl.innerHTML = '<div class="empty-state-content"><span class="empty-state-icon">🔥</span><h2 class="empty-state-title">Not Enough Data</h2><p class="empty-state-text">Need at least 3 games to analyze streaks.</p><button class="btn sidebar-btn sidebar-btn--primary" id="load-demo-btn" style="margin-top:var(--sp-md)">Load Demo Data</button></div>';
        var db = document.getElementById('load-demo-btn');
        if (db) db.addEventListener('click', handleLoadDemo);
      }
      return;
    }

    UI.showDashboard();

    // Bind filters once
    ['page-filter-tc', 'page-filter-date', 'page-filter-color'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.addEventListener('change', renderStreaksPage);
        el.dataset.bound = 'true';
      }
    });

    // Read filter values
    var tcFilter = (document.getElementById('page-filter-tc') || {}).value || 'all';
    var dateFilter = (document.getElementById('page-filter-date') || {}).value || 'all';
    var colorFilter = (document.getElementById('page-filter-color') || {}).value || 'all';

    // Filter games
    var allGames = Storage.loadGames();
    var filtered = allGames.filter(function(g) {
      if (tcFilter !== 'all' && g.timeControl !== tcFilter) return false;
      if (colorFilter !== 'all' && g.playerColor !== colorFilter) return false;
      if (dateFilter !== 'all') {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateFilter));
        var gDate = g.date ? new Date(g.date.replace(/\./g, '-')) : null;
        if (!gDate || isNaN(gDate) || gDate < cutoff) return false;
      }
      return true;
    });

    if (filtered.length < 1) {
      // Show cards but with zero values
      UI.renderStreaksDashboard(Analyzer.analyze([]).streaks || {
        longestWinStreak: { length: 0 }, currentWinStreak: { length: 0 },
        longestLossStreak: { length: 0 }, currentLossStreak: { length: 0 },
        totalWinStreaks: { count: 0, avgLength: 0 }, totalLossStreaks: { count: 0, avgLength: 0 },
        streakHistory: [], streaksByTimeControl: {}, streaksByColor: { white: { longestWin: 0, longestLoss: 0 }, black: { longestWin: 0, longestLoss: 0 } },
        streakLengthDistribution: {}, streaksOverTime: []
      }, currentAnalysis);
      return;
    }

    // Sort chronologically and compute streaks
    filtered.sort(function(a, b) {
      if (!a.date || a.date === 'Unknown') return -1;
      if (!b.date || b.date === 'Unknown') return 1;
      return a.date.localeCompare(b.date);
    });

    var filteredAnalysis = Analyzer.analyze(filtered);
    UI.renderStreaksDashboard(filteredAnalysis.streaks, filteredAnalysis);
  }

  // FEATURE: Trends
  function renderTrendsPage() {
    if (!document.getElementById('trend-winrate-chart')) return; // Not on trends page
    
    if (!currentAnalysis || !currentAnalysis.gamesByMonth || currentAnalysis.gamesByMonth.length === 0) {
      UI.showEmptyState();
      var emptyEl = document.getElementById('empty-state');
      if (emptyEl) {
        emptyEl.innerHTML = '<div class="empty-state-content"><span class="empty-state-icon">📈</span><h2 class="empty-state-title">No Games Yet</h2><p class="empty-state-text">Upload your Lichess games to see trends.</p><button class="btn sidebar-btn sidebar-btn--primary" id="load-demo-btn" style="margin-top:var(--sp-md)">Load Demo Data</button></div>';
        var db = document.getElementById('load-demo-btn');
        if (db) db.addEventListener('click', handleLoadDemo);
      }
      return;
    }

    UI.showDashboard();
    
    // Bind filter
    var periodFilter = document.getElementById('page-filter-date');
    if (periodFilter && !periodFilter.dataset.bound) {
      periodFilter.addEventListener('change', renderTrendsPage);
      periodFilter.dataset.bound = 'true';
    }

    var selectedDays = periodFilter ? periodFilter.value : 'all'; // '30', '90', '180', '365', 'all'
    var limitMonths = selectedDays === 'all' ? 9999 : Math.ceil(parseInt(selectedDays) / 30);
    
    var gbm = currentAnalysis.gamesByMonth;
    var filteredGbm = limitMonths >= gbm.length ? gbm : gbm.slice(-limitMonths);
    if (filteredGbm.length === 0) filteredGbm = gbm.slice(-1);

    if (typeof UI.renderTrendsDashboard === 'function') {
      UI.renderTrendsDashboard(filteredGbm, currentAnalysis, currentInsights);
    }
  }

  function handlePgnUpload() {
    var rawPgn = UI.getPgnInput();
    if (!rawPgn.trim()) {
      UI.hidePgnModal();
      return;
    }

    var username = UI.getUsernameInput();
    if (!username) {
      UI.hidePgnModal();
      UI.highlightUsernameInput();
      return;
    }
    
    Storage.setUsername(username);

    UI.showProcessingFeedback('Parsing games...');

    // Small delay to allow UI to update before blocking main thread
    setTimeout(function() {
      // 1. Parse
      var parseResult = Parser.parsePGN(rawPgn);
      
      if (parseResult.validGames.length === 0) {
        UI.showParseWarnings('Found 0 valid games. Skipped ' + parseResult.invalidCount + ' invalid and ' + parseResult.duplicateCount + ' duplicates.');
        UI.hideProcessingFeedback();
        return;
      }

      // 2. Extract
      UI.showProcessingFeedback('Extracting data...');
      var extractResult = Extractor.extractGames(parseResult.validGames);

      if (extractResult.games.length === 0) {
         UI.showParseWarnings('Extraction failed. ' + extractResult.unknownPlayerCount + ' games skipped due to unknown player color.');
         UI.hideProcessingFeedback();
         return;
      }

      // 3. Save to Storage (this appends new games to existing library)
      if (Storage.getIsDemo()) Storage.clearGames();
      var existingGames = Storage.loadGames();
      var merged = existingGames.concat(extractResult.games);
      Storage.saveGames(merged);

      // 4. Update UI
      UI.updateSidebarStats(Storage.getGameCount(), Storage.getLastUpdated());
      
      var warningMsg = 'Parsed ' + extractResult.games.length + ' new games.';
      if (parseResult.duplicateCount > 0 || parseResult.invalidCount > 0) {
        warningMsg += ' (Skipped: ' + parseResult.duplicateCount + ' duplicates, ' + 
                      parseResult.invalidCount + ' invalid)';
      }
      
      // Close modal and render full dataset
      UI.hidePgnModal();
      processAndRender(Storage.loadGames());
      maybeShowBanner(extractResult.games.length);
      renderNextPageSuggestion();
      
      // We show an alert instead of modal warning since modal closes on success
      if (parseResult.duplicateCount > 0 || parseResult.invalidCount > 0) {
          setTimeout(function() { UI.showAlertModal('Notice', warningMsg); }, 100);
      }

    }, 50);
  }

  // FEATURE: Lichess API fetch
  async function handleLichessFetch() {
    var username = UI.getUsernameInput();
    if (!username) {
      if (typeof UI.hidePgnModal === 'function') UI.hidePgnModal();
      UI.highlightUsernameInput();
      return;
    }

    Storage.setUsername(username);
    UI.showProcessingFeedback('Fetching games from Lichess...');

    try {
      var url = 'https://lichess.org/api/games/user/' + encodeURIComponent(username) + '?max=500&opening=true&clocks=true';
      var response = await fetch(url, { headers: { 'Accept': 'application/x-chess-pgn' } });

      if (!response.ok) {
        UI.hideProcessingFeedback();
        UI.showAlertModal('Notice', 'Lichess API error: HTTP ' + response.status);
        return;
      }

      var pgn = await response.text();
      if (!pgn.trim()) {
        UI.hideProcessingFeedback();
        UI.showAlertModal('Notice', 'No games found for user "' + username + '" on Lichess.');
        return;
      }

      // Run the same pipeline as handlePgnUpload
      var parseResult = Parser.parsePGN(pgn);
      if (parseResult.validGames.length === 0) {
        UI.showParseWarnings('Found 0 valid games from Lichess. Skipped ' + parseResult.invalidCount + ' invalid and ' + parseResult.duplicateCount + ' duplicates.');
        UI.hideProcessingFeedback();
        return;
      }

      var extractResult = Extractor.extractGames(parseResult.validGames);
      if (extractResult.games.length === 0) {
        UI.showParseWarnings('Extraction failed. ' + extractResult.unknownPlayerCount + ' games skipped.');
        UI.hideProcessingFeedback();
        return;
      }

      if (Storage.getIsDemo()) Storage.clearGames();
      var existingGames = Storage.loadGames();
      var merged = existingGames.concat(extractResult.games);
      Storage.saveGames(merged);

      UI.updateSidebarStats(Storage.getGameCount(), Storage.getLastUpdated());
      UI.hidePgnModal();
      processAndRender(Storage.loadGames());
      maybeShowBanner(extractResult.games.length);
      renderNextPageSuggestion();

      var msg = 'Imported ' + extractResult.games.length + ' games from Lichess.';
      if (parseResult.duplicateCount > 0 || parseResult.invalidCount > 0) {
        msg += ' (Skipped: ' + parseResult.duplicateCount + ' duplicates, ' + parseResult.invalidCount + ' invalid)';
      }
      setTimeout(function() { UI.showAlertModal('Notice', msg); }, 100);

    } catch (err) {
      UI.hideProcessingFeedback();
      UI.showAlertModal('Notice', 'Lichess fetch failed: ' + err.message);
    }
  }

  // FEATURE: Load Demo
  function handleLoadDemo() {
    UI.showProcessingFeedback('Loading demo data...');
    try {
      Storage.setIsDemo(true);
      var pgn = DemoData.getDemoPgn();
      var parseResult = Parser.parsePGN(pgn);
      if (parseResult.validGames.length === 0) { UI.hideProcessingFeedback(); UI.showAlertModal('Notice', 'Demo parse failed.'); return; }
      var extractResult = Extractor.extractGames(parseResult.validGames);
      if (extractResult.games.length === 0) { UI.hideProcessingFeedback(); UI.showAlertModal('Notice', 'Demo extraction failed.'); return; }
      var merged = Storage.loadGames().concat(extractResult.games);
      Storage.saveGames(merged);
      UI.updateSidebarStats(Storage.getGameCount(), Storage.getLastUpdated());
      processAndRender(Storage.loadGames());
      UI.hideProcessingFeedback();
    } catch (err) {
      UI.hideProcessingFeedback();
      UI.showAlertModal('Notice', 'Demo load failed: ' + err.message);
    }
  }

  // --- Event Listeners ---

  function bindEvents() {
    // Theme Toggles
    function toggleTheme() {
      var current = Storage.getTheme();
      var next = current === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next);
      UI.applyTheme(next);
      if (typeof renderTrendsPage === 'function') renderTrendsPage();
      if (typeof renderStreaksPage === 'function') renderStreaksPage();
    }
    if (UI.els.themeToggle) UI.els.themeToggle.addEventListener('click', toggleTheme);
    if (UI.els.mobileThemeBtn) UI.els.mobileThemeBtn.addEventListener('click', toggleTheme);

    // Username Save
    if (UI.els.usernameInput) {
      UI.els.usernameInput.addEventListener('blur', function() {
        Storage.setUsername(this.value);
      });
      UI.els.usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          Storage.setUsername(this.value);
          this.blur();
        }
      });
    }

    // Modals
    var uploadBtn = document.getElementById('upload-pgn-btn');
    if (uploadBtn) uploadBtn.addEventListener('click', UI.showPgnModal);
    var heroUploadBtn = document.getElementById('upload-pgn-btn-hero');
    if (heroUploadBtn) heroUploadBtn.addEventListener('click', UI.showPgnModal);
    if (UI.els.pgnCloseBtn) UI.els.pgnCloseBtn.addEventListener('click', UI.hidePgnModal);
    if (UI.els.pgnCancelBtn) UI.els.pgnCancelBtn.addEventListener('click', UI.hidePgnModal);
    if (UI.els.analyzeBtn) UI.els.analyzeBtn.addEventListener('click', handlePgnUpload);

    // FEATURE: Lichess API fetch
    var lichessBtn = document.getElementById('lichess-fetch-btn');
    if (lichessBtn) lichessBtn.addEventListener('click', handleLichessFetch);

    // FEATURE: Load Demo
    var demoBtn = document.getElementById('load-demo-btn');
    if (demoBtn) demoBtn.addEventListener('click', handleLoadDemo);

    var shareBtn = document.getElementById('share-dashboard-btn');
    if (shareBtn) shareBtn.addEventListener('click', shareDashboard);

    var exportCardBtn = document.getElementById('export-card-btn');
    if (exportCardBtn) exportCardBtn.addEventListener('click', generateStatsCard);

    // Help Guide
    var helpFab = document.getElementById('help-fab');
    var helpModal = document.getElementById('help-modal');
    var helpModalClose = document.getElementById('help-modal-close');
    var helpModalGotit = document.getElementById('help-modal-gotit');
    
    if (helpFab && helpModal) {
      helpFab.addEventListener('click', function() { helpModal.classList.remove('hidden'); });
    }
    var closeHelp = function() { if (helpModal) helpModal.classList.add('hidden'); };
    if (helpModalClose) helpModalClose.addEventListener('click', closeHelp);
    if (helpModalGotit) helpModalGotit.addEventListener('click', closeHelp);
    if (helpModal) helpModal.addEventListener('click', function(e) { if (e.target === helpModal) closeHelp(); });

    // Export Data
    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        if (Storage.getGameCount() === 0) {
          UI.showAlertModal('Notice', 'No data to export.');
          return;
        }
        Storage.exportJSON();
      });
    }

    // Import Data
    var fileInput = document.getElementById('import-file-input');
    var importBtn = document.getElementById('import-btn');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', function() {
        fileInput.click();
      });

      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(evt) {
          var contents = evt.target.result;
          if (Storage.getIsDemo()) Storage.clearGames();
          var res = Storage.importJSON(contents);
          if (res.success) {
            UI.showAlertModal('Notice', 'Imported ' + res.imported + ' new games. Skipped ' + res.duplicates + ' duplicates.');
            UI.updateSidebarStats(Storage.getGameCount(), Storage.getLastUpdated());
            processAndRender(Storage.loadGames());
          } else {
            UI.showAlertModal('Notice', 'Import failed: ' + res.error);
          }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
      });
    }

    // Clear Data
    var clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        var count = Storage.getGameCount();
        if (count === 0) return;

        UI.showConfirmModal(
          'Clear All Data',
          'This will permanently delete all ' + count + ' games from your browser. It cannot be undone unless you have exported a backup.',
          function() {
            Storage.clearGames();
            UI.updateSidebarStats(0, 'Never');
            UI.showEmptyState();
            UI.hideConfirmModal();
          }
        );
      });
    }

    // Confirm Modal Actions
    if (UI.els.confirmCancelBtn) UI.els.confirmCancelBtn.addEventListener('click', UI.hideConfirmModal);
    if (UI.els.confirmBtn) {
      UI.els.confirmBtn.addEventListener('click', function() {
        var cb = UI.getConfirmCallback();
        if (cb) cb();
      });
    }

    // Mobile Menu
    if (UI.els.mobileMenuBtn) {
      UI.els.mobileMenuBtn.addEventListener('click', function() {
        if (UI.els.sidebar) UI.els.sidebar.classList.toggle('open');
        if (UI.els.sidebarOverlay) UI.els.sidebarOverlay.classList.toggle('hidden');
      });
    }

    if (UI.els.sidebarOverlay) {
      UI.els.sidebarOverlay.addEventListener('click', function() {
        if (UI.els.sidebar) UI.els.sidebar.classList.remove('open');
        UI.els.sidebarOverlay.classList.add('hidden');
      });
    }

    // Sidebar Navigation Active State & Mobile Handling
    var navItems = document.querySelectorAll('.nav-item:not(.nav-item--disabled)');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].addEventListener('click', function(e) {
        // We do not prevent default since these are real links now
        // On mobile, close sidebar (useful for SPA but harmless here)
        if (window.innerWidth <= 768) {
          UI.els.sidebar.classList.remove('open');
          UI.els.sidebarOverlay.classList.add('hidden');
        }
      });
    }
  }


  function shareDashboard() {
    var un = Storage.getUsername();
    if (!un) {
      var inputVal = document.getElementById('username-input').value.trim();
      un = inputVal ? inputVal : '';
    }
    if (!un) {
      UI.showAlertModal('Error', 'Please enter a username first to generate a shareable link.');
      return;
    }
    
    var url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('user', un);
    
    navigator.clipboard.writeText(url.toString()).then(function() {
      var feedback = document.getElementById('share-feedback');
      if (feedback) {
        feedback.classList.remove('hidden');
        setTimeout(function() {
          feedback.classList.add('hidden');
        }, 2000);
      }
    }).catch(function() {
      UI.showAlertModal('Error', 'Failed to copy link to clipboard.');
    });
  }

  function generateStatsCard() {
    if (!currentAnalysis || Storage.getGameCount() === 0) {
      UI.showAlertModal('No Data', 'Please upload a PGN file or load a username first.');
      return;
    }
    if (typeof html2canvas === 'undefined') {
      UI.showAlertModal('Error', 'Export library not loaded yet. Please try again in a moment.');
      return;
    }

    var un = Storage.getUsername() || 'Lichess Player';
    var isDark = Storage.getTheme() === 'dark';
    
    var bg = isDark ? '#0f172a' : '#f8fafc';
    var cardBg = isDark ? '#1e293b' : '#ffffff';
    var textPrimary = isDark ? '#f8fafc' : '#0f172a';
    var textMuted = isDark ? '#94a3b8' : '#64748b';
    var primaryColor = '#3b82f6';
    
    var contextTitle = 'Chess Performance';
    var stat1Label = 'TOTAL GAMES';
    var stat1Value = currentAnalysis.overall.totalGames || 0;
    var stat2Label = 'WIN RATE';
    var stat2Value = (currentAnalysis.overall.winRate || 0) + '%';
    
    var btc = currentAnalysis.timeControl && currentAnalysis.timeControl.best ? currentAnalysis.timeControl.best : 'N/A';
    var bestWin = currentAnalysis.streaks && currentAnalysis.streaks.streaksByColor ? Math.max(currentAnalysis.streaks.streaksByColor.white.longestWin, currentAnalysis.streaks.streaksByColor.black.longestWin) : 0;
    
    var bop = 'N/A';
    var qOps = [];
    if (currentAnalysis.openings && currentAnalysis.openings.length > 0) {
      qOps = currentAnalysis.openings.filter(function(x){return x.total>=2 && x.name!=='Unknown';});
      if (qOps.length > 0) bop = qOps[0].name;
    }
    
    var footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">BEST TIME CONTROL:</strong> <span style="font-weight: 600;">${btc}</span>`;
    var footer2 = `<strong style="color: ${textMuted}; font-weight: 600;">BEST OPENING:</strong> <span style="font-weight: 600;">${bop.length > 20 ? bop.substring(0,20)+'...' : bop}</span>`;
    
    var insight = currentInsights && currentInsights.mainTarget ? currentInsights.mainTarget : 'Keep playing to identify patterns';
    
    var path = window.location.pathname.toLowerCase();
    
    if (path.includes('openings')) {
      contextTitle = 'Opening Repertoire';
      if (qOps.length > 0) {
        stat1Label = 'TOP OPENING';
        stat1Value = bop.length > 15 ? bop.substring(0,15)+'...' : bop;
        stat2Label = 'WIN RATE';
        stat2Value = qOps[0].winRate + '%';
        footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">GAMES PLAYED:</strong> <span style="font-weight: 600;">${qOps[0].total}</span>`;
        footer2 = `<strong style="color: ${textMuted}; font-weight: 600;">W/L/D:</strong> <span style="font-weight: 600;">${qOps[0].wins}/${qOps[0].losses}/${qOps[0].draws}</span>`;
      }
      if (currentInsights && currentInsights.openings) insight = typeof currentInsights.openings === 'string' ? currentInsights.openings : (currentInsights.openings.text || 'Analyze more openings');
    } 
    else if (path.includes('time-control')) {
      contextTitle = 'Time Control Stats';
      stat1Label = 'BEST FORMAT';
      stat1Value = btc;
      stat2Label = 'WORST FORMAT';
      stat2Value = currentAnalysis.timeControl && currentAnalysis.timeControl.worst ? currentAnalysis.timeControl.worst : 'N/A';
      footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">TOTAL GAMES:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.totalGames||0}</span>`;
      footer2 = `<strong style="color: ${textMuted}; font-weight: 600;">OVERALL WIN RATE:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.winRate||0}%</span>`;
      if (currentInsights && currentInsights.timeControl) insight = typeof currentInsights.timeControl === 'string' ? currentInsights.timeControl : (currentInsights.timeControl.text || 'Play more time controls');
    }
    else if (path.includes('trends')) {
      contextTitle = 'Performance Trends';
      var mGames = currentAnalysis.gamesByMonth || [];
      var activeMonths = mGames.filter(function(m){ return m.total > 0; });
      var bestMonth = { name: 'N/A', rate: -1 };
      activeMonths.forEach(function(m) {
         var r = Math.round((m.wins/m.total)*100);
         if (r > bestMonth.rate) { bestMonth.rate = r; bestMonth.name = m.month; }
      });
      
      stat1Label = 'BEST MONTH';
      stat1Value = bestMonth.name !== 'N/A' ? bestMonth.name.substring(0, 3) : 'N/A';
      stat2Label = 'MONTHLY WIN RATE';
      stat2Value = bestMonth.rate !== -1 ? bestMonth.rate + '%' : 'N/A';
      
      footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">ACTIVE MONTHS:</strong> <span style="font-weight: 600;">${activeMonths.length}</span>`;
      footer2 = `<strong style="color: ${textMuted}; font-weight: 600;">OVERALL WIN RATE:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.winRate||0}%</span>`;
    }
    else if (path.includes('streaks')) {
      contextTitle = 'Winning Streaks';
      var worstLoss = currentAnalysis.streaks && currentAnalysis.streaks.streaksByColor ? Math.max(currentAnalysis.streaks.streaksByColor.white.longestLoss, currentAnalysis.streaks.streaksByColor.black.longestLoss) : 0;
      
      stat1Label = 'LONGEST WIN STREAK';
      stat1Value = bestWin + ' Games';
      stat2Label = 'LONGEST LOSS STREAK';
      stat2Value = worstLoss + ' Games';
      
      footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">GAMES ANALYZED:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.totalGames||0}</span>`;
      footer2 = '';
      insight = 'Consistency is key for streaks';
    }
    else if (path.includes('outcomes')) {
      contextTitle = 'Game Outcomes';
      var cmWins = currentAnalysis.outcomes && currentAnalysis.outcomes.wins && currentAnalysis.outcomes.wins.checkmate ? currentAnalysis.outcomes.wins.checkmate.count : 0;
      var toLosses = currentAnalysis.outcomes && currentAnalysis.outcomes.losses && currentAnalysis.outcomes.losses.timeout ? currentAnalysis.outcomes.losses.timeout.count : 0;
      
      stat1Label = 'CHECKMATES';
      stat1Value = cmWins;
      stat2Label = 'TIMEOUT LOSSES';
      stat2Value = toLosses;
      
      footer1 = `<strong style="color: ${textMuted}; font-weight: 600;">TOTAL WINS:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.wins||0}</span>`;
      footer2 = `<strong style="color: ${textMuted}; font-weight: 600;">TOTAL LOSSES:</strong> <span style="font-weight: 600;">${currentAnalysis.overall.losses||0}</span>`;
      if (currentInsights && currentInsights.outcomes) insight = typeof currentInsights.outcomes === 'string' ? currentInsights.outcomes : (currentInsights.outcomes.text || 'Focus on time management');
    }
    else if (path.includes('game-length')) {
      contextTitle = 'Game Length Patterns';
      stat1Label = 'AVG WIN LENGTH';
      stat1Value = (currentAnalysis.gameLength && currentAnalysis.gameLength.avgWinMoves ? currentAnalysis.gameLength.avgWinMoves : 0) + ' Moves';
      stat2Label = 'AVG LOSS LENGTH';
      stat2Value = (currentAnalysis.gameLength && currentAnalysis.gameLength.avgLossMoves ? currentAnalysis.gameLength.avgLossMoves : 0) + ' Moves';
      footer1 = '';
      footer2 = '';
      if (currentInsights && currentInsights.gameLength) insight = typeof currentInsights.gameLength === 'string' ? currentInsights.gameLength : (currentInsights.gameLength.text || 'Keep an eye on game length');
    }
    else if (path.includes('game-phase')) {
      contextTitle = 'Game Phase Mastery';
      var phases = currentAnalysis.gamePhase ? [currentAnalysis.gamePhase.opening, currentAnalysis.gamePhase.middlegame, currentAnalysis.gamePhase.endgame] : [];
      var bestPhase = { name: 'Opening', rate: phases.length ? phases[0].winRate : 0 };
      if (phases.length && phases[1] && phases[1].winRate > bestPhase.rate) bestPhase = { name: 'Middlegame', rate: phases[1].winRate };
      if (phases.length && phases[2] && phases[2].winRate > bestPhase.rate) bestPhase = { name: 'Endgame', rate: phases[2].winRate };
      stat1Label = 'STRONGEST PHASE';
      stat1Value = bestPhase.rate > 0 ? bestPhase.name : 'N/A';
      stat2Label = 'PHASE WIN RATE';
      stat2Value = bestPhase.rate > 0 ? bestPhase.rate + '%' : 'N/A';
      footer1 = '';
      footer2 = '';
      if (currentInsights && currentInsights.gamePhase) insight = typeof currentInsights.gamePhase === 'string' ? currentInsights.gamePhase : (currentInsights.gamePhase.text || 'Study your weak phases');
    }
    
    var card = document.createElement('div');
    card.style.position = 'absolute';
    card.style.left = '-9999px';
    card.style.width = '700px';
    card.style.height = '480px';
    card.style.backgroundColor = bg;
    card.style.padding = '32px';
    card.style.fontFamily = 'Inter, sans-serif';
    card.style.color = textPrimary;
    card.style.boxSizing = 'border-box';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.borderRadius = '16px';
    
    card.innerHTML = `
      <div style="flex: 1;">
        <div style="font-size: 14px; font-weight: 600; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${contextTitle}</div>
        <div style="font-size: 36px; font-weight: 700; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <span>${un}</span>
          <span style="font-size: 14px; font-weight: 600; color: ${isDark ? '#38bdf8' : '#0284c7'}; background: ${isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe'}; padding: 6px 16px; border-radius: 20px; border: 1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : '#bae6fd'};">Pro Player Profile</span>
        </div>
        
        <div style="display: flex; gap: 16px; margin-bottom: 28px;">
          <div style="background: ${cardBg}; padding: 16px 20px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 12px; color: ${textMuted}; font-weight: 600; margin-bottom: 4px;">${stat1Label}</div>
            <div style="font-size: 26px; font-weight: 700;">${stat1Value}</div>
          </div>
          <div style="background: ${cardBg}; padding: 16px 20px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 12px; color: ${textMuted}; font-weight: 600; margin-bottom: 4px;">${stat2Label}</div>
            <div style="font-size: 26px; font-weight: 700; color: ${primaryColor};">${stat2Value}</div>
          </div>
        </div>
        
        <div style="font-size: 11px; font-weight: 600; color: ${textMuted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Career Highlights</div>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="background: ${isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'}; padding: 16px 12px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}; text-align: center;">
            <div style="font-size: 10px; color: ${primaryColor}; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Win Rate</div>
            <div style="font-size: 20px; font-weight: 800; color: ${textPrimary};">${(currentAnalysis.overall.winRate || 0)}%</div>
          </div>
          <div style="background: ${cardBg}; padding: 16px 12px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; text-align: center;">
            <div style="font-size: 10px; color: ${textMuted}; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Best Format</div>
            <div style="font-size: 20px; font-weight: 800; color: ${textPrimary};">${btc}</div>
          </div>
          <div style="background: ${cardBg}; padding: 16px 12px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; text-align: center; overflow: hidden;">
            <div style="font-size: 10px; color: ${textMuted}; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Top Opening</div>
            <div style="font-size: 18px; font-weight: 800; color: ${textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bop.length > 12 ? bop.substring(0, 12) + '...' : bop}</div>
          </div>
          <div style="background: ${cardBg}; padding: 16px 12px; border-radius: 8px; flex: 1; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; text-align: center;">
            <div style="font-size: 10px; color: ${textMuted}; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Best Streak</div>
            <div style="font-size: 20px; font-weight: 800; color: ${textPrimary};">${bestWin} <span style="font-size:12px; font-weight:600; color:${textMuted};">W</span></div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-top: 16px;">
        <div style="flex: 1; padding-right: 20px;">
          <div style="font-size: 11px; font-weight: 600; color: ${primaryColor}; text-transform: uppercase; margin-bottom: 4px;">KEY INSIGHT</div>
          <div style="font-size: 15px; font-weight: 500; line-height: 1.4;">${insight}</div>
        </div>
        <div style="font-size: 14px; color: ${textMuted}; font-weight: 700; text-align: right; min-width: 140px;">
          Lichess Analytics
        </div>
      </div>
    `;
    
    document.body.appendChild(card);
    
    html2canvas(card, {
      scale: 2,
      backgroundColor: bg,
      logging: false
    }).then(function(canvas) {
      var link = document.createElement('a');
      link.download = 'lichess-' + contextTitle.toLowerCase().replace(/\s+/g, '-') + '-' + un.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(card);
    }).catch(function(err) {
      document.body.removeChild(card);
      UI.showAlertModal('Error', 'Failed to generate card: ' + err);
    });
  }

  // --- Run ---
  document.addEventListener('DOMContentLoaded', init);

})();