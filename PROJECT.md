markdown
# PROJECT.md — Personal Chess Analytics Platform

---

## Section 0: AI Instructions

- This is a personal project, not a startup MVP. Keep it simple. Working > perfect.
- No backend. No database. No auth. No APIs. Single-page frontend app only.
- Build in phases. Each phase must produce a working, usable app. Stop and use it before deciding if the next phase is needed.
- Never proceed to the next phase without explicit user trigger.
- One task per session. Minimal diffs. Do not refactor unrelated code.
- Do not introduce new tech or libraries without explicit justification.
- Sycophancy is forbidden — if something is wrong, say so directly.

---

## Section 3: Features & Priorities

### Phase 1 — Core Build (Must-Have)
- [ ] PGN input via textarea with processing feedback
- [ ] Multi-game parsing with error handling (skip broken games, don't crash)
- [ ] Duplicate detection (hash on date + moves)
- [ ] Game data extraction: result, color, time control, opening, moves, date, outcome type
- [ ] Opening detection: use PGN tag if present, otherwise "Unknown"
- [ ] Basic dashboard: total games, win rate, wins/losses/draws
- [ ] White vs Black analysis with insight statement
- [ ] Time control analysis with insight statement
- [ ] Opening performance with insight statement
- [ ] Game outcome analysis (checkmate, resignation, timeout, other)
- [ ] Average game length (moves in wins vs losses)
- [ ] Game phase approximation (opening 1-10, middlegame 11-40, endgame 41+) — labeled as approximation
- [ ] Data confidence labels: High (30+), Medium (10-29), Low (<10 — suppress)
- [ ] Insight Layer — human-readable coaching statements
- [ ] Empty state before first upload
- [ ] Clear all data button with confirmation
- [ ] JSON export/import for backup
- [ ] Dark/light mode toggle with localStorage persistence
- [ ] Responsive design (mobile-first)

### Phase 2A — Layer On
- [ ] Win rate trends over time (by week/month)
- [ ] Games played over time
- [ ] Combined insights (time control + outcome, opening + time control, color + time control)

### Phase 2B — Optional Polish
- [ ] Streak detection with tilt analysis
- [ ] Day-of-week performance patterns
- [ ] Opponent rating band analysis (if Elo in PGN)

### Future (Do Not Build Yet)
- [ ] Stockfish move accuracy & blunder detection
- [ ] Opening depth analysis
- [ ] Cloud storage / user accounts

---

## Section 4: Tech Stack (LOCKED)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | HTML, CSS, JavaScript | Single file. No frameworks. No build tools. |
| Storage | localStorage (dev) → flat JSON file (deploy) | No database |
| Chess Engine | None | Intentionally excluded from MVP |
| Hosting | Static hosting (Vercel, Netlify, GitHub Pages) | No server required |

**Locked decisions:**
- No React, Vue, or any JS framework — vanilla JS only
- No backend language — no Node.js, Python, or server runtime
- No database — no Firebase, Supabase, SQLite, MongoDB
- No Stockfish — engine analysis is Future, not now

---

## Section 5: Architecture Type

**Single-page frontend application.** All logic runs in the browser.
┌─────────────────────────────────────────┐
│ BROWSER │
│ │
│ PGN Input → Parser → Extractor │
│ ↓ │
│ Analyzer │
│ ↓ │
│ Insight Generator │
│ ↓ │
│ UI Render │
│ ↓ │
│ localStorage │
│ ↓ │
│ JSON Export/Import │
└─────────────────────────────────────────┘

text

**Data flow is unidirectional:** Input → Parse → Extract → Analyze → Insights → Render
**No circular dependencies allowed.**
**No external API calls.**

---

## Section 6: Module Structure

| Module | Responsibility | Depends On |
|--------|---------------|------------|
| `parser.js` | PGN parsing, multi-game split, error handling, duplicate detection | Nothing |
| `extractor.js` | Extract structured data from parsed games | parser |
| `analyzer.js` | Run all analysis modules, apply confidence logic | extractor |
| `insights.js` | Generate human-readable coaching statements | analyzer |
| `storage.js` | localStorage CRUD, JSON export/import, dark mode preference | Nothing |
| `ui.js` | DOM updates, rendering, dark/light mode, responsive behavior | analyzer, insights, storage |
| `app.js` | Initialize app, wire modules together | All of the above |

**Rules:**
- One module = one responsibility
- No circular dependencies
- Business logic never touches the DOM
- UI module never contains analysis logic

---

## Section 11: Performance Targets

| Metric | Target |
|--------|--------|
| PGN parsing (100 games) | < 2 seconds |
| UI render after parse | < 500ms |
| localStorage read/write | Instant (< 50ms) |
| Initial page load | < 3 seconds |

---

## Section 14: Known Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| PGN format variations | Parser fails on some files | Test with Lichess exports |
| localStorage size limits (5-10MB) | Data loss on very large libraries | Export backup button |
| Browser cache clear wipes data | User loses all games | JSON export is the recovery path |
| No opening tag in PGN | Opening shows "Unknown" | Accept it. Do not build opening detection from moves yet. |
| Duplicate uploads skew stats | Wrong win rates | Duplicate detection by date+moves hash |

---

## Section 16: Environment Variables

None required. This is a static HTML file. No API keys. No secrets.

If deploying to a static host, no environment configuration is needed.

---

## Design Decisions Log

| Decision | Reason | Tradeoff |
|----------|--------|----------|
| No framework (vanilla JS) | Zero build step, instant deploy, no dependency hell | Less developer convenience |
| No database (localStorage) | 100 games ≈ 30KB. DB is overkill at this scale. | Data tied to one browser |
| No Stockfish | Engine analysis is complex to deploy and less actionable than behavioral insights at this stage | No move accuracy data |
| Opening = PGN tag or "Unknown" | Detecting from moves requires an opening book — hidden complexity | Some openings show as Unknown |
| Game phase by move count only | True phase detection needs engine evaluation | Approximation, clearly labeled |
| Single HTML file | Simplest possible deployment | Large file, harder to maintain as it grows |

---

## PROGRESS TRACKER

### UI Redesign (v2) — Completed
| Phase | State | Notes |
|-------|-------|-------|
| 1. Planning & Audit | ✅ DONE | Evaluated legacy UI and defined Zinc-based design system |
| 2. Core Tokens | ✅ DONE | Migrated to semantic CSS variables, retired legacy Lichess hexes |
| 3. Component Refactor | ✅ DONE | Upgraded tables, cards, and stat blocks to new aesthetic |
| 4. Chart Data Layer | ✅ DONE | Dynamically wired Chart.js config to CSS semantic tokens |
| 5. UX Polish | ✅ DONE | Added modal animations, button states, and polished empty states |
| 6. Responsive Audit | ✅ DONE | Implemented mobile touch targets (44px) and safe horizontal bounds |

### Phase 1 — Core Build
| Module | State | Notes |
|--------|-------|-------|
| Project setup | ✅ DONE | 9 files: index.html, style.css, 7 JS modules |
| PGN parser | ✅ DONE | Split, clean, validate, dedup via djb2 hash |
| Game data extraction | ✅ DONE | Tags, color, TC buckets, outcome, phase |
| Analysis modules | ✅ DONE | Overall, color, TC, openings, outcomes, length, phase, confidence |
| Insight layer | ✅ DONE | 7 categories, actionable advice, confidence-aware |
| UI + dark/light mode | ✅ DONE | Dashboard rendering, theme toggle |
| Storage + data management | ✅ DONE | IIFE module: CRUD, export/import, theme, username |
| Empty/loading/error states | ✅ DONE | PGN modal feedback, empty state handling |
| Responsive design | ✅ DONE | Mobile menu toggle, stacking cards |

### Phase 2A — Layer On
| Module | State | Notes |
|--------|-------|-------|
| Performance trends | ✅ DONE | `trends.html` created, integrates Chart.js via CDN |
| Combined insights | ✅ DONE | Extracted in `analyzer.js`, generated in `insights.js`, UI added to `insights.html` |

### Phase 2B — Optional Polish
| Module | State | Notes |
|--------|-------|-------|
| Streak detection | ✅ DONE | `streaks.html` with filters, charts, tables, insights |
| Day-of-week analysis | NOT STARTED | |
| Opponent rating bands | NOT STARTED | |

### Future
| Module | State | Notes |
|--------|-------|-------|
| Stockfish integration | NOT STARTED | |
| Opening depth analysis | NOT STARTED | |
| Cloud storage | NOT STARTED | |

---

## Data Confidence Thresholds

| Label | Games | Behavior |
|-------|-------|----------|
| High confidence | 30+ | Show insight normally |
| Medium confidence | 10–29 | Show insight, append "(limited sample)" |
| Low confidence | <10 | Suppress insight or show "(insufficient data)" |

---

## Edge Cases to Handle

- [ ] Empty PGN input → show empty state, don't crash
- [ ] Malformed PGN → skip broken game, continue parsing others, show warning count
- [ ] Duplicate game → skip, show duplicate count
- [ ] PGN with no date tag → still parse, label date as "Unknown"
- [ ] PGN with no time control tag → attempt detection from time stamps, fallback to "Unknown"
- [ ] PGN with no opening tag → label as "Unknown"
- [ ] PGN with no termination tag → label as "Other"
- [ ] localStorage full → warn user, suggest export
- [ ] Import invalid JSON → show error, don't corrupt existing data
- [ ] First visit (no localStorage data) → show empty state