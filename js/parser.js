/**
 * parser.js — PGN parsing, multi-game split, validation, duplicate detection
 *
 * Input:  Raw PGN string (multi-game)
 * Output: { validGames: string[], invalidCount: number, duplicateCount: number, totalInput: number }
 *
 * Dependencies: Storage (for existing game hashes)
 * Side effects: None (pure logic — does not write to storage)
 */

var Parser = (function () {

  /**
   * Main entry point. Parse raw PGN text into validated, deduplicated game blocks.
   * @param {string} rawText - Raw PGN string (may contain multiple games)
   * @returns {{ validGames: string[], invalidCount: number, duplicateCount: number, totalInput: number }}
   */
  function parsePGN(rawText) {
    var result = {
      validGames: [],
      invalidCount: 0,
      duplicateCount: 0,
      totalInput: 0,
    };

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return result;
    }

    // Normalize line endings
    var normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into individual game blocks
    var blocks = splitIntoGames(normalized);
    result.totalInput = blocks.length;

    if (blocks.length === 0) {
      return result;
    }

    // Load existing hashes from storage for dedup
    var existingGames = Storage.loadGames();
    var existingHashes = {};
    for (var i = 0; i < existingGames.length; i++) {
      if (existingGames[i].hash) {
        existingHashes[existingGames[i].hash] = true;
      }
    }

    // Track hashes within this batch too (prevent intra-batch duplicates)
    var batchHashes = {};

    for (var j = 0; j < blocks.length; j++) {
      var block = blocks[j].trim();
      if (!block) continue;

      // Clean the block: strip comments and variations
      var cleaned = cleanPGN(block);

      // Validate
      if (!isValidGame(cleaned)) {
        result.invalidCount++;
        continue;
      }

      // Hash for duplicate detection
      var hash = generateHash(cleaned);

      if (existingHashes[hash] || batchHashes[hash]) {
        result.duplicateCount++;
        continue;
      }

      batchHashes[hash] = true;
      result.validGames.push(cleaned);
    }

    return result;
  }

  /**
   * Split raw PGN text into individual game blocks.
   * Games start with a tag pair like [Event "..."] and are separated by blank lines
   * followed by another tag pair.
   */
  function splitIntoGames(text) {
    var games = [];
    // Split on blank line(s) followed by a tag opening bracket
    // This regex looks for one or more blank lines before a [ that starts a tag
    var parts = text.split(/\n\n+(?=\[)/);

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.length > 0) {
        games.push(part);
      }
    }

    return games;
  }

  /**
   * Strip comments { ... } and variations ( ... ) from PGN text.
   * Preserves tag pairs and move text.
   */
  function cleanPGN(block) {
    // Remove inline comments: { anything }
    // Handle nested braces by repeatedly removing innermost
    var cleaned = block;
    var prev;
    do {
      prev = cleaned;
      cleaned = cleaned.replace(/\{[^{}]*\}/g, '');
    } while (cleaned !== prev);

    // Remove variations: ( anything )
    // Handle nested parens by repeatedly removing innermost
    do {
      prev = cleaned;
      cleaned = cleaned.replace(/\([^()]*\)/g, '');
    } while (cleaned !== prev);

    // Remove NAGs ($1, $2, etc.)
    cleaned = cleaned.replace(/\$\d+/g, '');

    // Collapse multiple spaces/newlines in move text (but keep tag lines intact)
    var lines = cleaned.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.length > 0) {
        // If it's a tag line, keep as-is
        if (line.charAt(0) === '[') {
          result.push(line);
        } else {
          // Move text: collapse whitespace
          result.push(line.replace(/\s+/g, ' '));
        }
      }
    }

    return result.join('\n');
  }

  /**
   * Validate that a game block has minimum required structure.
   * Must have at least one recognized tag and at least one move.
   */
  function isValidGame(block) {
    if (!block || block.length === 0) return false;

    // Must have at least one PGN tag
    var hasTag = /^\[(?:Event|Site|Date|Round|White|Black|Result)\s+"[^"]*"\]\s*$/m.test(block);
    if (!hasTag) return false;

    // Extract the move text (everything after the last tag line)
    var moveText = extractMoveText(block);
    if (!moveText || moveText.trim().length === 0) return false;

    // Must have at least one move number (e.g., "1." or "1...")
    var hasMove = /\d+\./.test(moveText);
    return hasMove;
  }

  /**
   * Extract move text from a PGN block (everything after tag pairs).
   */
  function extractMoveText(block) {
    var lines = block.split('\n');
    var moveLines = [];
    var pastTags = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.charAt(0) === '[' && line.charAt(line.length - 1) === ']') {
        // Tag line — skip
        continue;
      }
      if (line.length > 0) {
        pastTags = true;
        moveLines.push(line);
      }
    }

    return moveLines.join(' ');
  }

  /**
   * Generate a hash string from date + first 5 moves for duplicate detection.
   * Uses a simple string hash — not cryptographic, just collision-resistant enough.
   */
  function generateHash(block) {
    // Extract date
    var dateMatch = block.match(/\[Date\s+"([^"]*)"\]/);
    var datePart = (dateMatch && dateMatch[1]) ? dateMatch[1].trim() : 'nodate';

    // Extract first 5 moves from move text
    var moveText = extractMoveText(block);
    var moves = extractFirstNMoves(moveText, 5);
    var movePart = moves.join('|');

    var raw = datePart + ':' + movePart;
    return stringHash(raw);
  }

  /**
   * Extract the first N actual moves (not move numbers) from move text.
   * e.g., "1. e4 e5 2. Nf3 Nc6 3. Bb5" → ["e4", "e5", "Nf3", "Nc6", "Bb5"]
   */
  function extractFirstNMoves(moveText, n) {
    if (!moveText) return [];

    // Remove result markers
    var text = moveText
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove move numbers: "1." or "1..." or "1. "
    var tokens = text.split(/\s+/);
    var moves = [];

    for (var i = 0; i < tokens.length && moves.length < n; i++) {
      var token = tokens[i].replace(/^\d+\.+/, '').trim();
      if (token.length > 0 && !/^\d+$/.test(token)) {
        moves.push(token);
      }
    }

    return moves;
  }

  /**
   * Simple string hash function (djb2 variant).
   * Returns a hex string.
   */
  function stringHash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    // Convert to unsigned hex
    return (hash >>> 0).toString(16);
  }

  // --- Public API ---
  return {
    parsePGN: parsePGN,
    // Exposed for testing / use by extractor
    extractMoveText: extractMoveText,
    generateHash: generateHash,
  };
})();
