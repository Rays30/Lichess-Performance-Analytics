/**
 * extractor.js — Extract structured GameData from parsed PGN game blocks
 *
 * Input:  string[] (valid PGN game blocks from parser.js)
 * Output: { games: GameData[], unknownPlayerCount: number, errors: string[] }
 *
 * Dependencies: Parser (extractMoveText, generateHash), Storage (getUsername)
 * Side effects: None (pure logic)
 */

var Extractor = (function () {

  // --- Time control buckets (base seconds) ---
  var TC_BULLET_MAX  = 179;   // < 180
  var TC_BLITZ_MAX   = 599;   // 180–599
  var TC_RAPID_MAX   = 1799;  // 600–1799
  // 1800+ = Classical

  /**
   * Main entry. Extract structured data from an array of valid PGN blocks.
   * @param {string[]} gameBlocks - cleaned PGN blocks from Parser.parsePGN().validGames
   * @returns {{ games: GameData[], unknownPlayerCount: number, errors: string[] }}
   */
  function extractGames(gameBlocks) {
    var result = { games: [], unknownPlayerCount: 0, errors: [] };

    var usernameStr = Storage.getUsername() || '';
    var usernames = [];
    if (usernameStr) {
      var parts = usernameStr.split(',');
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k].trim().toLowerCase();
        if (p.length > 0) usernames.push(p);
      }
    }

    for (var i = 0; i < gameBlocks.length; i++) {
      try {
        var game = extractSingle(gameBlocks[i], usernames);
        if (game === null) {
          // Should not happen now
        } else if (game === false) {
          // skipped (unfinished, self-play, missing tags)
          result.errors.push('Game ' + (i + 1) + ': skipped (missing data or unfinished).');
        } else {
          if (game.playerColor === 'unknown') result.unknownPlayerCount++;
          result.games.push(game);
        }
      } catch (e) {
        result.errors.push('Game ' + (i + 1) + ': ' + e.message);
      }
    }

    return result;
  }

  /**
   * Extract a single game block into a GameData object.
   * @returns {GameData|null|false} GameData on success, null if unknown player, false if skip
   */
  function extractSingle(block, usernames) {
    // --- Extract tags ---
    var white = getTag(block, 'White');
    var black = getTag(block, 'Black');
    var rawResult = getTag(block, 'Result');
    var rawDate = getTag(block, 'UTCDate') || getTag(block, 'Date');
    var opening = getTag(block, 'Opening') || getTag(block, 'ECO') || 'Unknown';
    var rawTC = getTag(block, 'TimeControl');
    var termination = getTag(block, 'Termination');
    var variant = getTag(block, 'Variant');

    // --- Validate required fields ---
    if (!white || !black) return false;
    if (!rawResult || rawResult === '*') return false;
    if (variant && variant.toLowerCase() !== 'standard') return false;

    // --- Self-play check ---
    if (white.toLowerCase() === black.toLowerCase()) return false;

    // --- Player color ---
    var playerColor = 'unknown';
    var wLower = white.toLowerCase();
    var bLower = black.toLowerCase();
    
    for (var j = 0; j < usernames.length; j++) {
      if (wLower === usernames[j]) {
        playerColor = 'white';
        break;
      } else if (bLower === usernames[j]) {
        playerColor = 'black';
        break;
      }
    }

    // --- Result from player perspective ---
    var resultStr = mapResult(rawResult, playerColor);

    // --- Date normalization ---
    var date = normalizeDate(rawDate);

    // --- Time control ---
    var timeControl = categorizeTimeControl(rawTC);

    // --- Move text & moves array ---
    var moveText = Parser.extractMoveText(block);
    var moves = extractMovesArray(moveText);
    var moveCount = Math.ceil(moves.length / 2);

    // --- Outcome type ---
    var outcomeType = mapOutcome(termination, moveText);

    // --- Game phase (approximation) ---
    var gamePhase;
    if (moveCount <= 10) {
      gamePhase = 'opening';
    } else if (moveCount <= 40) {
      gamePhase = 'middlegame';
    } else {
      gamePhase = 'endgame';
    }

    // --- Hash ---
    var hash = Parser.generateHash(block);

    return {
      id: hash,
      white: white,
      black: black,
      result: resultStr,
      playerColor: playerColor,
      timeControl: timeControl,
      opening: opening,
      date: date,
      moves: moves,
      moveCount: moveCount,
      outcomeType: outcomeType,
      gamePhase: gamePhase,
      hash: hash,
    };
  }

  // ======================= HELPERS =======================

  /**
   * Extract a PGN tag value by name.
   * e.g., getTag(block, 'White') from [White "MagnusCarlsen"]
   */
  function getTag(block, name) {
    var regex = new RegExp('\\[' + name + '\\s+"([^"]*)"\\]');
    var match = block.match(regex);
    if (!match) return '';
    var val = match[1].trim();
    // Treat "?" and "" as empty
    if (val === '?' || val === '??') return '';
    return val;
  }

  /**
   * Map raw PGN result to player-perspective result.
   */
  function mapResult(rawResult, playerColor) {
    if (playerColor === 'unknown') return 'unknown';
    if (rawResult === '1/2-1/2') return 'draw';
    if (rawResult === '1-0') {
      return playerColor === 'white' ? 'win' : 'loss';
    }
    if (rawResult === '0-1') {
      return playerColor === 'black' ? 'win' : 'loss';
    }
    return 'draw'; // fallback
  }

  /**
   * Normalize date from PGN formats to YYYY-MM-DD.
   * Handles: YYYY.MM.DD, YYYY/MM/DD, DD.MM.YYYY, DD/MM/YYYY
   */
  function normalizeDate(raw) {
    if (!raw) return 'Unknown';

    var cleaned = raw.replace(/\?/g, '').trim();
    if (cleaned.length === 0) return 'Unknown';

    // YYYY.MM.DD or YYYY/MM/DD
    var m1 = cleaned.match(/^(\d{4})[./](\d{2})[./](\d{2})$/);
    if (m1) return m1[1] + '-' + m1[2] + '-' + m1[3];

    // DD.MM.YYYY or DD/MM/YYYY
    var m2 = cleaned.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if (m2) return m2[3] + '-' + m2[2] + '-' + m2[1];

    // Partial date YYYY.MM or YYYY
    var m3 = cleaned.match(/^(\d{4})(?:[./](\d{2}))?$/);
    if (m3) return m3[1] + (m3[2] ? '-' + m3[2] : '') + '-01';

    return 'Unknown';
  }

  /**
   * Parse and categorize time control.
   * Input: "300+0", "180+2", "600", "900+10", "-" etc.
   */
  function categorizeTimeControl(raw) {
    if (!raw || raw === '-' || raw === '?') return 'Unknown';

    // Extract base seconds (before the + if present)
    var match = raw.match(/^(\d+)/);
    if (!match) return 'Unknown';

    var baseSeconds = parseInt(match[1], 10);
    if (isNaN(baseSeconds)) return 'Unknown';

    if (baseSeconds <= TC_BULLET_MAX) return 'Bullet';
    if (baseSeconds <= TC_BLITZ_MAX) return 'Blitz';
    if (baseSeconds <= TC_RAPID_MAX) return 'Rapid';
    return 'Classical';
  }

  /**
   * Map [Termination] tag to outcome type.
   * Fallback: check for checkmate symbol in move text.
   */
  function mapOutcome(termination, moveText) {
    if (termination) {
      var t = termination.toLowerCase();
      if (t.indexOf('checkmate') !== -1) return 'checkmate';
      if (t.indexOf('time') !== -1) return 'timeout';
      if (t.indexOf('abandon') !== -1 || t.indexOf('resign') !== -1) return 'resignation';
      // Lichess uses 'Normal' for both checkmate and resignation — infer from moves
      if (t === 'normal') {
        if (moveText && moveText.indexOf('#') !== -1) return 'checkmate';
        return 'resignation';
      }
      return 'other';
    }

    // No termination tag — infer from move text
    if (moveText && moveText.indexOf('#') !== -1) return 'checkmate';
    return 'other';
  }

  /**
   * Extract individual moves from PGN move text into an array.
   * Returns both white and black moves as separate entries.
   * e.g., "1. e4 e5 2. Nf3 Nc6" → ["e4", "e5", "Nf3", "Nc6"]
   */
  function extractMovesArray(moveText) {
    if (!moveText) return [];

    // Remove result markers
    var text = moveText
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length === 0) return [];

    var tokens = text.split(/\s+/);
    var moves = [];

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      // Skip move numbers (e.g., "1.", "12...", "3.")
      if (/^\d+\.+$/.test(token)) continue;
      // Skip pure numbers
      if (/^\d+$/.test(token)) continue;
      // Remove leading move number if attached (e.g., "1.e4" → "e4")
      var cleaned = token.replace(/^\d+\.+/, '');
      if (cleaned.length > 0) {
        moves.push(cleaned);
      }
    }

    return moves;
  }

  // --- Public API ---
  return {
    extractGames: extractGames,
  };
})();
