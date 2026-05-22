/**
 * CHAPTER 3: Introduction to Office Software
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
(async function() {
    const firebaseConfig = {
        apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
        authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
        projectId: "digitalartsclasses-games-67ae7",
        storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
        messagingSenderId: "662051088920",
        appId: "1:662051088920:web:3b05cb890d834c0b9cb16d",
        measurementId: "G-LZ4CXH6X3G"
    };

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, collection, addDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: WORD PROCESSING & FORMATTING ---
        { cat: "Word Processing & Formatting", val: 100, q: "What tool helps you adjust margins and indents in a document?", a: "The Ruler", d: ["The Ribbon", "The Status Bar", "The Task Manager"] },
        { cat: "Word Processing & Formatting", val: 100, q: "What is the tabbed toolbar at the top of Microsoft Word called?", a: "The Ribbon", d: ["The Ruler", "The Navigation Pane", "The Footer"] },
        { cat: "Word Processing & Formatting", val: 100, q: "Heading 1, Heading 2, and Normal text are examples of what?", a: "Styles (Information Hierarchy)", d: ["File Extensions", "Data Elements", "Variables"] },

        { cat: "Word Processing & Formatting", val: 200, q: "Using Styles (like Heading 1) helps create a digital map for what assistive technology?", a: "Screen Readers", d: ["Virtual Reality Headsets", "Microphones", "3D Printers"] },
        { cat: "Word Processing & Formatting", val: 200, q: "Why should you avoid using the spacebar to center text or indent paragraphs?", a: "It is inconsistent and breaks easily; you should use the Ruler or alignment tools", d: ["It uses too much electricity", "It deletes the text", "It violates copyright law"] },
        { cat: "Word Processing & Formatting", val: 200, q: "What principle uses typography, line spacing, and alignment for professional communication?", a: "Formatting for Readability", d: ["Zero-Based Indexing", "Algorithmic Bias", "Data Exfiltration"] },

        { cat: "Word Processing & Formatting", val: 300, q: "What is the main difference between Microsoft Word and Google Docs regarding where files live?", a: "Word is historically local (hard drive), Docs is Cloud-based", d: ["Word is free, Docs costs money", "Word only works on Macs", "Docs cannot use text"] },
        { cat: "Word Processing & Formatting", val: 300, q: "In the 'Ugly Document' Rescue, what tools must students use to transform the chaotic text?", a: "Styles, headers, footers, and proper spacing", d: ["C++ Code", "A 3D printer", "Video editing software"] },
        { cat: "Word Processing & Formatting", val: 300, q: "Setting specific font sizes for titles versus body text is an example of creating:", a: "Visual Hierarchy", d: ["A Flat File", "A Linked List", "A Boolean Operator"] },

        { cat: "Word Processing & Formatting", val: 400, q: "How does applying a 'Style' like Heading 1 benefit the document's structure?", a: "It tells the computer's logic what is important, enabling automated Tables of Contents", d: ["It changes the language of the text", "It encrypts the document", "It saves it to a flash drive"] },
        { cat: "Word Processing & Formatting", val: 400, q: "Why are line spacing and alignment important in professional communication?", a: "They improve readability and reduce cognitive strain on the reader", d: ["They make the file size much larger", "They hide the text from hackers", "They are required by the OS Kernel"] },
        { cat: "Word Processing & Formatting", val: 400, q: "What is the default image text wrap setting that often makes text jump to the next page?", a: "In Line with Text", d: ["Square", "Tight", "Behind Text"] },

        { cat: "Word Processing & Formatting", val: 500, q: "Before digital word processors, what happened if you made a typo on the last line of a typed page?", a: "You often had to throw the entire sheet away and start over", d: ["The computer fixed it automatically", "You hit the backspace key", "You saved it to the cloud"] },
        { cat: "Word Processing & Formatting", val: 500, q: "How do Document Styles help visually impaired users?", a: "They allow Screen Readers to navigate the document's structure logically", d: ["They make the screen extremely bright", "They print the text in Braille", "They turn the screen off"] },
        { cat: "Word Processing & Formatting", val: 500, q: "What feature ensures that your document remains visually consistent from the first page to the last?", a: "Mastering structural tools like the Ruler and Margins", d: ["Typing very quickly", "Using a physical mouse", "Hitting the spacebar repeatedly"] },

        // --- CATEGORY: DOCUMENT EXPORTING & PDFS ---
        { cat: "Document Exporting & PDFs", val: 100, q: "What does PDF stand for?", a: "Portable Document Format", d: ["Personal Data File", "Public Digital Folder", "Programmed Document Feature"] },
        { cat: "Document Exporting & PDFs", val: 100, q: "What is the primary reason we export a document to a PDF?", a: "To 'lock' or preserve the formatting across different devices", d: ["To make the text editable", "To change the font color", "To add video files"] },
        { cat: "Document Exporting & PDFs", val: 100, q: "A raw working file in Adobe Photoshop usually has what extension?", a: ".psd", d: [".jpg", ".png", ".pdf"] },

        { cat: "Document Exporting & PDFs", val: 200, q: "What happens to a document's layout when saved as a PDF and opened on a different Operating System?", a: "It stays exactly the same, like a digital photograph", d: ["The fonts change randomly", "The images are deleted", "The text translates to another language"] },
        { cat: "Document Exporting & PDFs", val: 200, q: "Which format strips away all formatting, images, and colors, leaving only letters?", a: ".txt (Plain Text)", d: [".pdf", ".docx", ".rtf"] },
        { cat: "Document Exporting & PDFs", val: 200, q: "Why wouldn't you send a .docx file as your final professional resume?", a: "The formatting might break or change when the boss opens it on their computer", d: ["It is illegal", "It costs money to open", "The file is too small"] },

        { cat: "Document Exporting & PDFs", val: 300, q: "What is an .rtf file?", a: "Rich Text Format, a universal language opened by almost any word processor", d: ["A video file", "A secret encrypted file", "A spreadsheet file"] },
        { cat: "Document Exporting & PDFs", val: 300, q: "In the 'Ugly Document' Rescue activity, what is the final step after formatting?", a: "Exporting it as a clean PDF", d: ["Printing it out", "Deleting the file", "Translating it to Spanish"] },
        { cat: "Document Exporting & PDFs", val: 300, q: "Why do we call a PDF the 'Final Version'?", a: "Because it 'freezes' everything into a digital photograph of your work", d: ["Because it is the last file alphabetically", "Because it is impossible to delete", "Because it uses the most RAM"] },

        { cat: "Document Exporting & PDFs", val: 400, q: "What is the difference between a raw working file and an exported final product?", a: "A raw file is editable with layers and tools; an export is a flattened final product", d: ["A raw file is smaller", "An export is infected with malware", "There is no difference"] },
        { cat: "Document Exporting & PDFs", val: 400, q: "How does the OS know which program to use to open a file?", a: "By reading the File Extension", d: ["By guessing", "By asking the user every time", "By checking the file size"] },
        { cat: "Document Exporting & PDFs", val: 400, q: "If you aren't sure if your teacher has Microsoft Word, which file type is a safe alternative to preserve some formatting?", a: ".rtf (Rich Text Format)", d: [".txt", ".psd", ".html"] },

        { cat: "Document Exporting & PDFs", val: 500, q: "Why are .txt files loved by computers but terrible for school projects?", a: "They are tiny and easy to read for machines, but lack the formatting humans need for readability", d: ["They crash the computer", "They cost money to create", "They are too colorful"] },
        { cat: "Document Exporting & PDFs", val: 500, q: "How does exporting to a PDF relate to the concept of 'Abstraction'?", a: "It abstracts away the specific software needed to read the file, making it universally accessible", d: ["It hides the file in a secret folder", "It compresses the file to zero bytes", "It deletes the operating system"] },
        { cat: "Document Exporting & PDFs", val: 500, q: "Why is using a strict file naming convention (e.g., CS_Ch3_Lab_YourName_v1.docx) important?", a: "It prevents version confusion and makes files easy to find via the OS search bar", d: ["It makes the computer run faster", "It uses less battery", "It is required to connect to Wi-Fi"] },

        // --- CATEGORY: PRESENTATION DESIGN ---
        { cat: "Presentation Design", val: 100, q: "What is the term for a terrible, text-heavy, boring presentation?", a: "Death by PowerPoint", d: ["The Blue Screen of Death", "Syntax Error", "Digital Isolation"] },
        { cat: "Presentation Design", val: 100, q: "A professional presentation should be used as a visual aid, NOT a:", a: "Reading Script", d: ["Photograph", "Color Palette", "Graph"] },
        { cat: "Presentation Design", val: 100, q: "What is the empty space around images and text on a slide called?", a: "White Space", d: ["Blank Zone", "Null Space", "Void Area"] },

        { cat: "Presentation Design", val: 200, q: "What happens to the audience when a slide is covered in text and the speaker is also talking?", a: "Cognitive Overload", d: ["Algorithmic Bias", "Data Exfiltration", "Infinite Looping"] },
        { cat: "Presentation Design", val: 200, q: "Why is 'White Space' actually a powerful design tool?", a: "It tells the audience's eyes exactly where to look", d: ["It saves printer ink", "It makes the file smaller", "It crashes the projector"] },
        { cat: "Presentation Design", val: 200, q: "What is the 'Rule of Thirds' in slide design?", a: "Placing images on the intersections of a 3x3 grid instead of dead center", d: ["Having exactly three slides", "Using only three colors", "Speaking for exactly three minutes"] },

        { cat: "Presentation Design", val: 300, q: "What causes 'Cognitive Overload' during a presentation?", a: "The brain trying to read a screen and listen to a speaker at the same time, sharing limited processing power", d: ["The screen being too bright", "The music being too loud", "The Wi-Fi disconnecting"] },
        { cat: "Presentation Design", val: 300, q: "In the '5-Slide Pitch' activity, what must students use to explain a technical concept?", a: "Minimal text and strong/high-quality imagery", d: ["100 words per slide", "Only black and white colors", "No images at all"] },
        { cat: "Presentation Design", val: 300, q: "What is the purpose of a 'Visual Anchor' on a slide?", a: "To capture attention instantly so the audience spends 95% of their time listening to the speaker", d: ["To make the file heavier", "To link to a website", "To stop the slide from changing"] },

        { cat: "Presentation Design", val: 400, q: "How did the history of 'Overhead Projectors' influence early PowerPoint mistakes?", a: "When software made typing easy, people started overdoing text compared to hard-to-make physical transparencies", d: ["People forgot how to read", "Projectors were too expensive", "Computers couldn't display images"] },
        { cat: "Presentation Design", val: 400, q: "When should you use a creative layout tool like Adobe Express or InDesign instead of Google Slides?", a: "For more visually demanding, highly polished pitch decks", d: ["When you have no internet", "When you want to write an essay", "When you want to play a game"] },
        { cat: "Presentation Design", val: 400, q: "Why should you avoid adding a 'Whoosh' sound effect to every slide transition?", a: "Multimedia should be used to clarify a point, not distract or annoy the audience", d: ["It uses too much battery", "It is illegal", "It breaks the computer speaker"] },

        { cat: "Presentation Design", val: 500, q: "How does a good presenter balance the two main 'channels' of the brain (hearing and seeing)?", a: "By minimizing text so the visual channel processes images while the audio channel listens to the speaker", d: ["By yelling loudly", "By turning the screen off", "By playing background music"] },
        { cat: "Presentation Design", val: 500, q: "What is the tradeoff of an 'Embedded' video versus a 'Linked' video in a presentation?", a: "Embedded is huge but works offline; Linked is small but requires Wi-Fi", d: ["Embedded is illegal; Linked is legal", "Embedded plays backward; Linked plays forward", "There is no tradeoff"] },
        { cat: "Presentation Design", val: 500, q: "Why is high-contrast color (like dark blue text on light gray) a principle of good slide design?", a: "It ensures the message is readable from the back of a large room", d: ["It saves battery on the projector", "It makes the file size smaller", "It is required by Adobe software"] },

        // --- CATEGORY: CLOUD COLLABORATION ---
        { cat: "Cloud Collaboration", val: 100, q: "What feature allows multiple people to type in the same document at the exact same time?", a: "Concurrent Editing (Cloud Collaboration)", d: ["Version Control", "Data Validation", "Encryption"] },
        { cat: "Cloud Collaboration", val: 100, q: "Instead of saving a file locally as `v2.docx`, where do modern remote teams work?", a: "On a single, live cloud document", d: ["On a floppy disk", "On a physical whiteboard", "On a local USB drive"] },
        { cat: "Cloud Collaboration", val: 100, q: "What cloud feature acts as a 'Time Machine' to recover past work?", a: "Version History", d: ["The Recycle Bin", "Spell Check", "Find and Replace"] },

        { cat: "Cloud Collaboration", val: 200, q: "Where does a cloud document actually 'live'?", a: "On a remote server, not your local hard drive", d: ["Inside the CPU", "In the computer's RAM", "On your keyboard"] },
        { cat: "Cloud Collaboration", val: 200, q: "What feature allows you to leave notes for your team to read asynchronously?", a: "Comment Threads", d: ["Suggested Edits", "Bold Text", "File Extensions"] },
        { cat: "Cloud Collaboration", val: 200, q: "How do you propose a change to a document without permanently deleting the original text?", a: "Use 'Suggested Edits' or 'Track Changes'", d: ["Highlight it in red", "Delete it and apologize later", "Print it out and write on it"] },

        { cat: "Cloud Collaboration", val: 300, q: "What does having a 'Single Source of Truth' mean in cloud collaboration?", a: "There is only one live version of a file, eliminating the risk of working on an outdated copy", d: ["Only one person is allowed to type", "The document can only have one page", "The file can never be deleted"] },
        { cat: "Cloud Collaboration", val: 300, q: "How do you 'tag' a specific teammate in a cloud document to ask them a question?", a: "By typing @name in a comment thread", d: ["By emailing them separately", "By making their text bold", "By putting their name in the file title"] },
        { cat: "Cloud Collaboration", val: 300, q: "What happens if someone accidentally deletes three pages of work in a cloud document?", a: "You can use Version History to 'roll back' to how it looked ten minutes ago", d: ["The work is gone forever", "The computer crashes", "You have to pay to get it back"] },

        { cat: "Cloud Collaboration", val: 400, q: "Why does working in the cloud require a 'mental shift' from traditional word processing?", a: "You are no longer 'saving' a static file; you are 'syncing' a live state with other humans", d: ["You don't use a keyboard anymore", "You have to type much faster", "You must memorize binary code"] },
        { cat: "Cloud Collaboration", val: 400, q: "What does Version History record besides the actual text changes?", a: "Who made the change and at what exact time", d: ["The IP address of the user", "The battery life of the computer", "The weather outside"] },
        { cat: "Cloud Collaboration", val: 400, q: "How do 'Suggested Edits' protect the lead writer's work?", a: "The original text stays in place until the teammate clicks 'Accept' or 'Reject'", d: ["They encrypt the text", "They lock the document with a password", "They hide the text completely"] },

        { cat: "Cloud Collaboration", val: 500, q: "What is the main vulnerability or requirement for Concurrent Editing to work?", a: "It requires a constant and stable internet connection to sync the live state", d: ["It requires a massively powerful GPU", "It requires 100GB of RAM", "It requires everyone to be in the same room"] },
        { cat: "Cloud Collaboration", val: 500, q: "How did the shift to the cloud change office work at the Software Layer?", a: "It changed word processing from a solo activity to a team sport", d: ["It made computers completely obsolete", "It forced everyone to work in physical offices", "It made typing much slower"] },
        { cat: "Cloud Collaboration", val: 500, q: "In the 'Collaborative Sandbox' activity, what are students required to demonstrate?", a: "The use of comments and suggested edits to write a tech policy together", d: ["Writing an algorithm in JavaScript", "Building a hardware PC", "Designing a 3D model"] },

        // --- CATEGORY: TEAM ROLES & ETIQUETTE ---
        { cat: "Team Roles & Etiquette", val: 100, q: "What permission level allows a user to read a document but not change anything?", a: "Viewer", d: ["Editor", "Commenter", "Owner"] },
        { cat: "Team Roles & Etiquette", val: 100, q: "What permission level allows a user to leave notes and suggest edits, but not make permanent changes?", a: "Commenter", d: ["Viewer", "Editor", "Admin"] },
        { cat: "Team Roles & Etiquette", val: 100, q: "What permission level gives a user total control to change or delete text?", a: "Editor", d: ["Viewer", "Commenter", "Guest"] },

        { cat: "Team Roles & Etiquette", val: 200, q: "Why is it important to assign specific 'Roles' in a digital team?", a: "To divide the work efficiently and hit project deadlines", d: ["So people can argue", "To make the file smaller", "Because it is required by Google"] },
        { cat: "Team Roles & Etiquette", val: 200, q: "In a group project, who is primarily responsible for creating the main content?", a: "The Lead Writer", d: ["The Formatting Lead", "The Editor", "The Project Manager"] },
        { cat: "Team Roles & Etiquette", val: 200, q: "In a group project, who is responsible for ensuring the document looks professional and uses proper styles?", a: "The Formatting Lead", d: ["The Lead Writer", "The Editor", "The Hardware Tech"] },

        { cat: "Team Roles & Etiquette", val: 300, q: "What is the danger of giving 'Editor' access to the wrong person?", a: "They could accidentally or intentionally delete or ruin the entire project", d: ["They could make the file too large", "They could change the font to comic sans", "They could crash the Google server"] },
        { cat: "Team Roles & Etiquette", val: 300, q: "What does a 'Power User' always do before hitting 'Send' on a shared document link?", a: "Double-checks the sharing permissions and settings", d: ["Turns off their computer", "Encrypts the hard drive", "Deletes the original file"] },
        { cat: "Team Roles & Etiquette", val: 300, q: "In the 'Collaborative Sandbox' activity, what role checks for errors and makes suggestions?", a: "The Editor / Commenter", d: ["The Lead Writer", "The Formatting Lead", "The Spectator"] },

        { cat: "Team Roles & Etiquette", val: 400, q: "How does dividing tasks into Lead Writer, Editor, and Formatting Lead reflect the real world?", a: "It mirrors professional tech teams (like the SDLC) where specialists handle distinct parts of a project", d: ["It forces everyone to do the same job", "It slows down production", "It is only used in high schools"] },
        { cat: "Team Roles & Etiquette", val: 400, q: "What does 'Digital Etiquette' refer to in the context of sharing documents?", a: "Responsibly setting permissions and communicating respectfully via comments/suggestions", d: ["Typing very quietly", "Never using the internet", "Always using bold text"] },
        { cat: "Team Roles & Etiquette", val: 400, q: "How does asynchronous communication (like comment threads) improve team productivity?", a: "Teammates don't have to be online at the exact same time to coordinate their work", d: ["It forces everyone to meet in person", "It makes the internet faster", "It uses less battery power"] },

        { cat: "Team Roles & Etiquette", val: 500, q: "Why is giving someone 'Commenter' access often safer than 'Editor' access for peer review?", a: "It protects the data integrity of the master file while still allowing valuable feedback", d: ["It makes the file load faster", "It stops them from reading the text", "It converts the file to a PDF automatically"] },
        { cat: "Team Roles & Etiquette", val: 500, q: "How do clearly defined team roles prevent 'spaghetti logic' in group work?", a: "They ensure everyone knows their responsibilities so people aren't overwriting each other's efforts", d: ["They make the file size smaller", "They stop the computer from crashing", "They automatically write the essay"] },
        { cat: "Team Roles & Etiquette", val: 500, q: "What employability standard is practiced by assigning roles and using cloud tools responsibly?", a: "Collaborating effectively in team roles to produce digital artifacts (9-12.IC.SI.1)", d: ["Hardware assembly", "Network topology mapping", "Binary conversion"] }
    ].map(item => ({ ...item, chapter: "Chapter 3", grade: "CS & Literacy Guild" })));
    
})();