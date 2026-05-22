import os
import re

# CONFIGURATION
# We look in these folders to find the files
SEARCH_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

# THE MASTER ORDER
# This defines the EXACT sequence of your course.
# 'key': A unique part of the filename to identify it.
# 'text': The short text to show in the button (e.g. "2: The 'What'")
CHAPTER_ORDER = [
    {'key': 'join-the-developers-guild', 'text': '1: Join the Guild'},
    {'key': 'decoding-the-web',          'text': '1: The Developer's World'},
    {'key': 'the-rules',                 'text': '2: The "Rules"'},
    {'key': 'the-who',                   'text': '4: The "Who"'},
    {'key': 'the-how',                   'text': '5: The "How"'},
    {'key': 'ui-ux-design',              'text': '6: Intro to UI/UX'},
    {'key': 'the-bones',                 'text': '7: The "Bones" (HTML)'},
    {'key': 'the-clothes',               'text': '6: The "Clothes" (CSS)'},
    {'key': 'the-style',                 'text': '7: The "Style" (Adv CSS)'},
    {'key': 'sights-sounds',             'text': '10: Sights & Sounds'},
    {'key': 'the-brains',                'text': '9: The "Brains" (Intro to JS) (JS)'},
    {'key': 'the-remodeler',             'text': '12: The "Remodeler"'},
    {'key': 'the-cloud',                 'text': '11: The "Cloud"'},
    {'key': 'the-manager',               'text': '14: The "Manager"'},
    {'key': 'the-network',               'text': '13: The "Network"'},
    {'key': 'the-brain-databases',       'text': '14: The "Brain" (DB)'},
    {'key': 'the-future',                'text': '17: The "Future"'},
    {'key': 'the-launch',                'text': '18: The Launch'}
]

def find_file(partial_name):
    """Finds the full path and folder for a given partial filename."""
    # We prioritize year1/year2 for the source of truth
    for folder in ['year1', 'year2']:
        if not os.path.exists(folder): continue
        for fname in os.listdir(folder):
            if partial_name in fname and fname.endswith('.html'):
                return folder, fname
    return None, None

def fix_nav_links_renumbered():
    print("--- Starting Chain Link Repair ---")
    
    # 1. PRE-CALCULATE THE CHAIN
    # We build a list of full info for all 18 chapters
    chain = []
    for item in CHAPTER_ORDER:
        folder, filename = find_file(item['key'])
        if filename:
            chain.append({
                'folder': folder,
                'filename': filename,
                'text': item['text']
            })
        else:
            print(f"⚠️ Warning: Could not find file for '{item['key']}'. Skipping this link.")
            chain.append(None) # Placeholder to keep index correct

    # 2. ITERATE AND FIX
    # We go through the chain. For item [i], we fix links to [i-1] and [i+1].
    for i, current in enumerate(chain):
        if not current: continue
        
        # Identify Neighbors
        prev_chapter = chain[i-1] if i > 0 else None
        next_chapter = chain[i+1] if i < len(chain) - 1 else None
        
        # Construct Paths (Absolute paths are safest: /year1/file.html)
        prev_href = f"/{prev_chapter['folder']}/{prev_chapter['filename']}" if prev_chapter else "#"
        next_href = f"/{next_chapter['folder']}/{next_chapter['filename']}" if next_chapter else "#"
        
        # Process the current file (and its copies in other folders)
        for target_folder in SEARCH_FOLDERS:
            if not os.path.exists(target_folder): continue
            
            # Find the file in this folder that matches our current chapter key
            # (e.g., finding the studyGuides version of chapter 1)
            target_file = None
            for fname in os.listdir(target_folder):
                if current['filename'] == fname: # Exact match preferred
                    target_file = fname
                    break
                elif CHAPTER_ORDER[i]['key'] in fname and fname.endswith('.html'): # Partial match backup
                    target_file = fname
                    break
            
            if not target_file: continue

            path = os.path.join(target_folder, target_file)
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False

            # --- FIX "NEXT" LINK ---
            # Pattern: <a ...>Next: ... </a>
            # We look for a link containing "Next:"
            next_pattern = r'(<a[^>]*href=")([^"]*)("[^>]*>\s*Next:.*?</a>)'
            
            if next_chapter:
                def replace_next(match):
                    # We preserve the opening <a... href=" and the closing ">
                    # We replace the URL and the Text
                    new_link = f'{match.group(1)}{next_href}" class="nav-link">Next: {next_chapter["text"]} &raquo;</a>'
                    return new_link
                
                if re.search(next_pattern, content, re.IGNORECASE):
                    content = re.sub(next_pattern, replace_next, content, flags=re.IGNORECASE)
                    modified = True

            # --- FIX "PREVIOUS" LINK ---
            # Pattern: <a ...> ... Previous ... </a>
            # matches "« Previous: 1: Join..."
            prev_pattern = r'(<a[^>]*href=")([^"]*)("[^>]*>.*?Previous.*?</a>)'
            
            if prev_chapter:
                def replace_prev(match):
                    new_link = f'{match.group(1)}{prev_href}" class="nav-link">&laquo; Previous: {prev_chapter["text"]}</a>'
                    return new_link

                if re.search(prev_pattern, content, re.IGNORECASE):
                    content = re.sub(prev_pattern, replace_prev, content, flags=re.IGNORECASE)
                    modified = True

            if modified:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"[{target_folder}/{target_file}] Updated Previous/Next links.")

if __name__ == "__main__":
    fix_nav_links_renumbered()