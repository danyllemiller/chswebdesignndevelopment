import os
import re

# Folders to scan
TARGET_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

# THE MASTER LIST
# We map specific filename keywords to the EXACT Title you want.
TITLE_MAP = {
    'join-the-developers-guild': 'Chapter 1: Join the Developer\'s Guild (Soft Skills & CTSOs)',
    'decoding-the-web':          'Chapter 1: The Developer's World (Internet vs. Web Structure)',
    'the-rules':                 'Chapter 2: The "Rules" (Web Law, Ethics & Accessibility)',
    'the-who':                   'Chapter 4: The "Who" (User Research & Personas)',
    'the-how':                   'Chapter 5: The "How" (Sitemaps & Wireframing)',
    'ui-ux-design':              'Chapter 6: Intro to UI/UX (Psychology of Design & Figma)',
    'the-bones':                 'Chapter 5: The "Bones" (Intro to HTML)',
    'the-clothes':               'Chapter 6: The "Clothes" (Intro to CSS)',
    'the-style':                 'Chapter 7: The "Style" / Advanced CSS Lab (Flexbox, Grid & Media Queries)',
    'sights-sounds':             'Chapter 8: Sights & Sounds (Media: Images, Video, Audio & Tables)',
    'the-brains':                'Chapter 9: The "Brains" (Intro to JS) (Intro to JavaScript)',
    'the-remodeler':             'Chapter 12: The "Remodeler" (Advanced DOM Manipulation)',
    'the-cloud':                 'Chapter 11: The "Cloud" / Professional Tools (Git, GitHub & Cloud Concepts)',
    'the-manager':               'Chapter 12: The "Manager" (CMS & WordPress)',
    'the-network':               'Chapter 13: The "Network" (APIs, JSON & Fetch)',
    'the-brain-databases':       'Chapter 14: The "Brain" (Databases & SQL)', # specific to avoid confusion w/ 'brains'
    'the-future':                'Chapter 15: The "Future" (Emerging Tech: AI, AR/VR, IoT)',
    'the-launch':                'Chapter 18: The Launch (Deployment: FTP, Netlify & Live Testing)'
}

def update_chapter_titles():
    print("--- Starting Chapter Title Update ---")
    
    for folder in TARGET_FOLDERS:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                # Identify which chapter this is based on filename
                new_title = None
                for key, title in TITLE_MAP.items():
                    if key in filename:
                        new_title = title
                        break
                
                if not new_title:
                    continue

                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # REGEX: Find the existing <h2>Chapter ... </h2>
                # We use re.DOTALL to catch multi-line headers
                # We match <h2> (and any attributes), then "Chapter", then anything until </h2>
                pattern = r'(<h2[^>]*>\s*Chapter[^<]*</h2>)'
                
                if re.search(pattern, content, re.IGNORECASE):
                    # Replace with the NEW title (keeping the simple <h2> tag)
                    replacement = f'<h2>{new_title}</h2>'
                    
                    new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE | re.DOTALL)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"[{filename}] Updated title -> {new_title}")

if __name__ == "__main__":
    update_chapter_titles()