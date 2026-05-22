import os, re

files = [
    'performance.html', 'time-control.html', 'openings.html',
    'outcomes.html', 'game-length.html', 'game-phase.html',
    'insights.html', 'trends.html', 'streaks.html'
]

svg_templates = {
    'performance.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">BEST COLOR</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="22" fill="var(--text-primary)" font-weight="700">White</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">TOTAL WINS</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-win)" font-weight="700">124</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">TOTAL DRAWS</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-draw)" font-weight="700">22</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">TOTAL LOSSES</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-loss)" font-weight="700">109</text>
            <rect x="16" y="104" width="400" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">White Performance</text>
            <circle cx="216" cy="208" r="60" fill="none" stroke="var(--card-border)" stroke-width="24"/>
            <circle cx="216" cy="208" r="60" fill="none" stroke="var(--color-win)" stroke-width="24" stroke-dasharray="210 377" stroke-dashoffset="94" stroke-linecap="butt"/>
            <text x="216" y="204" text-anchor="middle" font-family="Inter,sans-serif" font-size="20" fill="var(--text-primary)" font-weight="700">58%</text>
            <rect x="432" y="104" width="412" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="444" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Black Performance</text>
            <circle cx="638" cy="208" r="60" fill="none" stroke="var(--card-border)" stroke-width="24"/>
            <circle cx="638" cy="208" r="60" fill="none" stroke="var(--color-win)" stroke-width="24" stroke-dasharray="180 377" stroke-dashoffset="94" stroke-linecap="butt"/>
            <text x="638" y="204" text-anchor="middle" font-family="Inter,sans-serif" font-size="20" fill="var(--text-primary)" font-weight="700">49%</text>
    """,
    'time-control.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">BEST TIME CONTROL</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="22" fill="var(--color-win)" font-weight="700">Rapid</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">MOST PLAYED</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="22" fill="var(--text-primary)" font-weight="700">Blitz</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">HIGHEST VOLUME</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">145</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">TIMEOUT RISK</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="22" fill="var(--color-loss)" font-weight="700">12%</text>
            <rect x="16" y="104" width="400" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Win Rate per Time Control</text>
            <rect x="60" y="240" width="40" height="60" rx="4" fill="var(--color-primary)" opacity="0.9"/>
            <rect x="140" y="160" width="40" height="140" rx="4" fill="var(--color-primary)" opacity="0.9"/>
            <rect x="220" y="190" width="40" height="110" rx="4" fill="var(--color-primary)" opacity="0.9"/>
            <rect x="300" y="260" width="40" height="40" rx="4" fill="var(--color-primary)" opacity="0.9"/>
            <rect x="432" y="104" width="412" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="444" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Loss Cause by Time Control</text>
            <rect x="470" y="180" width="40" height="80" rx="4" fill="var(--color-loss)" opacity="0.9"/>
            <rect x="550" y="150" width="40" height="90" rx="4" fill="var(--color-loss)" opacity="0.9"/>
            <rect x="630" y="170" width="40" height="50" rx="4" fill="var(--color-loss)" opacity="0.9"/>
    """,
    'openings.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">BEST OPENING</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-win)" font-weight="700">Italian Game</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">WORST OPENING</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-loss)" font-weight="700">Caro-Kann</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">MOST PLAYED</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--text-primary)" font-weight="700">Sicilian Def.</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">OPENING DIVERSITY</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">14</text>
            <rect x="16" y="104" width="400" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Win Rate by Opening</text>
            <rect x="28" y="150" width="300" height="24" rx="4" fill="var(--color-win)" opacity="0.8"/>
            <rect x="28" y="186" width="250" height="24" rx="4" fill="var(--color-win)" opacity="0.8"/>
            <rect x="28" y="222" width="180" height="24" rx="4" fill="var(--color-loss)" opacity="0.8"/>
            <rect x="432" y="104" width="412" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="444" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Games Played</text>
            <rect x="444" y="150" width="340" height="24" rx="4" fill="var(--color-primary)" opacity="0.8"/>
            <rect x="444" y="186" width="210" height="24" rx="4" fill="var(--color-primary)" opacity="0.8"/>
            <rect x="444" y="222" width="160" height="24" rx="4" fill="var(--color-primary)" opacity="0.8"/>
    """,
    'outcomes.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">MOST COMMON WIN</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-win)" font-weight="700">Checkmate</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">MOST COMMON LOSS</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-loss)" font-weight="700">Resignation</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">RESIGNATION RATE</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">34%</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">AVG GAME LENGTH</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">38 moves</text>
            <rect x="16" y="104" width="828" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Detailed Outcomes</text>
            <rect x="28" y="160" width="400" height="30" rx="4" fill="var(--color-win)" opacity="0.8"/>
            <rect x="28" y="200" width="300" height="30" rx="4" fill="var(--color-loss)" opacity="0.8"/>
            <rect x="28" y="240" width="100" height="30" rx="4" fill="var(--color-draw)" opacity="0.8"/>
    """,
    'game-length.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">AVERAGE LENGTH</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">38</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">LONGEST GAME</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">112</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">QUICKEST WIN</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-win)" font-weight="700">4</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">SWEET SPOT</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-win)" font-weight="700">20-30 moves</text>
            <rect x="16" y="104" width="828" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Distribution of Games</text>
            <path d="M 60 280 Q 150 280, 250 150 T 450 150 T 750 280" fill="none" stroke="var(--color-primary)" stroke-width="4"/>
    """,
    'game-phase.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">STRONGEST PHASE</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-win)" font-weight="700">Middlegame</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">WEAKEST PHASE</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--color-loss)" font-weight="700">Endgame</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">OPENING MISTAKES</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-loss)" font-weight="700">14%</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">ENDGAME CONVERSIONS</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-win)" font-weight="700">62%</text>
            <rect x="16" y="104" width="828" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Phase Performance</text>
            <rect x="28" y="160" width="700" height="24" rx="4" fill="var(--color-primary)" opacity="0.3"/>
            <rect x="28" y="160" width="300" height="24" rx="4" fill="var(--color-win)" opacity="0.8"/>
            <rect x="28" y="210" width="700" height="24" rx="4" fill="var(--color-primary)" opacity="0.3"/>
            <rect x="28" y="210" width="450" height="24" rx="4" fill="var(--color-win)" opacity="0.8"/>
            <rect x="28" y="260" width="700" height="24" rx="4" fill="var(--color-primary)" opacity="0.3"/>
            <rect x="28" y="260" width="150" height="24" rx="4" fill="var(--color-loss)" opacity="0.8"/>
    """,
    'insights.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="828" height="90" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="36" y="44" font-family="Inter,sans-serif" font-size="16" fill="var(--text-primary)" font-weight="700">Strengths</text>
            <text x="36" y="68" font-family="Inter,sans-serif" font-size="12" fill="var(--text-secondary)">You excel at finding tactical opportunities in the middlegame.</text>
            <rect x="16" y="120" width="828" height="90" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="36" y="148" font-family="Inter,sans-serif" font-size="16" fill="var(--text-primary)" font-weight="700">Weaknesses</text>
            <text x="36" y="172" font-family="Inter,sans-serif" font-size="12" fill="var(--text-secondary)">You often lose time advantage in drawn endgames.</text>
            <rect x="16" y="224" width="828" height="90" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="36" y="252" font-family="Inter,sans-serif" font-size="16" fill="var(--text-primary)" font-weight="700">Recommendations</text>
            <text x="36" y="276" font-family="Inter,sans-serif" font-size="12" fill="var(--text-secondary)">Focus on practicing basic rook and pawn endgames.</text>
    """,
    'trends.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">HIGHEST RATING</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">1840</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">LOWEST RATING</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">1620</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">RATING CHANGE</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-win)" font-weight="700">+42</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">GAMES ANALYZED</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">255</text>
            <rect x="16" y="104" width="828" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Rating Progression</text>
            <path d="M 40 260 L 140 240 L 240 280 L 340 180 L 440 200 L 540 120 L 640 140 L 740 80" fill="none" stroke="var(--color-primary)" stroke-width="4"/>
    """,
    'streaks.html': """
            <rect width="860" height="340" rx="12" fill="var(--card-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <rect x="16" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">LONGEST WIN STREAK</text>
            <text x="28" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-win)" font-weight="700">8</text>
            <rect x="216" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="228" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">LONGEST LOSS STREAK</text>
            <text x="228" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--color-loss)" font-weight="700">5</text>
            <rect x="416" y="16" width="188" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="428" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">CURRENT STREAK</text>
            <text x="428" y="62" font-family="Inter,sans-serif" font-size="20" fill="var(--text-primary)" font-weight="700">2 Wins</text>
            <rect x="616" y="16" width="228" height="72" rx="6" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="628" y="38" font-family="Inter,sans-serif" font-size="9" fill="var(--text-muted)" font-weight="600" letter-spacing="0.5">TOTAL STREAKS</text>
            <text x="628" y="62" font-family="Inter,sans-serif" font-size="26" fill="var(--text-primary)" font-weight="700">14</text>
            <rect x="16" y="104" width="828" height="220" rx="8" fill="var(--input-bg)" stroke="var(--card-border)" stroke-width="1"/>
            <text x="28" y="124" font-family="Inter,sans-serif" font-size="11" fill="var(--text-primary)" font-weight="700">Recent Streaks</text>
            <rect x="40" y="160" width="24" height="24" rx="2" fill="var(--color-win)"/>
            <rect x="68" y="160" width="24" height="24" rx="2" fill="var(--color-win)"/>
            <rect x="96" y="160" width="24" height="24" rx="2" fill="var(--color-win)"/>
            
            <rect x="40" y="200" width="24" height="24" rx="2" fill="var(--color-loss)"/>
            <rect x="68" y="200" width="24" height="24" rx="2" fill="var(--color-loss)"/>
            
            <rect x="40" y="240" width="24" height="24" rx="2" fill="var(--color-win)"/>
            <rect x="68" y="240" width="24" height="24" rx="2" fill="var(--color-win)"/>
            <rect x="96" y="240" width="24" height="24" rx="2" fill="var(--color-win)"/>
            <rect x="124" y="240" width="24" height="24" rx="2" fill="var(--color-win)"/>
    """
}

