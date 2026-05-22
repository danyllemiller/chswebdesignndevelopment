/**
 * CHAPTER 2: Essential Computer Skills & Troubleshooting
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
        // --- CATEGORY: GUI & WORKSPACE ---
        { cat: "GUI & Workspace", val: 100, q: "What does GUI stand for?", a: "Graphical User Interface", d: ["General User Integration", "Graphics Unification Index", "Global User Internet"] },
        { cat: "GUI & Workspace", val: 100, q: "How do users visually interact with a modern operating system?", a: "Through windows, icons, and menus", d: ["By typing binary code", "Through physical punch cards", "By shouting voice commands only"] },
        { cat: "GUI & Workspace", val: 100, q: "What was the primary way people interacted with computers before GUIs?", a: "Typing text commands", d: ["Using touchscreens", "Using a physical mouse", "Using virtual reality"] },

        { cat: "GUI & Workspace", val: 200, q: "Why is customizing the workspace important for a Power User?", a: "It increases productivity and organization", d: ["It makes the computer run faster", "It uses less electricity", "It prevents hackers from entering"] },
        { cat: "GUI & Workspace", val: 200, q: "What metaphor did early OS designers use to make computers feel familiar?", a: "The Desktop metaphor", d: ["The Kitchen metaphor", "The Highway metaphor", "The Library metaphor"] },
        { cat: "GUI & Workspace", val: 200, q: "Instead of a messy list of 20 files, what should a student design?", a: "A logical folder hierarchy", d: ["A flat text file", "A single massive folder", "A physical printed binder"] },

        { cat: "GUI & Workspace", val: 300, q: "What is the main benefit of a Graphical User Interface over a Command Line Interface?", a: "It hides complex text commands behind clickable icons", d: ["It processes math equations faster", "It doesn't require an operating system", "It uses less RAM"] },
        { cat: "GUI & Workspace", val: 300, q: "In the 'Workspace' activity, what is the goal of organizing images, text, and code snippets?", a: "To create a logical folder hierarchy", d: ["To delete them permanently", "To encrypt them for security", "To compress them into one file"] },
        { cat: "GUI & Workspace", val: 300, q: "Which OS feature acts as the visual 'home base' for launching apps and opening files?", a: "The Desktop", d: ["The Task Manager", "The BIOS", "The Kernel"] },

        { cat: "GUI & Workspace", val: 400, q: "How does a GUI act as an 'Abstraction'?", a: "It hides complex mathematical addresses behind friendly icons", d: ["It deletes old software automatically", "It encrypts network passwords", "It changes the hardware components"] },
        { cat: "GUI & Workspace", val: 400, q: "If you have a messy digital workspace, what is the best way to fix it?", a: "Create categorized folders and subfolders", d: ["Buy a larger hard drive", "Reboot the computer", "Turn off the monitor"] },
        { cat: "GUI & Workspace", val: 400, q: "What is the risk of keeping all your raw files and exported files in one giant, unorganized folder?", a: "It becomes impossible to find specific files efficiently", d: ["The computer will explode", "The files will delete themselves", "The internet connection will drop"] },

        { cat: "GUI & Workspace", val: 500, q: "Why was the invention of the GUI a revolution in computer history?", a: "It allowed non-scientists to easily use computers", d: ["It created the first internet connection", "It invented the microchip", "It eliminated the need for keyboards"] },
        { cat: "GUI & Workspace", val: 500, q: "In a professional digital arts project, why separate 'raw' files from 'exported' files?", a: "To protect editable originals from final compressed versions", d: ["To make the files look prettier", "To save hard drive space", "Because it is required by law"] },
        { cat: "GUI & Workspace", val: 500, q: "How does proper workspace structuring prevent accidental data loss?", a: "By keeping related files safely grouped and clearly named", d: ["By backing up files to the cloud", "By physically locking the hard drive", "By compressing the files into ZIPs"] },

        // --- CATEGORY: FILE MANAGEMENT ---
        { cat: "File Management", val: 100, q: "What tells the Operating System which program should open a file?", a: "The File Extension", d: ["The File Size", "The Folder Name", "The Creation Date"] },
        { cat: "File Management", val: 100, q: "A `.jpg` or `.png` is an example of what?", a: "A File Extension", d: ["An Operating System", "A Root Directory", "A Subfolder"] },
        { cat: "File Management", val: 100, q: "What is the top-level folder of a file system called?", a: "The Root Directory", d: ["The Subfolder", "The Desktop", "The Application Folder"] },

        { cat: "File Management", val: 200, q: "What is the difference between a raw working file (like `.psd`) and an exported file (like `.jpg`)?", a: "A raw file is editable with layers; an export is a flattened final product", d: ["A raw file is a virus; an export is safe", "An export is for printing only", "There is no difference"] },
        { cat: "File Management", val: 200, q: "What does a 'File Path' do?", a: "It shows the exact 'home address' of a file in the computer", d: ["It tells the internet where to go", "It draws a line on the screen", "It measures internet speed"] },
        { cat: "File Management", val: 200, q: "A folder placed inside another folder is known as a:", a: "Subfolder", d: ["Root Folder", "Parent Folder", "Master Folder"] },

        { cat: "File Management", val: 300, q: "If a file ends in `.html`, what type of application will typically open it?", a: "A Web Browser", d: ["A Word Processor", "A Photo Editor", "A Video Player"] },
        { cat: "File Management", val: 300, q: "What happens if you accidentally delete or change a file extension?", a: "The OS might not know which app to use to open it", d: ["The file is permanently destroyed", "The computer restarts", "The file becomes a virus"] },
        { cat: "File Management", val: 300, q: "In file organization, what is a 'Hierarchy'?", a: "A structured tree of folders and subfolders", d: ["A list of random files", "A type of hard drive", "A cloud storage server"] },

        { cat: "File Management", val: 400, q: "Why does an Adobe `.psd` file need to be exported as a `.jpg` to be put on a website?", a: "Web browsers cannot read raw Photoshop files", d: ["To make the file larger", "Because Photoshop is illegal", "To change the colors"] },
        { cat: "File Management", val: 400, q: "How does the file system act as an index for the computer?", a: "It maps human-readable names to physical locations on the storage drive", d: ["It searches the internet for answers", "It organizes the physical keyboard", "It connects the monitor to the CPU"] },
        { cat: "File Management", val: 400, q: "If you want to send an un-editable, 'frozen' version of a document, which extension is best?", a: ".pdf", d: [".docx", ".txt", ".psd"] },

        { cat: "File Management", val: 500, q: "Why do professional environments mandate strict file naming conventions and extensions?", a: "To ensure seamless collaboration and prevent version confusion", d: ["To slow down the creative process", "Because hard drives require specific names", "To use less electricity"] },
        { cat: "File Management", val: 500, q: "How does the OS use 'Associations' to manage user experience?", a: "It links specific extensions to default applications automatically", d: ["It pairs users with friends", "It connects the mouse to the screen", "It blocks viruses from opening"] },
        { cat: "File Management", val: 500, q: "Without a structured File System, how would the OS see data on a hard drive?", a: "As a meaningless sea of random 1s and 0s", d: ["As a perfectly organized library", "As physical books", "As audio waveforms"] },

        // --- CATEGORY: TROUBLESHOOTING STRATEGY ---
        { cat: "Troubleshooting Strategy", val: 100, q: "What is the very first step of the Troubleshooting Mindset when an error occurs?", a: "Stop and read the actual error message", d: ["Unplug the computer immediately", "Click the mouse repeatedly", "Delete the application"] },
        { cat: "Troubleshooting Strategy", val: 100, q: "What should you NOT do when a computer program suddenly freezes?", a: "Repeatedly click or panic", d: ["Read the error code", "Look for a solution online", "Check the cables"] },
        { cat: "Troubleshooting Strategy", val: 100, q: "The strategy of isolating a problem by ruling out parts one by one is called:", a: "Divide and Conquer", d: ["Hide and Seek", "Search and Destroy", "Trial and Error"] },

        { cat: "Troubleshooting Strategy", val: 200, q: "If your mouse isn't working, but it works when plugged into a different computer, what did you isolate?", a: "The computer's USB port is the issue, not the mouse", d: ["The mouse is broken", "The internet is down", "The OS is corrupted"] },
        { cat: "Troubleshooting Strategy", val: 200, q: "If a website won't load, but your email app works perfectly, what type of issue is this?", a: "A software or server issue, not a network issue", d: ["A broken Wi-Fi router", "A cut ethernet cable", "A hardware failure"] },
        { cat: "Troubleshooting Strategy", val: 200, q: "Why is 'guessing randomly' a bad troubleshooting strategy?", a: "It can create new problems and wastes time", d: ["It is too fast", "It fixes the problem too easily", "It uses too much internet bandwidth"] },

        { cat: "Troubleshooting Strategy", val: 300, q: "In 'Divide and Conquer,' you usually check three main layers: Hardware, Software, and _____.", a: "Network", d: ["Keyboard", "Database", "Monitor"] },
        { cat: "Troubleshooting Strategy", val: 300, q: "What does it mean to 'Isolate the Variable' in computer science?", a: "Testing one specific part of the system while keeping the rest unchanged", d: ["Moving a computer to a different room", "Deleting a piece of code", "Changing all the settings at once"] },
        { cat: "Troubleshooting Strategy", val: 300, q: "If an app crashes every time you click 'Print', what is the most likely culprit?", a: "A software bug or a bad printer driver", d: ["A broken keyboard", "The Wi-Fi going out", "The monitor overheating"] },

        { cat: "Troubleshooting Strategy", val: 400, q: "Why is writing down or taking a screenshot of an error message critical?", a: "It provides the exact specific code needed to research a fix", d: ["So you can post it on Instagram", "Because the computer deletes the error", "To prove it wasn't your fault"] },
        { cat: "Troubleshooting Strategy", val: 400, q: "What is the danger of repeatedly clicking a frozen application?", a: "It overloads the CPU with queued commands, making the crash worse", d: ["It breaks the physical mouse", "It permanently deletes the application", "It sends a virus to the server"] },
        { cat: "Troubleshooting Strategy", val: 400, q: "If a lab computer won't connect to the internet, what is the first *hardware* thing you should check?", a: "The physical Ethernet cable connection", d: ["The brand of the monitor", "The amount of RAM installed", "The CPU temperature"] },

        { cat: "Troubleshooting Strategy", val: 500, q: "How does the 'Divide and Conquer' strategy mirror the scientific method?", a: "You form a hypothesis, test one variable, and observe the result", d: ["You guess randomly until it works", "You buy new equipment", "You ignore the problem"] },
        { cat: "Troubleshooting Strategy", val: 500, q: "Why is systematic troubleshooting considered a core 'Power User' skill?", a: "It shifts the user from relying on luck to relying on logical deduction", d: ["It makes the user type faster", "It gives the user admin rights automatically", "It prevents computers from ever breaking"] },
        { cat: "Troubleshooting Strategy", val: 500, q: "If a computer won't turn on at all, what is the first logical layer to isolate?", a: "The Power Supply or wall outlet", d: ["The Operating System", "The Application Software", "The Network Connection"] },

        // --- CATEGORY: RESEARCH & FLOWCHARTS ---
        { cat: "Research & Flowcharts", val: 100, q: "What is the best tool for researching a computer problem you don't know how to fix?", a: "A search engine like Google", d: ["A calculator", "A word processor", "A physical encyclopedia"] },
        { cat: "Research & Flowcharts", val: 100, q: "A visual diagram used to map out a step-by-step troubleshooting process.", a: "A Flowchart", d: ["A Spreadsheet", "A Blueprint", "A Mind Map"] },
        { cat: "Research & Flowcharts", val: 100, q: "When searching for a fix, what specific information gives the best results?", a: "The exact error code shown on screen", d: ["The color of your computer", "The day of the week", "A generic complaint like 'it broke'"] },

        { cat: "Research & Flowcharts", val: 200, q: "Why do we build troubleshooting flowcharts?", a: "To create clear guidelines that others can use to fix an error", d: ["To make the screen look colorful", "To hide the solution from users", "To generate code automatically"] },
        { cat: "Research & Flowcharts", val: 200, q: "What is a 'Forum' in the context of troubleshooting?", a: "An online community where users post problems and solutions", d: ["A physical meeting room", "A type of error message", "A piece of diagnostic hardware"] },
        { cat: "Research & Flowcharts", val: 200, q: "If your Adobe app keeps crashing, what should you search for?", a: "The name of the app, the version, and the specific crash symptom", d: ["Just the word 'Adobe'", "How to fix a broken computer", "The history of Adobe"] },

        { cat: "Research & Flowcharts", val: 300, q: "Why is it important to describe software glitches 'effectively' in a search engine?", a: "Vague searches like 'my PC broke' return millions of useless results", d: ["Search engines charge per word", "It prevents the computer from freezing", "It deletes viruses"] },
        { cat: "Research & Flowcharts", val: 300, q: "In a troubleshooting flowchart, what shape is typically used for a 'Yes/No' question?", a: "A Decision Diamond", d: ["A Process Rectangle", "An End Oval", "A Start Circle"] },
        { cat: "Research & Flowcharts", val: 300, q: "What is official 'Documentation'?", a: "Manuals and guides provided directly by the software developer", d: ["Random blogs on the internet", "The raw code of the program", "A physical textbook"] },

        { cat: "Research & Flowcharts", val: 400, q: "Why are tech support forums (like Stack Overflow or Reddit) highly valuable for Power Users?", a: "You can find solutions from people who have already solved your exact problem", d: ["They give away free software", "They automatically hack your computer", "They write your essays for you"] },
        { cat: "Research & Flowcharts", val: 400, q: "How does a flowchart help standard 9-12.CS.T.1 (Systematic Troubleshooting)?", a: "It forces the creator to map out logical, sequential steps to isolate a fault", d: ["It draws pictures of hardware", "It encrypts network passwords", "It compresses large error files"] },
        { cat: "Research & Flowcharts", val: 400, q: "If a search result is from 10 years ago, why might it be a bad solution?", a: "Software and Operating Systems change rapidly; old fixes may break modern systems", d: ["The internet was slower back then", "Error codes expire after a year", "It was written in binary"] },

        { cat: "Research & Flowcharts", val: 500, q: "Why is evaluating the 'source' of a troubleshooting fix important?", a: "Running random commands from untrusted sites can download malware", d: ["Trusted sites charge money", "Search engines are always correct", "It is illegal to use forums"] },
        { cat: "Research & Flowcharts", val: 500, q: "How do troubleshooting flowcharts utilize Boolean logic?", a: "They use IF/THEN paths based on whether a symptom is present or resolved", d: ["They use variables to store error codes", "They loop forever", "They translate English to code"] },
        { cat: "Research & Flowcharts", val: 500, q: "What is the ultimate goal of completing the 'Troubleshooting Flowchart' activity?", a: "To codify a mental process into a reusable, shareable diagnostic tool", d: ["To draw a pretty picture", "To memorize error codes", "To replace IT workers entirely"] },

        // --- CATEGORY: MAINTENANCE & BACKUPS ---
        { cat: "Maintenance & Backups", val: 100, q: "The golden rule of data protection is called the Rule of:", a: "3-2-1", d: ["5-4-3", "1-2-3", "10-1"] },
        { cat: "Maintenance & Backups", val: 100, q: "What is a 'Software Update'?", a: "A download that fixes bugs, patches security, and adds features", d: ["A tool that makes your screen brighter", "A physical hardware replacement", "A new computer case"] },
        { cat: "Maintenance & Backups", val: 100, q: "Why should you safely remove unused programs?", a: "To free up storage space and keep the machine efficient", d: ["To make the Wi-Fi faster", "To save electricity", "Because it is illegal to keep them"] },

        { cat: "Maintenance & Backups", val: 200, q: "In the 3-2-1 Rule, what does the '1' stand for?", a: "1 copy offsite or in the cloud", d: ["1 main computer", "1 hour of backup time", "1 specific hard drive"] },
        { cat: "Maintenance & Backups", val: 200, q: "In the 3-2-1 Rule, you should have 3 total copies of data, on how many different media types?", a: "2", d: ["3", "1", "4"] },
        { cat: "Maintenance & Backups", val: 200, q: "What is a 'Security Patch'?", a: "An update specifically designed to fix holes that hackers could use", d: ["A piece of tape on a webcam", "An antivirus scanner", "A physical lock on a server"] },

        { cat: "Maintenance & Backups", val: 300, q: "What does it mean to 'Clear the Cache'?", a: "Deleting temporary files the computer saved to speed up loading, which can sometimes cause glitches", d: ["Emptying the recycle bin", "Wiping the entire hard drive", "Cleaning the physical keyboard"] },
        { cat: "Maintenance & Backups", val: 300, q: "Why is an ignored system update dangerous?", a: "It leaves known security vulnerabilities open to hackers", d: ["It voids your computer's warranty", "It breaks the power supply", "It slows down internet speeds"] },
        { cat: "Maintenance & Backups", val: 300, q: "What is the difference between a Local Backup and a Cloud Backup?", a: "Local is on a physical drive you own; Cloud is on a remote server over the internet", d: ["Local is fast; Cloud is illegal", "Cloud is free; Local is expensive", "There is no difference"] },

        { cat: "Maintenance & Backups", val: 400, q: "What is the risk of having all 3 copies of your data in the exact same physical building?", a: "A fire, flood, or theft could destroy all copies at once", d: ["The hard drives will overheat", "They will run out of space", "The data will slowly delete itself"] },
        { cat: "Maintenance & Backups", val: 400, q: "How does 'Digital Housekeeping' improve computer performance?", a: "It prevents the hard drive from filling up, which allows the OS to run smoothly", d: ["It cleans the dust from the fans", "It upgrades the CPU automatically", "It gives you more RAM"] },
        { cat: "Maintenance & Backups", val: 400, q: "Why do software developers release updates instead of just making perfect software the first time?", a: "Modern software is too complex to catch every bug before release", d: ["They want to annoy users", "They charge money for updates", "They are lazy"] },

        { cat: "Maintenance & Backups", val: 500, q: "What is the 'Cost of Data Loss' for a professional business?", a: "Massive financial loss, lawsuits, and a ruined reputation", d: ["Having to buy new hard drives", "Employees going home early", "A slow internet connection"] },
        { cat: "Maintenance & Backups", val: 500, q: "How does the 3-2-1 backup strategy specifically protect against Ransomware attacks?", a: "If local drives are locked, an offsite cloud backup can restore the data instantly", d: ["It physically blocks hackers", "It encrypts the hackers' files", "It pays the ransom automatically"] },
        { cat: "Maintenance & Backups", val: 500, q: "Why must a Logic Builder treat computer maintenance as an ongoing process rather than a one-time setup?", a: "Because software environments, security threats, and data needs constantly evolve", d: ["Because computers break every week", "Because warranties expire quickly", "Because hardware rusts"] }
    ].map(item => ({ ...item, chapter: "Chapter 2", grade: "CS & Literacy Guild" })));
    
})();