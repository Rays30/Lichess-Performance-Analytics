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
  };

  const MAX_STORAGE_WARNING_BYTES = 4 * 1024 * 1024; // 4MB warning threshold

  // --- Games ---

  function saveGames(games) {
    if (!Array.isArray(games)) return false;
    try {
      const json = JSON.stringify(games);
      if (json.length > MAX_STORAGE_WARNING_BYTES) {
        console.warn('[Storage] Data approaching localStorage limit (' + json.length + ' bytes)');
      }
      localStorage.setItem(KEYS.GAMES, json);
      localStorage.setItem(KEYS.LAST_UPDATED, new Date().toISOString());
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('[Storage] localStorage full. Export your data as backup.');
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
      return localStorage.getItem(KEYS.USERNAME) || '';
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
  };
})();
