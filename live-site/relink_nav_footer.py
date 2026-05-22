import os
import re
from bs4 import BeautifulSoup

# CONFIGURATION
NAVBAR_PATH = os.path.join('includes', 'navbar.html')
FOOTER_PATH = os.path.join('includes', 'footer.html')
SOURCE_FOLDERS = ['year1', 'year2']
# These are the folders linked in your navbar that need to follow the master naming
LINKED_FOLDERS = ['year1', 'year2', 'studyGuides', 'reviewGames', 'quizes', 'toLongDidntRead', 'techTalkA-ZGuide', 'infographics']

def get_master_map():
    """Scans Year 1 & 2 to build the source of truth: { ChapterNum: 'filename.html' }"""
    print("--- 1. Building Master Map (Scanning Source of Truth) ---")
    mapping = {}
    year1_files = [] # We need this specific list for the footer
    
    for folder in SOURCE_FOLDERS:
        if not os.path.exists(folder): continue
        for filename in os.listdir(folder):
            if filename.endswith(".html"):
                path = os.path.join(folder, filename)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Find "Chapter 1" or "Chapter: 1"
                    match = re.search(r'Chapter\s*:?\s*(\d+)', content, re.IGNORECASE)
                    if match:
                        num = int(match.group(1))
                        mapping[num] = filename
                        
                        # Add to Year 1 list if it's in the year1 folder
                        if folder == 'year1':
                            year1_files.append(filename)
                            
    print(f"Map Built: Found {len(mapping)} chapters.")
    return mapping, year1_files

def relink_navbar(mapping):
    """Updates navbar.html links based on the button text '1: ...'"""
    print("\n--- 2. Relinking Navbar ---")
    if not os.path.exists(NAVBAR_PATH):
        print("CRITICAL: navbar.html not found.")
        return

    with open(NAVBAR_PATH, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    modified = False
    
    for link in soup.find_all('a'):
        text = link.get_text().strip()
        href = link.get('href', '')
        
        # We only touch links that point to our known folders
        # Checks if any valid folder is part of the href path
        current_folder = next((f for f in LINKED_FOLDERS if f"{f}/" in href), None)
        
        if current_folder:
            # Extract Chapter Number from visible text "1: Join the Guild"
            match = re.match(r'^(\d+):', text)
            if match:
                num = int(match.group(1))
                
                # If we have a master filename for this chapter
                if num in mapping:
                    correct_filename = mapping[num]
                    new_href = f"/{current_folder}/{correct_filename}"
                    
                    # If it's different, update it
                    if href != new_href:
                        print(f"Fixing [{text}]: {href} -> {new_href}")
                        link['href'] = new_href
                        modified = True

    if modified:
        with open(NAVBAR_PATH, 'w', encoding='utf-8') as f:
            # Use prettify? If you prefer raw to keep formatting, we can swap this.
            # But BeautifulSoup is usually safe for Navbars.
            f.write(soup.prettify())
        print("✅ Navbar updated.")
    else:
        print("Navbar is already up to date.")

def relink_footer(year1_files):
    """Updates the JS array in footer.html to match real files"""
    print("\n--- 3. Relinking Footer Logic ---")
    if not os.path.exists(FOOTER_PATH):
        print("CRITICAL: footer.html not found.")
        return

    with open(FOOTER_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create the new JS array string
    # e.g., "    'file1.html', 'file2.html'"
    # We sort them to look nice
    year1_files.sort()
    quoted_files = [f"'{f}'" for f in year1_files]
    new_array_content = ",\n        ".join(quoted_files)
    
    # Regex to find the existing array block
    # Matches: const year1Chapters = [ ... ];
    pattern = r'const year1Chapters = \[\s*(.*?)\s*\];'
    
    if re.search(pattern, content, re.DOTALL):
        new_block = f"const year1Chapters = [\n        {new_array_content}\n    ];"
        content = re.sub(pattern, new_block, content, flags=re.DOTALL)
        
        with open(FOOTER_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Footer JS updated with {len(year1_files)} Year 1 files.")
    else:
        print("⚠️ Could not find 'const year1Chapters' array in footer.html. Did you paste the Smart Footer code?")

if __name__ == "__main__":
    master_map, year1_files = get_master_map()
    if master_map:
        relink_navbar(master_map)
        relink_footer(year1_files)
    else:
        print("❌ Error: Could not find any files in year1/year2 to learn names from.")