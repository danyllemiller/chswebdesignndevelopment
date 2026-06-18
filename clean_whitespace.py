import os
import re

NAVBAR_PATH = os.path.join('includes', 'navbar.html')

def compact_navbar_lines():
    print(f"--- Compacting HTML Lines in {NAVBAR_PATH} ---")
    
    if not os.path.exists(NAVBAR_PATH):
        print("Error: File not found.")
        return

    with open(NAVBAR_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # THE PATTERN:
    # We look for: <li> ... <a attributes> ... text ... </a> ... </li>
    # spanning across multiple lines.
    # We use non-greedy matching (.*?) to handle each item individually.
    
    regex = r'(\s*)<li>\s*<a\s+([^>]+)>\s*([^<]+)\s*</a>\s*</li>'
    
    def squasher(match):
        # 1. Keep the indentation of the <li>
        indent = match.group(1) 
        # 2. Clean up attributes (replace newlines with single spaces)
        attrs = re.sub(r'\s+', ' ', match.group(2)).strip()
        # 3. Clean up the link text (remove surrounding whitespace)
        text = match.group(3).strip()
        
        # 4. Return the new SINGLE LINE format
        return f'{indent}<li><a {attrs}>{text}</a></li>'

    # Run the replacement
    # re.DOTALL makes the dot (.) match newlines, allowing us to find multi-line blocks
    new_content = re.sub(regex, squasher, content, flags=re.DOTALL)

    # Write it back
    if new_content != content:
        with open(NAVBAR_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("✅ Success! Your navbar buttons are now clean single lines.")
    else:
        print("No changes needed (or pattern didn't match).")

if __name__ == "__main__":
    compact_navbar_lines()