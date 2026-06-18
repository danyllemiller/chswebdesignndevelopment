import os
import re

# Folders to deeply clean (added reviewGames)
TARGET_FOLDERS = ['studyGuides', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide', 'reviewGames']

# THE TRUTH TABLE (Filename -> Correct Chapter Number)
CHAPTER_MAP = {
    'join-the-developers-guild': 1,
    'decoding-the-web': 2,
    'the-rules': 3,
    'the-who': 4,
    'the-how': 5,
    'the-why-intro-to-uiux': 6,
    'ui-ux-design': 6,         # Catch alternate name
    'the-bones': 7,
    'the-clothes': 8,
    'the-style': 9,
    'sights-sounds': 10,
    'the-brains': 11,
    'the-game-dev': 12,
    'the-cloud': 13,
    'the-manager': 14,
    'the-network': 15,
    'the-brain-databases': 16,
    'the-game-never-ends': 17,
    'the-final-boss': 18
}

def fix_all_content():
    print("--- Starting Deep Clean (Study Guides, Quizzes, Games) ---")
    files_fixed = 0
    
    for folder in TARGET_FOLDERS:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if not filename.endswith(".html"): continue
            
            # 1. IDENTIFY THE CORRECT CHAPTER
            correct_num = None
            for key, num in CHAPTER_MAP.items():
                if key in filename:
                    correct_num = num
                    break
            
            if correct_num is None: continue

            path = os.path.join(folder, filename)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False

            # 2. THE REPLACEMENT LOGIC
            # We look for "Chapter" followed by ANY number (1-18)
            # We replace it with "Chapter {correct_num}"
            
            def replace_chapter_ref(match):
                # match.group(1) is "Chapter "
                # match.group(2) is the old number
                old_num = int(match.group(2))
                
                # Only change it if it's actually wrong
                if old_num != correct_num:
                    return f"Chapter {correct_num}"
                return match.group(0)

            # Regex: "Chapter" + spaces + digits
            # We use word boundaries (\b) to avoid breaking things like "Chapter 11" becoming "Chapter 1"
            pattern = r'(Chapter\s+)(\d+)'
            
            new_content = re.sub(pattern, replace_chapter_ref, content, flags=re.IGNORECASE)
            
            if new_content != content:
                content = new_content # Update content for next pass
                modified = True

            # 3. SPECIAL CHECK FOR GAME TITLES (e.g. "Level 6 Review")
            # Some games might use "Level" instead of "Chapter"
            pattern_level = r'(Level\s+)(\d+)'
            
            def replace_level_ref(match):
                old_num = int(match.group(2))
                if old_num != correct_num:
                    return f"Level {correct_num}"
                return match.group(0)

            new_content_2 = re.sub(pattern_level, replace_level_ref, content, flags=re.IGNORECASE)
            
            if new_content_2 != content:
                content = new_content_2
                modified = True
            
            if modified:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_fixed += 1
                print(f"[{folder}/{filename}] Updated references to Chapter/Level {correct_num}")

    print(f"\n✅ Deep Clean Complete. Fixed {files_fixed} files.")

if __name__ == "__main__":
    fix_all_content()