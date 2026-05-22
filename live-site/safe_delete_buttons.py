import os
from bs4 import BeautifulSoup

# Folders to scan
target_folders = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

# SAFETY SETTING: If the block matches but is longer than this, DO NOT delete it.
# (This prevents deleting the whole page if a tag was left unclosed)
MAX_SAFE_LENGTH = 1500 

def safe_delete_buttons():
    print("--- Starting Surgical Button Removal ---")
    
    for folder in target_folders:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                # Read the file
                with open(path, 'r', encoding='utf-8') as f:
                    soup = BeautifulSoup(f, 'html.parser')
                
                modified = False
                
                # FIND THE TARGET
                # We look for ANY article that has the 'row-cols-4' class
                articles = soup.find_all('article', class_='row-cols-4')
                
                for art in articles:
                    # CHECK 1: Must contain exactly 4 sections with class 'col'
                    cols = art.find_all('section', class_='col')
                    if len(cols) != 4:
                        continue # Skip if it doesn't look exactly like the button block
                    
                    # CHECK 2: THE SAFETY STOP
                    # We check how much text is inside. The button block is small.
                    # If the text is huge, it means the parser swallowed your lesson content.
                    block_text_len = len(art.get_text())
                    
                    if block_text_len > MAX_SAFE_LENGTH:
                        print(f"⚠️ SAFETY STOP: [{filename}] matched the buttons but was too large ({block_text_len} chars).")
                        print("   It likely contains your page content due to a missing closing tag.")
                        print("   Skipping this file to protect your work.")
                        continue

                    # If we pass both checks, DELETE IT
                    art.decompose()
                    modified = True
                    print(f"[{filename}] safely removed 4-button block.")

                # SAVE ONLY IF CHANGED
                if modified:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(soup.prettify())

if __name__ == "__main__":
    safe_delete_buttons()