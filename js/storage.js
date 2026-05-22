/**
 * storage.js — localStorage CRUD + JSON export/import + theme/username persistence
 *
 * Dependencies: None
 * Side effects: Reads/writes localStorage
 */

const Storage = (function () {
  const KEYS = {
    GAMES: 'chess_analyzer_games',
    THEME: 'chess_analyzer_theme',
    USERNAME: 'chess_analyzer_username',
    LAST_UPDATED: 'chess_analyzer_last_updated',
    IS_DEMO: 'chess_analyzer_is_demo',
  };

  const MAX_STORAGE_WARNING_BYTES = 4 * 1024 * 1024; // 4MB warning threshold

  // --- Games ---


  // --- Storage toast notification ---
  function showStorageToast(title, message, type) {
    // Create toast if it doesn't exist
    var existing = document.getElementById('storage-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'storage-toast';
    toast.className = 'storage-toast storage-toast--' + (type || 'error');
    toast.innerHTML =
      '<div class="st-inner">' +
        '<div class="st-body">' +
          '<strong class="st-title">' + title + '</strong>' +
          '<span class="st-msg">' + message + '</span>' +
        '</div>' +
        '<div class="st-actions">' +
          '<button class="st-btn st-btn--action" id="st-export-btn">Export data</button>' +
          '<button class="st-btn st-btn--dismiss" id="st-dismiss-btn">&times;</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(toast);

    // Wire buttons after DOM insertion
    var exportBtn = document.getElementById('st-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var eb = document.getElementById('export-btn');
        if (eb) eb.click();
        toast.remove();
      });
    }
    var dismissBtn = document.getElementById('st-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() { toast.remove(); });
    }

    // Animate in
    requestAnimationFrame(function() { toast.classList.add('storage-toast--visible'); });

    // Auto-dismiss warnings after 10s, errors stay until dismissed
    if (type === 'warning') {
      setTimeout(function() {
        if (toast.parentNode) {
          toast.classList.remove('storage-toast--visible');
          setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
        }
      }, 10000);
    }
  }

  function saveGames(games) {
    if (!Array.isArray(games)) return false;
    try {
      const json = JSON.stringify(games);
      if (json.length > MAX_STORAGE_WARNING_BYTES) {
        var usedMB = (json.length / (1024 * 1024)).toFixed(1);
        console.warn('[Storage] Data approaching localStorage limit (' + json.length + ' bytes)');
        showStorageToast(
          '⚠️ Storage almost full (' + usedMB + 'MB / 5MB)',
          'Export your data as a backup soon to avoid losing access.',
          'warning'
        );
      }
      localStorage.setItem(KEYS.GAMES, json);
      localStorage.setItem(KEYS.LAST_UPDATED, new Date().toISOString());
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error('[Storage] localStorage full.');
        // Surface a visible toast to the user
        if (typeof window !== 'undefined') {
          var sizeKB = Math.round(JSON.stringify(games).length / 1024);
          showStorageToast(
            '⚠️ Storage full (' + sizeKB + 'KB)',
            'Your browser storage is full. Export your data as a backup, then clear it to import more games.',
            'error'
          );
        }
        return false;
      }
      console.error('[Storage] Failed to save games:', e);
      return false;
    }
  }

  function loadGames() {
    try {
      const raw = localStorage.getItem(KEYS.GAMES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[Storage] Failed to load games:', e);
      return [];
    }
  }

  function clearGames() {
    try {
      localStorage.removeItem(KEYS.GAMES);
      localStorage.removeItem(KEYS.LAST_UPDATED);
      if (getIsDemo()) {
        localStorage.removeItem(KEYS.USERNAME);
        setIsDemo(false);
      }
      return true;
    } catch (e) {
      console.error('[Storage] Failed to clear games:', e);
      return false;
    }
  }

  function getGameCount() {
    return loadGames().length;
  }

  // --- Export / Import ---

  function exportJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      username: getUsername(),
      games: loadGames(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess-analytics-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid JSON structure.' };
      }

      // Support both raw array and wrapped format
      let games;
      if (Array.isArray(data)) {
        games = data;
      } else if (Array.isArray(data.games)) {
        games = data.games;
      } else {
        return { success: false, error: 'No games array found in JSON.' };
      }

      // Basic validation: each game should be an object with at minimum a result
      const validGames = games.filter(function (g) {
        return g && typeof g === 'object' && typeof g.result === 'string';
      });

      if (validGames.length === 0) {
        return { success: false, error: 'No valid games found in import file.' };
      }

      // Merge with existing games (dedup by hash if available)
      const existing = loadGames();
      const existingHashes = new Set(existing.map(function (g) { return g.hash; }).filter(Boolean));
      var newGames = [];
      var duplicateCount = 0;

      for (var i = 0; i < validGames.length; i++) {
        var game = validGames[i];
        if (game.hash && existingHashes.has(game.hash)) {
          duplicateCount++;
        } else {
          newGames.push(game);
          if (game.hash) existingHashes.add(game.hash);
        }
      }

      var merged = existing.concat(newGames);
      var saved = saveGames(merged);

      if (!saved) {
        return { success: false, error: 'Failed to save — localStorage may be full.' };
      }

      // Import username if present and none currently set
      if (data.username && !getUsername()) {
        setUsername(data.username);
      }

      return {
        success: true,
        imported: newGames.length,
        duplicates: duplicateCount,
        total: merged.length,
      };
    } catch (e) {
      return { success: false, error: 'Invalid JSON file: ' + e.message };
    }
  }

  // --- Theme ---

  function getTheme() {
    try {
      return localStorage.getItem(KEYS.THEME) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (e) {
      console.error('[Storage] Failed to save theme:', e);
    }
  }

  // --- Username ---

  function getUsername() {
    try {
      var un = localStorage.getItem(KEYS.USERNAME) || '';
      if (un === 'DemoPlayer') return '';
      return un;
    } catch (e) {
      return '';
    }
  }

  function setUsername(name) {
    try {
      localStorage.setItem(KEYS.USERNAME, (name || '').trim());
    } catch (e) {
      console.error('[Storage] Failed to save username:', e);
    }
  }

  // --- Last Updated ---

  function getLastUpdated() {
    try {
      var iso = localStorage.getItem(KEYS.LAST_UPDATED);
      if (!iso) return 'Never';
      var d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Never';
    }
  }

  // --- Demo Mode ---
  function getIsDemo() {
    try {
      return localStorage.getItem(KEYS.IS_DEMO) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setIsDemo(isDemo) {
    try {
      if (isDemo) {
        localStorage.setItem(KEYS.IS_DEMO, 'true');
      } else {
        localStorage.removeItem(KEYS.IS_DEMO);
      }
    } catch (e) {
      console.error('[Storage] Failed to save demo flag:', e);
    }
  }

  // --- Public API ---
  return {
    saveGames: saveGames,
    loadGames: loadGames,
    clearGames: clearGames,
    getGameCount: getGameCount,
    exportJSON: exportJSON,
    importJSON: importJSON,
    getTheme: getTheme,
    setTheme: setTheme,
    getUsername: getUsername,
    setUsername: setUsername,
    getLastUpdated: getLastUpdated,
    getIsDemo: getIsDemo,
    setIsDemo: setIsDemo,
  };
})();