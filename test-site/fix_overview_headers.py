import os
from bs4 import BeautifulSoup

# Folders to scan
TARGET_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

def fix_image_paths():
    print("--- Starting Image Path Correction ---")
    
    files_fixed = 0
    
    for folder in TARGET_FOLDERS:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if not filename.endswith(".html"): continue
            
            path = os.path.join(folder, filename)
            
            # DERIVE THE FOLDER NAME
            # Example: "the-why-intro-to-uiux.html" -> "the-why-intro-to-uiux"
            image_folder_name = filename.replace('.html', '')
            
            with open(path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')
            
            modified = False
            
            # FIND ALL IMAGES
            images = soup.find_all('img')
            
            for img in images:
                old_src = img.get('src')
                if not old_src: continue
                
                # SKIP LOGOS / COMMON ASSETS
                # If it's a generic image like "logo.png" or "check.svg", we probably shouldn't touch it.
                # You can add more exclusions here if needed.
                if 'logo' in old_src.lower() or 'icon' in old_src.lower() or 'bootstrap' in old_src.lower():
                    continue

                # EXTRACT FILENAME
                # We only want the end part: "Figure-12.1.png"
                img_filename = os.path.basename(old_src)
                
                # CONSTRUCT NEW PATH
                # Standard format: /images/[HTML_FILENAME_NO_EXT]/[IMAGE_FILENAME]
                # We use /images/ because the HTML files are 1 level deep (in year1/)
                new_src = f"/images/{image_folder_name}/{img_filename}"
                
                if old_src != new_src:
                    img['src'] = new_src
                    modified = True
                    # print(f"   Updated: {img_filename} -> {new_src}")

            if modified:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(soup.prettify())
                files_fixed += 1
                print(f"[{filename}] Corrected image paths.")

    print(f"\n✅ Path Correction Complete. Updated {files_fixed} files.")

if __name__ == "__main__":
    fix_image_paths()