import os
import re
from bs4 import BeautifulSoup

# 1. SETUP: The folders we need to unify
source_folders = ['year1', 'year2']
target_folders = ['studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide', 'infographics']
all_folders = source_folders + target_folders
IMAGE_ROOT = 'images'

def master_unify():
    print("--- Starting Master Site Unification ---")

    # STEP 1: LEARN THE TRUTH
    # We map "Chapter Number" -> "Descriptive Slug" based on your Year 1/2 files.
    # Example: 1 -> "join-the-developers-guild"
    chapter_map = {}
    
    for folder in source_folders:
        if not os.path.exists(folder): continue
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Find the Chapter Number
                    match = re.search(r'Chapter\s*:?\s*(\d+)', content, re.IGNORECASE)
                    if match:
                        num = int(match.group(1))
                        # Store the filename without extension as the "Slug"
                        slug = filename.replace('.html', '')
                        chapter_map[num] = slug
                        print(f"Learned: Chapter {num} = {slug}")

    # STEP 2: ENFORCE NAMING ON TARGET FOLDERS
    # Rename 'chapter01.html' in 'techTalk' to 'join-the-developers-guild.html'
    print("\n--- Renaming Sub-Folder Files ---")
    for folder in target_folders:
        if not os.path.exists(folder): continue
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                # We need to know which chapter this file belongs to
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    match = re.search(r'Chapter\s*:?\s*(\d+)', content, re.IGNORECASE)
                
                if match:
                    num = int(match.group(1))
                    if num in chapter_map:
                        new_name = chapter_map[num] + ".html"
                        if filename != new_name:
                            new_path = os.path.join(folder, new_name)
                            os.rename(path, new_path)
                            print(f"[{folder}] Renamed: {filename} -> {new_name}")

    # STEP 3: RENAME IMAGE FOLDERS
    # Rename 'wddich01' -> 'join-the-developers-guild'
    print("\n--- Renaming Image Folders ---")
    if os.path.exists(IMAGE_ROOT):
        for img_folder in os.listdir(IMAGE_ROOT):
            # Check if this folder looks like "wddich01", "wddich1", "chapter01"
            # We strip non-digits to find the number
            match = re.search(r'(\d+)', img_folder)
            if match and "wddich" in img_folder.lower():
                num = int(match.group(1))
                if num in chapter_map:
                    target_slug = chapter_map[num]
                    
                    old_path = os.path.join(IMAGE_ROOT, img_folder)
                    new_path = os.path.join(IMAGE_ROOT, target_slug)
                    
                    if old_path != new_path:
                        if not os.path.exists(new_path):
                            os.rename(old_path, new_path)
                            print(f"Renamed Images: {img_folder} -> {target_slug}")
                        else:
                            print(f"Skipped Image Rename: {target_slug} already exists.")

    # STEP 4: UPDATE CODE (Image Paths & Links)
    print("\n--- Updating Code Refs ---")
    for folder in all_folders + ['.', 'includes']:
        if not os.path.exists(folder): continue
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                modified = False
                
                # Update Image Paths (wddich01 -> descriptive-slug)
                for num, slug in chapter_map.items():
                    # Patterns like: wddich01, wddich1
                    old_img_patterns = [f"wddich{num:02d}", f"wddich{num}"]
                    for old_img in old_img_patterns:
                        if f"images/{old_img}" in content:
                            content = content.replace(f"images/{old_img}", f"images/{slug}")
                            modified = True

                # Update Navbar/Link Paths (chapter01.html -> descriptive-slug.html)
                # This fixes the navbar.html specifically
                for num, slug in chapter_map.items():
                     # Regex to catch href="./chapter01.html"
                     # We replace it with the new descriptive name
                     pattern = fr'href="([^"]*?)/chapter{num:02d}\.html"'
                     if re.search(pattern, content):
                         content = re.sub(pattern, fr'href="\1/{slug}.html"', content)
                         modified = True
                     # Handle single digit "chapter1.html" too
                     pattern_single = fr'href="([^"]*?)/chapter{num}\.html"'
                     if re.search(pattern_single, content):
                         content = re.sub(pattern_single, fr'href="\1/{slug}.html"', content)
                         modified = True

                if modified:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated paths in: {filename}")

if __name__ == "__main__":
    master_unify()