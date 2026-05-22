import os
import re

# Folders to scan
TARGET_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

# THE SUPER LOADER
# 1. Cache Busting (?v=Date) forces the browser to get the NEW footer.
# 2. Script Cloning forces the browser to EXECUTE the Javascript inside the footer.
SUPER_LOADER = """

"""

def fix_footer_connection():
    print("--- Installing Super Loader on All Pages ---")
    
    for folder in TARGET_FOLDERS:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                modified = False

                # 1. REMOVE OLD LOADERS (Clean up the mess)
                # We look for common patterns of previous loaders we tried
                old_patterns = [
                    r'<script>\s*fetch\("/includes/footer\.html"\).*?</script>',
                    r'.*?<script>.*?</script>',
                    r'.*?<script>.*?</script>'
                ]
                
                for pattern in old_patterns:
                    if re.search(pattern, content, re.DOTALL):
                        content = re.sub(pattern, '', content, flags=re.DOTALL)
                        modified = True
                        print(f"[{filename}] Removed old loader.")

                # 2. INSTALL SUPER LOADER
                # We put it right before the closing body tag
                if "<a href="#" class="back-to-top text-decoration-none" title="Back to Top">🚀</a>
</body>" in content:
                    content = content.replace("<a href="#" class="back-to-top text-decoration-none" title="Back to Top">🚀</a>
</body>", f"\n{SUPER_LOADER}\n<a href="#" class="back-to-top text-decoration-none" title="Back to Top">🚀</a>
</body>")
                    modified = True
                    print(f"[{filename}] Installed Super Loader.")
                
                if modified:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)

if __name__ == "__main__":
    fix_footer_connection()