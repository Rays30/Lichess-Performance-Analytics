# ♞ Lichess Performance Analytics

A browser-based analytics dashboard that turns raw chess game data into actionable performance insights — no server, no signup, no dependencies.

[🔴 Live Demo](https://lichess-performance-analytics.vercel.app) · [GitHub](https://github.com/rays30/lichess-performance-analytics)

---

## Why I Built This

I play chess online and wanted to understand my patterns — not just my win rate, but *why* I win and lose. Which openings actually work for me? Am I worse with Black? Do I lose more to timeouts in Bullet? Most chess platforms show you a number. I wanted the analysis behind the number.

This project is my answer to that question, built entirely from scratch.

## What It Demonstrates

This isn't a to-do app. It's a data pipeline that runs in your browser:

- **Data parsing** — Ingests PGN exports from Lichess, handles malformed records, and deduplicates via hashing
- **Data transformation** — Extracts structured fields (result, color, time control, opening, outcome type, game phase) from unstructured text
- **Behavioral pattern analysis** — Surfaces performance splits across 8 dimensions: color, time control, openings, outcomes, game length, game phase, streaks, and trends over time
- **Cross-category correlations** — Discovers complex multi-dimensional insights (e.g. "You lose significantly more games on time in Bullet when playing Black vs White")
- **Insight generation** — Produces human-readable coaching statements like *"You resign too early — fighting on sometimes reveals opponent mistakes"*
- **Confidence thresholds** — Every metric is tagged High / Medium / Low based on sample size. Small samples get flagged, not hidden

## How to Use It

1. Open the app and click **Upload PGN** (or try **Load Demo Data** to see it instantly)
2. Enter your username and click **Import from Lichess** to fetch your recent games instantly, or paste a raw PGN export
3. Navigate the 9 dashboard pages to explore your performance metrics and visualizations
4. Export your data as JSON anytime — your games live in your browser, not on a server

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | HTML, CSS, JavaScript |
| Visualizations | Chart.js (via CDN) |
| Storage | localStorage |
| Backend | None |

I deliberately avoided React and complex build tools. The goal was to prove I can architect a multi-module application from scratch. Every module (parser, extractor, analyzer, insight engine, UI) has a single responsibility and zero circular dependencies.

## What I Learned

**Data quality is the real problem.** PGN files from different platforms use different tag names, date formats, and termination strings. Half the engineering work was normalizing messy input — which mirrors real-world data work more than any textbook exercise.

**Sample size changes everything.** Early versions showed insights on 3 games and the conclusions were meaningless. Adding confidence thresholds was a small code change but a big analytical improvement.

**Constraints force better design.** No framework meant I had to think carefully about module boundaries, data flow, and state management. The result is code I can actually explain in an interview.

---

*Built by hand. No frameworks. No AI-generated analysis. Just data, logic, and curiosity.*

---

> **Stack:** HTML · CSS · Vanilla JS · Chart.js · localStorage · Zero build tools