# Ensure every template has the fade out gradient!
for k in svg_templates:
    svg_templates[k] += '''
            <defs><linearGradient id="fadeOut" x1="0" y1="0" x2="0" y2="1"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="var(--bg-color)"/></linearGradient></defs>
            <rect width="860" height="340" rx="12" fill="url(#fadeOut)"/>
    '''

import codecs

for filename in files:
    if os.path.exists(filename):
        with codecs.open(filename, 'r', 'utf-8') as f:
            content = f.read()

        # Extract the FIRST real page title and subtitle from the main content block
        m_title = re.search(r'<h1 class="page-title">(.*?)</h1>', content)
        m_sub = re.search(r'<p class="page-subtitle">(.*?)</p>', content)
        
        if not m_title or not m_sub:
            print(f"Skipping {filename}: Could not find title/subtitle")
            continue
            
        title = m_title.group(1)
        sub = m_sub.group(1)
        
        # We want to replace everything from <main class="main-content" id="main-content">
        # all the way to <section class="dashboard hidden" id="dashboard">
        
        # But wait, there might be multiple <main class="main-content" id="main-content"> because of the previous bug!
        # Let's completely wipe from the VERY FIRST <main class="main-content" id="main-content"> 
        # to the VERY LAST <section class="dashboard hidden" id="dashboard">
        
        pattern = re.compile(r'<main class="main-content" id="main-content">.*?(<section class="dashboard hidden" id="dashboard">)', re.DOTALL)
        
        custom_svg = svg_templates.get(filename, "")
        
        new_block = f'''<main class="main-content" id="main-content">
    <!-- Welcome banner (shown after import) -->
    <div class="welcome-banner hidden" id="welcome-banner"></div>

    <div class="page-header">
      <div>
        <h1 class="page-title">{title}</h1>
        <p class="page-subtitle">{sub}</p>
      </div>
    </div>

    <!-- Empty state — Hero onboarding -->
    <section class="onboarding-hero" id="empty-state" style="padding-top: 0;">
      <!-- Middle: dashboard preview SVG -->
      <div class="oh-preview" aria-hidden="true" style="margin-top: var(--sp-lg); cursor: default; transform: perspective(1000px) rotateX(2deg);">
        <svg viewBox="0 0 860 340" xmlns="http://www.w3.org/2000/svg" class="oh-preview-svg">
{custom_svg}
        </svg>
      </div>
      
      <div class="oh-ctas" style="margin-top: 32px; margin-bottom: 32px; justify-content: center;">
        <button class="oh-cta oh-cta--primary" id="upload-pgn-btn-hero">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-btn-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span class="oh-cta-body">
            <strong>Import from Lichess</strong>
            <span>Enter your username or upload a PGN file</span>
          </span>
        </button>
        <button class="oh-cta oh-cta--secondary" id="load-demo-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-btn-icon"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span class="oh-cta-body">
            <strong>Try Demo Data</strong>
            <span>See how the dashboard works</span>
          </span>
        </button>
      </div>
    </section>

    \\1'''
        
        # Replace
        new_content = re.sub(pattern, new_block, content, count=1)
        
        with codecs.open(filename, 'w', 'utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filename}")
