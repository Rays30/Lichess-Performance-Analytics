/**
 * insights.js — Generate human-readable coaching statements from AnalysisResult
 *
 * Input:  AnalysisResult from Analyzer
 * Output: InsightSet with per-category strings + structured insights
 *
 * Dependencies: None (receives computed data)
 * Side effects: None (pure logic)
 */

var Insights = (function () {

  var MIN_GAMES = 5;

  function generateInsights(analysis) {
    var empty = {
      overall: null, color: null, timeControl: null, outcomes: null,
      openings: null, gameLength: null, gamePhase: null,
      allInsights: [], recommendations: [],
      strongestArea: null, weakestArea: null,
      mostReliableOpening: null, mainTarget: null
    };
    if (!analysis) return empty;

    var result = {
      overall:     buildOverall(analysis.overall),
      color:       buildColor(analysis.color),
      timeControl: buildTimeControl(analysis.timeControl),
      outcomes:    buildOutcomes(analysis.outcomes),
      openings:    buildOpenings(analysis.openings),
      gameLength:  buildGameLength(analysis.gameLength, analysis.overall),
      gamePhase:   buildGamePhase(analysis.gamePhase),
      combined:    buildCombined(analysis.combined),
      allInsights: [],
      recommendations: [],
      strongestArea: null,
      weakestArea: null,
      mostReliableOpening: null,
      mainTarget: null
    };

    // Build flat array
    var keys = ['overall', 'color', 'timeControl', 'outcomes', 'openings', 'gameLength', 'gamePhase'];
    for (var i = 0; i < keys.length; i++) {
      if (result[keys[i]]) result.allInsights.push({ category: keys[i], text: result[keys[i]] });
    }

    // Meta-insights for insights page
    buildMetaInsights(result, analysis);

    return result;
  }

  function buildOverall(o) {
    if (!o || o.totalGames === 0) return null;
    return "You've played " + o.totalGames + ' games with a ' + o.winRate +
      '% win rate (' + o.wins + 'W / ' + o.losses + 'L / ' + o.draws + 'D).';
  }

  function buildColor(c) {
    if (!c) return null;
    if (c.white.total === 0 && c.black.total === 0) return null;
    if (c.white.total < 10 && c.black.total < 10) return 'Not enough games as either color for meaningful analysis.';
    if (c.white.total === 0) return 'All games are as Black (' + c.black.winRate + '% win rate).';
    if (c.black.total === 0) return 'All games are as White (' + c.white.winRate + '% win rate).';

    if (c.differential < 3 || c.differential === 'N/A') {
      return 'Performance as White (' + c.white.winRate + '%) and Black (' + c.black.winRate + '%) is balanced.';
    }

    var better = c.bestColor === 'White' ? 'White' : 'Black';
    var worse = better === 'White' ? 'Black' : 'White';
    var betterRate = c[better.toLowerCase()].winRate;
    var worseRate = c[worse.toLowerCase()].winRate;

    var msg = 'You perform better as ' + better + ' (' + betterRate + '%) than ' + worse + ' (' + worseRate + '%).';
    if (worseRate < 45) msg += ' Consider studying ' + worse + ' opening repertoires.';
    return msg;
  }

  function buildTimeControl(tc) {
    if (!tc) return null;
    var buckets = ['Bullet', 'Blitz', 'Rapid', 'Classical'];
    var totalGames = 0;
    for (var i = 0; i < buckets.length; i++) {
      if (tc[buckets[i]]) totalGames += tc[buckets[i]].total;
    }
    if (totalGames < MIN_GAMES) return 'Not enough time control data yet.';

    var lines = [];
    if (tc.best && tc.best !== 'N/A') {
      var bs = tc[tc.best];
      lines.push('Best format: ' + tc.best + ' at ' + bs.winRate + '% (' + bs.total + ' games).');
    }
    if (tc.worst && tc.worst !== 'N/A' && tc.worst !== tc.best) {
      var ws = tc[tc.worst];
      lines.push('Weakest: ' + tc.worst + ' at ' + ws.winRate + '% (' + ws.total + ' games).');
    }
    if (tc.timeoutRisk && tc.timeoutRisk !== 'N/A') {
      var tr = tc[tc.timeoutRisk];
      if (tr && tr.lossCauses && tr.lossCauses.timeout > 2) {
        lines.push('Most timeout losses in ' + tc.timeoutRisk + ' (' + tr.lossCauses.timeout + ' games).');
      }
    }
    return lines.length > 0 ? lines.join(' ') : null;
  }

  function buildOutcomes(out) {
    if (!out) return null;
    var lines = [];
    if (out.mostCommonLoss && out.mostCommonLoss !== 'N/A') {
      var ld = out.losses[out.mostCommonLoss];
      if (ld && ld.count > 0) {
        lines.push('Most common loss: ' + out.mostCommonLoss + ' (' + ld.count + ' times, ' + ld.pct + '% of losses).');
        if (out.mostCommonLoss === 'timeout') lines.push('Time pressure is your biggest weakness — try slower formats or practice time management.');
        else if (out.mostCommonLoss === 'resignation') lines.push('You tend to resign — fighting on sometimes reveals opponent mistakes.');
        else if (out.mostCommonLoss === 'checkmate') lines.push('Focus on defensive tactics and king safety.');
      }
    }
    if (out.mostCommonWin && out.mostCommonWin !== 'N/A') {
      var wd = out.wins[out.mostCommonWin];
      if (wd && wd.count > 0) {
        lines.push('Most common win: ' + out.mostCommonWin + ' (' + wd.count + ' times, ' + wd.pct + '% of wins).');
      }
    }
    return lines.length > 0 ? lines.join(' ') : null;
  }

  function buildOpenings(openings) {
    if (!openings || openings.length === 0) return null;
    var qualified = [];
    for (var i = 0; i < openings.length; i++) {
      if (openings[i].total >= MIN_GAMES && openings[i].name !== 'Unknown') qualified.push(openings[i]);
    }
    if (qualified.length === 0) return 'Not enough data on any single opening yet (need ' + MIN_GAMES + '+ games).';

    var lines = [];
    var best = qualified[0];
    lines.push('Best opening: ' + best.name + ' (' + best.winRate + '% over ' + best.total + ' games).');
    if (qualified.length > 1) {
      var worst = qualified[qualified.length - 1];
      lines.push('Weakest: ' + worst.name + ' (' + worst.winRate + '% over ' + worst.total + ' games).');
      if (worst.winRate < 40) lines.push('Consider studying ' + worst.name + ' or switching to a different line.');
    }
    return lines.join(' ');
  }

  function buildGameLength(gl, overall) {
    if (!gl || !overall || overall.totalGames === 0) return null;
    if (gl.avgWinMoves === 0 && gl.avgLossMoves === 0) return null;

    var lines = [];
    lines.push('Wins average ' + gl.avgWinMoves + ' moves, losses average ' + gl.avgLossMoves + ' moves.');
    if (gl.avgLossMoves > 0 && gl.avgLossMoves < 25)
      lines.push('Losses happen early (avg ' + gl.avgLossMoves + ' moves) — tactical collapses are costing you.');
    if (gl.differential > 15)
      lines.push('Big gap between win length and loss length — consistency is the key area to improve.');
    return lines.join(' ');
  }

  function buildGamePhase(gp) {
    if (!gp) return null;
    var total = gp.opening.count + gp.middlegame.count + gp.endgame.count;
    if (total === 0) return null;

    var lines = [];
    if (gp.mostCommonLossPhase && gp.mostCommonLossPhase !== 'N/A') {
      var phase = gp.mostCommonLossPhase;
      var phaseData = gp[phase];
      if (phaseData && phaseData.losses > 0) {
        lines.push('Most losses occur in the ' + phase + ' (' + phaseData.losses + ' games).');
        if (phase === 'middlegame') lines.push('Your openings are solid — focus on middlegame tactical vision.');
        else if (phase === 'opening') lines.push("You're losing games early — focus on opening principles.");
        else if (phase === 'endgame') lines.push('You reach endgames but struggle to convert — endgame study recommended.');
      }
    }
    lines.push('Phase distribution: ' + gp.opening.pct + '% opening, ' + gp.middlegame.pct + '% middlegame, ' + gp.endgame.pct + '% endgame.');
    return lines.join(' ');
  }

  function buildCombined(cmb) {
    if (!cmb) return null;
    var insights = [];
    
    for (var tc in cmb.colorByTC) {
      if (tc === 'Unknown') continue;
      var c = cmb.colorByTC[tc];
      if (c.white.total >= MIN_GAMES && c.black.total >= MIN_GAMES) {
        var wrW = Math.round((c.white.wins / c.white.total) * 100);
        var wrB = Math.round((c.black.wins / c.black.total) * 100);
        if (Math.abs(wrW - wrB) >= 15) {
           var bestC = wrW > wrB ? 'White' : 'Black';
           var diff = Math.abs(wrW - wrB);
           insights.push('In ' + tc + ' games, you perform significantly better as ' + bestC + ' (+' + diff + '% win rate compared to the other color).');
        }
      }
    }

    for (var tc2 in cmb.outcomeByTC) {
       if (tc2 === 'Unknown') continue;
       var o = cmb.outcomeByTC[tc2];
       var totalLosses = o.losses.checkmate + o.losses.timeout + o.losses.resignation + o.losses.other;
       if (totalLosses >= MIN_GAMES) {
          if ((o.losses.timeout / totalLosses) > 0.3) {
             insights.push('Time management is a critical issue in ' + tc2 + ' (over 30% of your losses are on time).');
          }
       }
    }

    // Check Opening by TC
    for (var op in cmb.openingByTC) {
       if (op === 'Unknown') continue;
       var bestTC = null, bestWinRate = -1, worstTC = null, worstWinRate = 101;
       var playedInMultiple = 0;
       for (var tc3 in cmb.openingByTC[op]) {
          if (tc3 === 'Unknown') continue;
          var opData = cmb.openingByTC[op][tc3];
          if (opData.total >= MIN_GAMES) {
             playedInMultiple++;
             var wr = Math.round((opData.wins / opData.total) * 100);
             if (wr > bestWinRate) { bestWinRate = wr; bestTC = tc3; }
             if (wr < worstWinRate) { worstWinRate = wr; worstTC = tc3; }
          }
       }
       if (playedInMultiple > 1 && Math.abs(bestWinRate - worstWinRate) >= 20) {
          insights.push('The ' + op + ' opening works exceptionally well for you in ' + bestTC + ' (' + bestWinRate + '%), but struggles heavily in ' + worstTC + ' (' + worstWinRate + '%).');
       }
    }
    
    return insights.length > 0 ? insights : null;
  }

  function buildMetaInsights(result, analysis) {
    // Strongest area
    var areas = [];
    if (analysis.timeControl.best !== 'N/A') areas.push({ area: analysis.timeControl.best + ' games', rate: analysis.timeControl[analysis.timeControl.best].winRate });
    if (analysis.color.bestColor !== 'N/A' && analysis.color.bestColor !== 'insufficient data') {
      var bc = analysis.color.bestColor.toLowerCase();
      if (analysis.color[bc]) areas.push({ area: 'Playing as ' + analysis.color.bestColor, rate: analysis.color[bc].winRate });
    }
    var qualifiedOps = analysis.openings.filter(function (o) { return o.total >= MIN_GAMES && o.name !== 'Unknown'; });
    if (qualifiedOps.length > 0) areas.push({ area: qualifiedOps[0].name, rate: qualifiedOps[0].winRate });
    areas.sort(function (a, b) { return b.rate - a.rate; });
    if (areas.length > 0) result.strongestArea = { label: areas[0].area, rate: areas[0].rate };

    // Weakest area
    var weakAreas = [];
    if (analysis.timeControl.worst !== 'N/A') weakAreas.push({ area: analysis.timeControl.worst + ' games', rate: analysis.timeControl[analysis.timeControl.worst].winRate });
    if (qualifiedOps.length > 1) { var w = qualifiedOps[qualifiedOps.length - 1]; weakAreas.push({ area: w.name, rate: w.winRate }); }
    weakAreas.sort(function (a, b) { return a.rate - b.rate; });
    if (weakAreas.length > 0) result.weakestArea = { label: weakAreas[0].area, rate: weakAreas[0].rate };

    // Most reliable opening
    if (qualifiedOps.length > 0) {
      var reliable = qualifiedOps.slice().sort(function (a, b) { return (b.winRate * Math.log(b.total + 1)) - (a.winRate * Math.log(a.total + 1)); });
      result.mostReliableOpening = { label: reliable[0].name, rate: reliable[0].winRate, games: reliable[0].total };
    }

    // Main improvement target
    var targets = [];
    if (analysis.outcomes.mostCommonLoss === 'timeout') targets.push('Time management');
    if (analysis.gamePhase.mostCommonLossPhase === 'opening') targets.push('Opening preparation');
    if (analysis.gamePhase.mostCommonLossPhase === 'endgame') targets.push('Endgame technique');
    if (analysis.gamePhase.mostCommonLossPhase === 'middlegame') targets.push('Middlegame tactics');
    if (weakAreas.length > 0 && weakAreas[0].rate < 40) targets.push(weakAreas[0].area);
    result.mainTarget = targets.length > 0 ? targets[0] : 'Keep playing to identify patterns';

    // Recommendations table
    var recs = [];
    if (analysis.outcomes.mostCommonLoss === 'timeout') recs.push({ issue: 'Frequent timeouts', evidence: analysis.outcomes.losses.timeout.count + ' timeout losses (' + analysis.outcomes.losses.timeout.pct + '%)', focus: 'Practice time management or play longer formats' });
    if (analysis.gamePhase.mostCommonLossPhase !== 'N/A') {
      var p = analysis.gamePhase.mostCommonLossPhase;
      var pd = analysis.gamePhase[p];
      recs.push({ issue: capitalize(p) + ' weakness', evidence: pd.losses + ' losses in ' + p + ' phase', focus: capitalize(p) + ' training exercises' });
    }
    if (analysis.color.bestColor !== 'N/A' && analysis.color.differential > 5) {
      var wc = analysis.color.bestColor === 'White' ? 'Black' : 'White';
      recs.push({ issue: 'Color imbalance', evidence: analysis.color.differential + ' point gap between colors', focus: 'Study ' + wc + ' repertoire' });
    }
    if (qualifiedOps.length > 1) {
      var wo = qualifiedOps[qualifiedOps.length - 1];
      if (wo.winRate < 40) recs.push({ issue: 'Weak opening: ' + wo.name, evidence: wo.winRate + '% over ' + wo.total + ' games', focus: 'Study or switch away from ' + wo.name });
    }
    if (analysis.gameLength.avgLossMoves > 0 && analysis.gameLength.avgLossMoves < 20) recs.push({ issue: 'Early collapses', evidence: 'Avg loss in ' + analysis.gameLength.avgLossMoves + ' moves', focus: 'Focus on opening traps and early tactics' });
    result.recommendations = recs;
  }

  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

  return { generateInsights: generateInsights };
})();
