import os, re

# Read the preview block from index.html
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    preview_block = "".join(lines[141:244])

# The files to update
files = [
    'performance.html', 'time-control.html', 'openings.html',
    'outcomes.html', 'game-length.html', 'game-phase.html',
    'insights.html', 'trends.html', 'streaks.html'
]

for filename in files:
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We need to find the existing <!-- Section Live Preview --> block and replace it
        pattern = re.compile(r'        <!-- Section Live Preview -->\n        <div class="oh-preview".*?</div>\n', re.DOTALL)
        
        new_content = re.sub(pattern, "        <!-- Section Live Preview -->\n" + preview_block, content)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filename}')
