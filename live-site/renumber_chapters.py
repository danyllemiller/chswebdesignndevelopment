import os
import re

# Folders to scan
TARGET_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

def renumber_chapters():
    print("--- Starting Chapter Renumbering (Creating Space at Chapter 6) ---")
    
    count = 0
    
    for folder in TARGET_FOLDERS:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # REGEX EXPLANATION:
                # We look for: <h2> then optional whitespace, then "Chapter", then a number.
                # Group 1: "<h2>Chapter "
                # Group 2: The Number (e.g. "6")
                # Group 3: The rest of the line (e.g. ": The Bones...")
                pattern = r'(<h2>\s*Chapter\s*)(\d+)(.*)'
                
                def increment_chapter(match):
                    prefix = match.group(1)
                    num = int(match.group(2))
                    suffix = match.group(3)
                    
                    # LOGIC:
                    # If the chapter is 6 or greater, add 1 to it.
                    # 6 -> 7
                    # 7 -> 8
                    # 12 -> 13 (Year 2 gets shifted too)
                    if num >= 6:
                        new_num = num + 1
                        print(f"[{filename}] shifting Chapter {num} -> {new_num}")
                        return f"{prefix}{new_num}{suffix}"
                    else:
                        # If it's 1, 2, 3, 4, 5... leave it alone.
                        return match.group(0)

                # Run the replacement
                new_content = re.sub(pattern, increment_chapter, content, flags=re.IGNORECASE)
                
                # Also check for "Chapter X Overview" which usually appears lower down in H2 or H3
                # pattern_overview = r'(>[^<]*Chapter\s*)(\d+)(\s*Overview)'
                # You can uncomment this if you want to fix the "Chapter X Overview" headers too
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    count += 1

    print(f"\n✅ Renumbering Complete. Updated headers in {count} files.")
    print("NOTE: This script updated the TITLES (<h2>).")
    print("You can now insert your new UI/UX page as Chapter 6.")

if __name__ == "__main__":
    renumber_chapters()