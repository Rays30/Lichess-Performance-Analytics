/**
 * analyzer.js — Stats computation from extracted game data
 *
 * Input:  GameData[] from Extractor
 * Output: AnalysisResult with all computed metrics
 *
 * Dependencies: None (receives computed data)
 * Side effects: None (pure logic)
 */

const Analyzer = (function () {
  const MIN_GAMES = 5;

  function calcWinRate(wins, total) {
    if (total === 0) return 0;
    return Math.round((wins / total) * 1000) / 10;
  }

  function getConfidence(total) {
    if (total >= 30) return 'high';
    if (total >= 10) return 'medium';
    return 'low';
  }

  // FEATURE: Streaks page — full streak computation
  function computeStreaks(games) {
    var history = []; // all completed streaks
    var curType = null, curLen = 0, curStart = '', curResults = [], curTCs = [], curColors = [];

    function flushStreak(endDate) {
      if (curLen > 0 && curType) {
        history.push({
          type: curType, length: curLen, startDate: curStart, endDate: endDate,
          results: curResults.slice(), timeControls: curTCs.slice(), colors: curColors.slice()
        });
      }
    }

    games.forEach(function(g) {
      var res = g.result;
      var tc = g.timeControl || 'Unknown';
      var col = g.playerColor || 'unknown';
      var date = g.date || 'Unknown';

      if (res === 'win') {
        if (curType === 'win') {
          curLen++; curResults.push('W'); curTCs.push(tc); curColors.push(col);
        } else {
          if (curType === 'loss') flushStreak(games[games.indexOf(g) - 1] ? games[games.indexOf(g) - 1].date : date);
          curType = 'win'; curLen = 1; curStart = date;
          curResults = ['W']; curTCs = [tc]; curColors = [col];
        }
      } else if (res === 'loss') {
        if (curType === 'loss') {
          curLen++; curResults.push('L'); curTCs.push(tc); curColors.push(col);
        } else {
          if (curType === 'win') flushStreak(games[games.indexOf(g) - 1] ? games[games.indexOf(g) - 1].date : date);
          curType = 'loss'; curLen = 1; curStart = date;
          curResults = ['L']; curTCs = [tc]; curColors = [col];
        }
      } else {
        // Draw breaks both streaks
        if (curType) flushStreak(date);
        curType = null; curLen = 0; curResults = []; curTCs = []; curColors = [];
      }
    });

    // Flush last active streak
    var lastDate = games.length > 0 ? (games[games.length - 1].date || 'Unknown') : 'Unknown';
    if (curLen > 0) flushStreak(lastDate);

    // Longest & current streaks
    var longestWin = { length: 0, startDate: '', endDate: '' };
    var longestLoss = { length: 0, startDate: '', endDate: '' };
    var winStreaks = [], lossStreaks = [];

    history.forEach(function(s) {
      if (s.type === 'win') {
        winStreaks.push(s);
        if (s.length > longestWin.length) longestWin = { length: s.length, startDate: s.startDate, endDate: s.endDate };
      } else {
        lossStreaks.push(s);
        if (s.length > longestLoss.length) longestLoss = { length: s.length, startDate: s.startDate, endDate: s.endDate };
      }
    });

    // Current streak = last entry in history (if it's the last games)
    var currentWin = { length: 0, lastGames: '' };
    var currentLoss = { length: 0, lastGames: '' };
    if (history.length > 0) {
      var last = history[history.length - 1];
      if (last.type === 'win' && last.endDate === lastDate) {
        currentWin = { length: last.length, lastGames: 'Last ' + last.length + ' games' };
      } else if (last.type === 'loss' && last.endDate === lastDate) {
        currentLoss = { length: last.length, lastGames: 'Last ' + last.length + ' game' + (last.length > 1 ? 's' : '') };
      }
    }

    // Total counts + averages
    var totalWinLen = 0, totalLossLen = 0;
    winStreaks.forEach(function(s) { totalWinLen += s.length; });
    lossStreaks.forEach(function(s) { totalLossLen += s.length; });

    // Streak length distribution
    var distribution = {};
    for (var i = 1; i <= 6; i++) distribution[i] = { wins: 0, losses: 0 };
    distribution['7+'] = { wins: 0, losses: 0 };
    history.forEach(function(s) {
      var key = s.length >= 7 ? '7+' : s.length;
      if (s.type === 'win') distribution[key].wins++;
      else distribution[key].losses++;
    });

    // Streaks by time control
    var byTC = {};
    history.forEach(function(s) {
      // Use the most common TC in the streak
      var tcCounts = {};
      s.timeControls.forEach(function(tc) { tcCounts[tc] = (tcCounts[tc] || 0) + 1; });
      var mainTC = 'Unknown';
      var maxC = 0;
      for (var tc in tcCounts) { if (tcCounts[tc] > maxC) { maxC = tcCounts[tc]; mainTC = tc; } }
      if (!byTC[mainTC]) byTC[mainTC] = { longestWin: 0, longestLoss: 0, currentStreak: '' };
      if (s.type === 'win' && s.length > byTC[mainTC].longestWin) byTC[mainTC].longestWin = s.length;
      if (s.type === 'loss' && s.length > byTC[mainTC].longestLoss) byTC[mainTC].longestLoss = s.length;
    });
    // Set current streaks per TC
    if (history.length > 0) {
      var lastS = history[history.length - 1];
      var lastTCCounts = {};
      lastS.timeControls.forEach(function(tc) { lastTCCounts[tc] = (lastTCCounts[tc] || 0) + 1; });
      var lastMainTC = 'Unknown';
      var lastMaxC = 0;
      for (var ltc in lastTCCounts) { if (lastTCCounts[ltc] > lastMaxC) { lastMaxC = lastTCCounts[ltc]; lastMainTC = ltc; } }
      if (byTC[lastMainTC] && lastS.endDate === lastDate) {
        byTC[lastMainTC].currentStreak = (lastS.type === 'win' ? 'W' : 'L') + lastS.length;
      }
    }

    // Streaks by color
    var byColor = { white: { longestWin: 0, longestLoss: 0, currentStreak: '' }, black: { longestWin: 0, longestLoss: 0, currentStreak: '' } };
    history.forEach(function(s) {
      var colorCounts = { white: 0, black: 0 };
      s.colors.forEach(function(c) { if (colorCounts[c] !== undefined) colorCounts[c]++; });
      var mainColor = colorCounts.white >= colorCounts.black ? 'white' : 'black';
      if (s.type === 'win' && s.length > byColor[mainColor].longestWin) byColor[mainColor].longestWin = s.length;
      if (s.type === 'loss' && s.length > byColor[mainColor].longestLoss) byColor[mainColor].longestLoss = s.length;
    });

    // Streaks over time (by month)
    var overTime = {};
    history.forEach(function(s) {
      var month = (s.startDate && s.startDate !== 'Unknown') ? s.startDate.substring(0, 7) : 'Unknown';
      if (!overTime[month]) overTime[month] = { period: month, winMax: 0, lossMax: 0 };
      if (s.type === 'win' && s.length > overTime[month].winMax) overTime[month].winMax = s.length;
      if (s.type === 'loss' && s.length > overTime[month].lossMax) overTime[month].lossMax = s.length;
    });
    var overTimeArr = Object.keys(overTime).sort().map(function(k) { return overTime[k]; });

    return {
      longestWinStreak: longestWin,
      currentWinStreak: currentWin,
      longestLossStreak: longestLoss,
      currentLossStreak: currentLoss,
      totalWinStreaks: { count: winStreaks.length, avgLength: winStreaks.length > 0 ? Math.round((totalWinLen / winStreaks.length) * 10) / 10 : 0 },
      totalLossStreaks: { count: lossStreaks.length, avgLength: lossStreaks.length > 0 ? Math.round((totalLossLen / lossStreaks.length) * 10) / 10 : 0 },
      streakHistory: history.slice().reverse(), // most recent first
      streaksByTimeControl: byTC,
      streaksByColor: byColor,
      streakLengthDistribution: distribution,
      streaksOverTime: overTimeArr
    };
  }

  function analyze(games) {
    if (!games || games.length === 0) return null;

    // 1. OVERALL
    const overall = { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };

    // 2. COLOR
    const color = {
      white: { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgMoves: 0, movesTotal: 0 },
      black: { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgMoves: 0, movesTotal: 0 },
      bestColor: 'N/A', differential: 'N/A'
    };

    // 3. TIME CONTROL
    const tcBuckets = ['Bullet', 'Blitz', 'Rapid', 'Classical', 'Unknown'];
    const timeControl = { best: 'N/A', worst: 'N/A' };
    tcBuckets.forEach(b => {
      timeControl[b] = { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgMoves: 0, movesTotal: 0,
        lossCauses: { checkmate: 0, resignation: 0, timeout: 0, other: 0 } };
    });

    // 4. OPENINGS
    const openingsMap = {};

    // 5. OUTCOMES
    const outcomes = {
      wins: { checkmate: { count: 0, pct: 0 }, resignation: { count: 0, pct: 0 }, timeout: { count: 0, pct: 0 }, other: { count: 0, pct: 0 } },
      losses: { checkmate: { count: 0, pct: 0 }, resignation: { count: 0, pct: 0 }, timeout: { count: 0, pct: 0 }, other: { count: 0, pct: 0 } },
      mostCommonWin: 'N/A', mostCommonLoss: 'N/A'
    };

    // 6. GAME LENGTH
    const glData = { winMovesTotal: 0, winCount: 0, lossMovesTotal: 0, lossCount: 0, longest: 0, shortestLoss: Infinity };
    const lengthBuckets = [
      { label: '1-15', min: 1, max: 15, wins: 0, losses: 0, draws: 0, total: 0 },
      { label: '16-25', min: 16, max: 25, wins: 0, losses: 0, draws: 0, total: 0 },
      { label: '26-35', min: 26, max: 35, wins: 0, losses: 0, draws: 0, total: 0 },
      { label: '36-45', min: 36, max: 45, wins: 0, losses: 0, draws: 0, total: 0 },
      { label: '46-55', min: 46, max: 55, wins: 0, losses: 0, draws: 0, total: 0 },
      { label: '56+', min: 56, max: 9999, wins: 0, losses: 0, draws: 0, total: 0 }
    ];

    // 7. GAME PHASE
    const gpData = {
      opening: { count: 0, wins: 0, losses: 0, draws: 0 },
      middlegame: { count: 0, wins: 0, losses: 0, draws: 0 },
      endgame: { count: 0, wins: 0, losses: 0, draws: 0 }
    };

    // 8. GAMES BY MONTH
    const gamesByMonth = {};

    // 8.5 COMBINED INSIGHTS
    const combined = {
      colorByTC: {}, 
      openingByTC: {}, 
      outcomeByTC: {} 
    };

    // 9. RECENT GAMES (keep last 10)
    const sortedByDate = games.slice().sort((a, b) => {
      if (!a.date || a.date === 'Unknown') return 1;
      if (!b.date || b.date === 'Unknown') return -1;
      return b.date.localeCompare(a.date);
    });
    const recentGames = sortedByDate.slice(0, 10);

    // 10. TRENDS DATA (STREAKS) — FEATURE: Streaks page
    const sortedChronological = sortedByDate.slice().reverse();
    const streaks = computeStreaks(sortedChronological);

    const dayOfWeek = {
      Monday: { total: 0, wins: 0 }, Tuesday: { total: 0, wins: 0 }, Wednesday: { total: 0, wins: 0 },
      Thursday: { total: 0, wins: 0 }, Friday: { total: 0, wins: 0 }, Saturday: { total: 0, wins: 0 }, Sunday: { total: 0, wins: 0 }
    };

    // Confidence
    const confidence = { overall: 'low', color: {}, timeControl: {}, openings: {}, outcomes: 'low' };

    // === PASS 1: Accumulate ===
    games.forEach(g => {
      const mc = g.moveCount || 0;
      const res = g.result;
      const oType = g.outcomeType || 'other';

      // OVERALL
      overall.totalGames++;
      if (res === 'win') overall.wins++;
      else if (res === 'loss') overall.losses++;
      else overall.draws++;

      // COLOR
      if (g.playerColor === 'white' || g.playerColor === 'black') {
        const cs = color[g.playerColor];
        cs.total++; cs.movesTotal += mc;
        if (res === 'win') cs.wins++;
        else if (res === 'loss') cs.losses++;
        else cs.draws++;
      }

      // TIME CONTROL
      const tcKey = g.timeControl || 'Unknown';
      if (timeControl[tcKey]) {
        const tc = timeControl[tcKey];
        tc.total++; tc.movesTotal += mc;
        if (res === 'win') tc.wins++;
        else if (res === 'loss') {
          tc.losses++;
          if (tc.lossCauses[oType] !== undefined) tc.lossCauses[oType]++;
          else tc.lossCauses.other++;
        }
        else tc.draws++;
      }

      // OPENINGS
      const opName = g.opening || 'Unknown';
      if (!openingsMap[opName]) {
        openingsMap[opName] = { name: opName, total: 0, wins: 0, losses: 0, draws: 0 };
      }
      openingsMap[opName].total++;
      if (res === 'win') openingsMap[opName].wins++;
      else if (res === 'loss') openingsMap[opName].losses++;
      else openingsMap[opName].draws++;

      // OUTCOMES
      if (res === 'win') {
        if (outcomes.wins[oType]) outcomes.wins[oType].count++;
        else outcomes.wins.other.count++;
      } else if (res === 'loss') {
        if (outcomes.losses[oType]) outcomes.losses[oType].count++;
        else outcomes.losses.other.count++;
      }

      // COMBINED
      if (!combined.colorByTC[tcKey]) combined.colorByTC[tcKey] = { white: { total: 0, wins: 0 }, black: { total: 0, wins: 0 } };
      if (g.playerColor === 'white' || g.playerColor === 'black') {
        combined.colorByTC[tcKey][g.playerColor].total++;
        if (res === 'win') combined.colorByTC[tcKey][g.playerColor].wins++;
      }

      if (!combined.openingByTC[opName]) combined.openingByTC[opName] = {};
      if (!combined.openingByTC[opName][tcKey]) combined.openingByTC[opName][tcKey] = { total: 0, wins: 0 };
      combined.openingByTC[opName][tcKey].total++;
      if (res === 'win') combined.openingByTC[opName][tcKey].wins++;

      if (!combined.outcomeByTC[tcKey]) combined.outcomeByTC[tcKey] = { wins: { checkmate: 0, timeout: 0, resignation: 0, other: 0 }, losses: { checkmate: 0, timeout: 0, resignation: 0, other: 0 } };
      if (res === 'win') {
        if (combined.outcomeByTC[tcKey].wins[oType] !== undefined) combined.outcomeByTC[tcKey].wins[oType]++;
        else combined.outcomeByTC[tcKey].wins.other++;
      } else if (res === 'loss') {
        if (combined.outcomeByTC[tcKey].losses[oType] !== undefined) combined.outcomeByTC[tcKey].losses[oType]++;
        else combined.outcomeByTC[tcKey].losses.other++;
      }

      // GAME LENGTH
      if (mc > glData.longest) glData.longest = mc;
      if (res === 'win') { glData.winMovesTotal += mc; glData.winCount++; }
      else if (res === 'loss') { glData.lossMovesTotal += mc; glData.lossCount++; if (mc > 0 && mc < glData.shortestLoss) glData.shortestLoss = mc; }

      // LENGTH BUCKETS
      for (let i = 0; i < lengthBuckets.length; i++) {
        const lb = lengthBuckets[i];
        if (mc >= lb.min && mc <= lb.max) {
          lb.total++;
          if (res === 'win') lb.wins++;
          else if (res === 'loss') lb.losses++;
          else lb.draws++;
          break;
        }
      }

      // GAME PHASE
      let phase = 'opening';
      if (mc > 10 && mc <= 40) phase = 'middlegame';
      else if (mc > 40) phase = 'endgame';
      gpData[phase].count++;
      if (res === 'win') gpData[phase].wins++;
      else if (res === 'loss') gpData[phase].losses++;
      else gpData[phase].draws++;

      // GAMES BY MONTH
      if (g.date && g.date !== 'Unknown') {
        const month = g.date.substring(0, 7);
        if (!gamesByMonth[month]) gamesByMonth[month] = { wins: 0, losses: 0, draws: 0, total: 0, eloSum: 0, eloCount: 0, tc: {} };
        gamesByMonth[month].total++;
        if (res === 'win') gamesByMonth[month].wins++;
        else if (res === 'loss') gamesByMonth[month].losses++;
        else gamesByMonth[month].draws++;

        const tck = g.timeControl || 'Unknown';
        if (!gamesByMonth[month].tc[tck]) gamesByMonth[month].tc[tck] = { total: 0, wins: 0 };
        gamesByMonth[month].tc[tck].total++;
        if (res === 'win') gamesByMonth[month].tc[tck].wins++;

        if (g.playerRating && !isNaN(g.playerRating)) {
          gamesByMonth[month].eloSum += parseInt(g.playerRating, 10);
          gamesByMonth[month].eloCount++;
        }

        const dateObj = new Date(g.date.replace(/\./g, '-'));
        if (!isNaN(dateObj)) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = days[dateObj.getDay()];
          dayOfWeek[dayName].total++;
          if (res === 'win') dayOfWeek[dayName].wins++;
        }
      }
    });

    // === PASS 2: Derived metrics ===

    // Overall
    overall.winRate = calcWinRate(overall.wins, overall.totalGames);
    confidence.overall = getConfidence(overall.totalGames);

    // Color
    color.white.winRate = calcWinRate(color.white.wins, color.white.total);
    color.black.winRate = calcWinRate(color.black.wins, color.black.total);
    color.white.avgMoves = color.white.total > 0 ? Math.round(color.white.movesTotal / color.white.total) : 0;
    color.black.avgMoves = color.black.total > 0 ? Math.round(color.black.movesTotal / color.black.total) : 0;
    confidence.color.white = getConfidence(color.white.total);
    confidence.color.black = getConfidence(color.black.total);

    if (color.white.total >= 10 && color.black.total >= 10) {
      if (color.white.winRate > color.black.winRate) color.bestColor = 'White';
      else if (color.black.winRate > color.white.winRate) color.bestColor = 'Black';
      else color.bestColor = 'Equal';
      color.differential = Math.abs(color.white.winRate - color.black.winRate).toFixed(1);
    }

    // Time Control
    let bestTC = { name: 'N/A', rate: -1 }, worstTC = { name: 'N/A', rate: 101 };
    let highestVolTC = { name: 'N/A', count: -1 }, timeoutRiskTC = { name: 'N/A', count: -1 };

    tcBuckets.forEach(b => {
      const tc = timeControl[b];
      tc.winRate = calcWinRate(tc.wins, tc.total);
      tc.avgMoves = tc.total > 0 ? Math.round(tc.movesTotal / tc.total) : 0;
      confidence.timeControl[b] = getConfidence(tc.total);

      if (tc.total >= MIN_GAMES) {
        if (tc.winRate > bestTC.rate) { bestTC.rate = tc.winRate; bestTC.name = b; }
        if (tc.winRate < worstTC.rate) { worstTC.rate = tc.winRate; worstTC.name = b; }
      }
      if (tc.total > highestVolTC.count) { highestVolTC.count = tc.total; highestVolTC.name = b; }
      if (tc.lossCauses.timeout > timeoutRiskTC.count) { timeoutRiskTC.count = tc.lossCauses.timeout; timeoutRiskTC.name = b; }
    });
    timeControl.best = bestTC.name;
    timeControl.worst = worstTC.name;
    timeControl.highestVolume = highestVolTC.name;
    timeControl.timeoutRisk = timeoutRiskTC.name;

    // Openings
    const openingsArr = [];
    let mostPlayedOp = { name: 'N/A', total: 0 };
    for (const key in openingsMap) {
      const o = openingsMap[key];
      o.winRate = calcWinRate(o.wins, o.total);
      o.confidence = getConfidence(o.total);
      openingsArr.push(o);
      if (o.total > mostPlayedOp.total && o.name !== 'Unknown') { mostPlayedOp = { name: o.name, total: o.total }; }
    }
    openingsArr.sort((a, b) => b.winRate - a.winRate || b.total - a.total);

    // Outcomes
    const wTotal = overall.wins, lTotal = overall.losses;
    let maxWCount = -1, maxLCount = -1;
    ['checkmate', 'resignation', 'timeout', 'other'].forEach(type => {
      if (wTotal > 0) outcomes.wins[type].pct = Math.round((outcomes.wins[type].count / wTotal) * 100);
      if (lTotal > 0) outcomes.losses[type].pct = Math.round((outcomes.losses[type].count / lTotal) * 100);
      if (outcomes.wins[type].count > maxWCount && outcomes.wins[type].count > 0) { maxWCount = outcomes.wins[type].count; outcomes.mostCommonWin = type; }
      if (outcomes.losses[type].count > maxLCount && outcomes.losses[type].count > 0) { maxLCount = outcomes.losses[type].count; outcomes.mostCommonLoss = type; }
    });
    confidence.outcomes = getConfidence(wTotal + lTotal);

    // Game Length
    const gameLength = {
      avgWinMoves: glData.winCount > 0 ? Math.round(glData.winMovesTotal / glData.winCount) : 0,
      avgLossMoves: glData.lossCount > 0 ? Math.round(glData.lossMovesTotal / glData.lossCount) : 0,
      differential: 0,
      longest: glData.longest,
      shortestLoss: glData.shortestLoss === Infinity ? 0 : glData.shortestLoss,
      buckets: lengthBuckets.map(lb => ({
        label: lb.label, wins: lb.wins, losses: lb.losses, draws: lb.draws, total: lb.total,
        winRate: calcWinRate(lb.wins, lb.total)
      }))
    };
    gameLength.differential = Math.abs(gameLength.avgWinMoves - gameLength.avgLossMoves);

    // Game Phase
    const totalPhase = gpData.opening.count + gpData.middlegame.count + gpData.endgame.count;
    const gamePhase = {
      opening: { count: gpData.opening.count, wins: gpData.opening.wins, losses: gpData.opening.losses, draws: gpData.opening.draws, pct: 0, winRate: 0 },
      middlegame: { count: gpData.middlegame.count, wins: gpData.middlegame.wins, losses: gpData.middlegame.losses, draws: gpData.middlegame.draws, pct: 0, winRate: 0 },
      endgame: { count: gpData.endgame.count, wins: gpData.endgame.wins, losses: gpData.endgame.losses, draws: gpData.endgame.draws, pct: 0, winRate: 0 },
      mostCommonLossPhase: 'N/A'
    };
    if (totalPhase > 0) {
      ['opening', 'middlegame', 'endgame'].forEach(p => {
        gamePhase[p].pct = Math.round((gamePhase[p].count / totalPhase) * 100);
        gamePhase[p].winRate = calcWinRate(gamePhase[p].wins, gamePhase[p].count);
      });
    }
    const phaseLosses = [
      { phase: 'opening', count: gpData.opening.losses },
      { phase: 'middlegame', count: gpData.middlegame.losses },
      { phase: 'endgame', count: gpData.endgame.losses }
    ];
    phaseLosses.sort((a, b) => b.count - a.count);
    if (phaseLosses[0].count > 0) gamePhase.mostCommonLossPhase = phaseLosses[0].phase;

    // Games by month - sorted
    const monthKeys = Object.keys(gamesByMonth).sort();
    const gamesByMonthArr = monthKeys.map(k => {
      const g = gamesByMonth[k];
      return { 
        month: k, 
        ...g, 
        winRate: calcWinRate(g.wins, g.total),
        avgElo: g.eloCount > 0 ? Math.round(g.eloSum / g.eloCount) : null,
        tc: g.tc
      };
    });

    // Opening diversity
    const uniqueOpenings = Object.keys(openingsMap).filter(k => k !== 'Unknown').length;

    return {
      overall,
      color,
      timeControl,
      openings: openingsArr,
      outcomes,
      gameLength,
      gamePhase,
      confidence,
      recentGames,
      combined,
      streaks,
      gamesByMonth: gamesByMonthArr,
      mostPlayedOpening: mostPlayedOp,
      openingDiversity: uniqueOpenings,
      dayOfWeek
    };
  }

  return { analyze };
})();
