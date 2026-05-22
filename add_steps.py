import os, re

files = [
    'performance.html', 'time-control.html', 'openings.html',
    'outcomes.html', 'game-length.html', 'game-phase.html',
    'insights.html', 'trends.html', 'streaks.html'
]

oh_steps_html = """
      <!-- Progressive Flow Steps -->
      <div class="oh-steps" style="margin-top: 24px;">
        <div class="oh-step">
          <div class="oh-step-num">1</div>
          <div class="oh-step-text"><strong>Export from Lichess</strong><br>Grab your games in PGN format.</div>
        </div>
        <div class="oh-step">
          <div class="oh-step-num">2</div>
          <div class="oh-step-text"><strong>Drop them here</strong><br>No account or signup needed.</div>
        </div>
        <div class="oh-step">
          <div class="oh-step-num">3</div>
          <div class="oh-step-text"><strong>Get instant insights</strong><br>Everything runs privately in your browser.</div>
        </div>
      </div>
"""

import codecs

for filename in files:
    if os.path.exists(filename):
        with codecs.open(filename, 'r', 'utf-8') as f:
            content = f.read()

        # Find </section> that closes onboarding-hero
        # We can just look for the end of oh-ctas div and insert it right after
        
        pattern = re.compile(r'(</div>\s*)</section>\s*<section class="dashboard hidden" id="dashboard">', re.DOTALL)
        
        new_content = pattern.sub(r'\1' + oh_steps_html + r'</section>\n\n    <section class="dashboard hidden" id="dashboard">', content)
        
        with codecs.open(filename, 'w', 'utf-8') as f:
            f.write(new_content)
        print(f"Added steps to {filename}")
