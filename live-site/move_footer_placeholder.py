import os
from bs4 import BeautifulSoup

# Folders to scan
target_folders = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide']

def move_footer_placeholder():
    print("--- Starting Footer Placeholder Relocation ---")
    
    for folder in target_folders:
        if not os.path.exists(folder): continue
        
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                
                # Open and parse the file
                with open(path, 'r', encoding='utf-8') as f:
                    soup = BeautifulSoup(f, 'html.parser')
                
                modified = False
                
                # 1. FIND THE PLAYERS
                footer = soup.find('footer')
                placeholder = soup.find(id='footer-placeholder')
                
                # We can only move it if BOTH exist
                if footer and placeholder:
                    
                    # Check if it's already in the right spot (immediately previous sibling)
                    # This prevents unnecessary file writes
                    prev_sibling = footer.find_previous_sibling()
                    if prev_sibling == placeholder:
                        # print(f"[{filename}] Placeholder is already in correct position.")
                        continue

                    # 2. THE MOVE
                    # First, remove it from its current location (extract)
                    placeholder.extract()
                    
                    # Then, insert it immediately BEFORE the footer
                    footer.insert_before(placeholder)
                    
                    # Add a newline for cleanliness so they aren't on the same line
                    footer.insert_before('\n') 
                    
                    modified = True
                    print(f"[{filename}] Moved placeholder above footer.")

                # Optional: If footer exists but placeholder is missing, you could add it here.
                # But for this script, we strictly stick to "moving" what exists.

                if modified:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(soup.prettify())

if __name__ == "__main__":
    move_footer_placeholder()