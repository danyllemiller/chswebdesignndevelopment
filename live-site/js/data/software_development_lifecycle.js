/**
 * CHAPTER 15: The Software Development Lifecycle
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
        // --- CATEGORY: THE SDLC CYCLE ---
        { cat: "The SDLC Cycle", val: 100, q: "What does SDLC stand for?", a: "Software Development Lifecycle", d: ["System Data Logic Code", "Server Domain Link Controller", "Software Design List Creation"] },
        { cat: "The SDLC Cycle", val: 100, q: "What is the first stage of the SDLC?", a: "Plan", d: ["Build", "Test", "Maintain"] },
        { cat: "The SDLC Cycle", val: 100, q: "Building a version, finding flaws, and using feedback to improve is called:", a: "Iterative Design", d: ["Linear Programming", "Static Modeling", "Database Exfiltration"] },

        { cat: "The SDLC Cycle", val: 200, q: "Which SDLC stage involves writing the actual code and building data structures?", a: "Build", d: ["Plan", "Design", "Test"] },
        { cat: "The SDLC Cycle", val: 200, q: "Which SDLC stage involves creating prototypes and mapping out algorithms?", a: "Design", d: ["Maintain", "Test", "Build"] },
        { cat: "The SDLC Cycle", val: 200, q: "Which SDLC stage involves giving the program to users to find bugs?", a: "Test", d: ["Plan", "Maintain", "Design"] },

        { cat: "The SDLC Cycle", val: 300, q: "What is the goal of the 'Maintain' phase?", a: "Fixing security holes and adding features after release", d: ["Writing the first line of code", "Drawing a low-fidelity sketch", "Buying physical hardware"] },
        { cat: "The SDLC Cycle", val: 300, q: "Why is the SDLC described as a 'Cycle' rather than a straight line?", a: "Because software is constantly improved and iterated upon", d: ["Because computers run in circles", "Because code is written backwards", "Because hard drives spin"] },
        { cat: "The SDLC Cycle", val: 300, q: "Fixing an error in the Design phase is cheaper than in the Maintain phase because:", a: "Changing a sketch takes minutes; changing live code takes weeks", d: ["Paper is cheaper than electricity", "Programmers work for free", "The internet is faster during design"] },

        { cat: "The SDLC Cycle", val: 400, q: "What is a major mistake beginners make during the 'Plan' phase?", a: "Building the app only for themselves instead of a specific audience", d: ["Writing too much pseudocode", "Using too many flowcharts", "Buying too much RAM"] },
        { cat: "The SDLC Cycle", val: 400, q: "Defining the problem, audience, and hardware requirements happens before:", a: "Writing any code", d: ["Turning on the monitor", "Buying the software", "Erasing the hard drive"] },
        { cat: "The SDLC Cycle", val: 400, q: "The SDLC is the professional 'Map' used to take an idea from a rough sketch to a:", a: "Finished, accessible product", d: ["Broken, static website", "Printed word document", "Physical computer chip"] },

        { cat: "The SDLC Cycle", val: 500, q: "How does the Iterative Design Process view failure?", a: "As a necessary tool to make the next version better", d: ["As a reason to give up", "As a hardware malfunction", "As an illegal action"] },
        { cat: "The SDLC Cycle", val: 500, q: "If users demand a new feature a year after an app launches, which SDLC phase handles this?", a: "Maintain", d: ["Plan", "Design", "Test"] },
        { cat: "The SDLC Cycle", val: 500, q: "Which phase directly transitions a logic plan into a working Google Apps Script?", a: "Build", d: ["Test", "Maintain", "Plan"] },

        // --- CATEGORY: USER TESTING ---
        { cat: "User Testing", val: 100, q: "What is the most valuable data a developer can have when testing an app?", a: "User Feedback", d: ["CPU clock speed", "Length of the code", "Color of the icons"] },
        { cat: "User Testing", val: 100, q: "A real user who hasn't seen the code and tries to use the program to find bugs.", a: "Beta Tester", d: ["Lead Programmer", "Project Manager", "Database Admin"] },
        { cat: "User Testing", val: 100, q: "A specific moment where a user gets confused or frustrated by an app.", a: "Pain Point", d: ["Syntax Error", "Dead Pixel", "Hardware Bug"] },

        { cat: "User Testing", val: 200, q: "Why should a developer stay silent while a user tests their app?", a: "To see if the interface is intuitive without explanation", d: ["It is a secret project", "To not distract the CPU", "Because developers don't know either"] },
        { cat: "User Testing", val: 200, q: "What is the main goal of a Beta Test?", a: "To have a user try to break the program to find confusing parts", d: ["To sell the app to a classmate", "To show off good code", "To test Wi-Fi speed"] },
        { cat: "User Testing", val: 200, q: "If a user clicks the 'wrong' button three times, what does this indicate?", a: "A design flaw the developer must fix", d: ["A broken mouse", "A stubborn user", "A computer virus"] },

        { cat: "User Testing", val: 300, q: "How do you know if an app is truly good?", a: "You don't guess; you ask the user", d: ["You measure the file size", "You count the variables", "You use the most expensive code"] },
        { cat: "User Testing", val: 300, q: "Why must you know your audience's 'physical environment'?", a: "It dictates UX choices, like large buttons for gloved hands", d: ["It changes the programming language", "It increases software cost", "It deletes the database"] },
        { cat: "User Testing", val: 300, q: "What is a 'Think Aloud' during a user interview?", a: "Asking the user to speak their thoughts as they click through the app", d: ["Playing loud music while testing", "Making the computer read text", "Shouting at the screen"] },

        { cat: "User Testing", val: 400, q: "After identifying a 'Pain Point,' what must a developer do?", a: "Write a specific logic or design change to fix it in the next iteration", d: ["Ignore it and hope users adapt", "Delete the app completely", "Blame the hardware"] },
        { cat: "User Testing", val: 400, q: "What is the danger of a programmer testing their own app?", a: "They are too close to the code and have 'Blind Spots'", d: ["They will accidentally delete it", "They don't have enough RAM", "They type too quickly"] },
        { cat: "User Testing", val: 400, q: "A construction worker needing large buttons on a job site is an example of designing for:", a: "The user's physical environment", d: ["The hardware budget", "The network speed", "The cloud storage limit"] },

        { cat: "User Testing", val: 500, q: "How does User Testing move an app from 'Beta' to 'Final'?", a: "By exposing real-world flaws that the developer couldn't predict", d: ["By making the app cost more money", "By translating it to French", "By changing the background color"] },
        { cat: "User Testing", val: 500, q: "What does the 'Silent Observation' technique prove about an app?", a: "Whether the UX/UI can guide a user without external help", d: ["Whether the CPU is overheating", "Whether the network is secure", "Whether the code is object-oriented"] },
        { cat: "User Testing", val: 500, q: "If a Beta Tester types text into a number cell and the app crashes, what should the developer add?", a: "Data Validation or an Error Handler", d: ["More RAM", "A new screen", "A faster Wi-Fi card"] },

        // --- CATEGORY: ACCESSIBILITY ---
        { cat: "Accessibility", val: 100, q: "Ensuring software can be used by the widest range of people, including those with disabilities.", a: "Accessibility", d: ["Encryption", "Scalability", "Open Source"] },
        { cat: "Accessibility", val: 100, q: "Using black text on a white background is an example of what design principle?", a: "High Contrast", d: ["Low Fidelity", "Zero-based Indexing", "Network Topology"] },
        { cat: "Accessibility", val: 100, q: "An assistive technology that reads the text of a screen out loud.", a: "Screen Reader", d: ["Code Compiler", "Task Manager", "Graphics Card"] },

        { cat: "Accessibility", val: 200, q: "A written description of an image for visually impaired users.", a: "Alt Text", d: ["Source Code", "Header Tag", "Caption Box"] },
        { cat: "Accessibility", val: 200, q: "Keeping an interface simple and intuitive helps users with this type of impairment.", a: "Cognitive", d: ["Motor", "Visual", "Auditory"] },
        { cat: "Accessibility", val: 200, q: "Why should an app be navigable using only the 'Tab' and 'Enter' keys?", a: "For users with motor impairments who cannot use a mouse", d: ["Because keyboards are cheaper", "Because it saves electricity", "To make it unhackable"] },

        { cat: "Accessibility", val: 300, q: "Why is using light gray text on a white background a bad accessibility choice?", a: "It lacks high contrast, making it hard to read", d: ["It uses too much printer ink", "It makes the file size large", "It crashes the browser"] },
        { cat: "Accessibility", val: 300, q: "How can a developer simulate colorblindness to test their app?", a: "By using a high-contrast check or colorblind filter", d: ["By unplugging the monitor", "By closing their eyes", "By turning down brightness"] },
        { cat: "Accessibility", val: 300, q: "Why are clear 'Headers' in a spreadsheet important for a screen reader?", a: "They give structure to what would otherwise be a confusing list of numbers", d: ["They add color to the screen", "They compress the file", "They stop hackers"] },

        { cat: "Accessibility", val: 400, q: "What is the goal of 'Refinement for Usability'?", a: "Simplifying a complex interface so it is intuitive for a broad audience", d: ["Making code more complicated", "Adding a hundred features", "Raising the app price"] },
        { cat: "Accessibility", val: 400, q: "If a button on a mobile app is too small for a user to easily tap, what kind of issue is this?", a: "An accessibility and usability issue", d: ["A hardware issue", "A network issue", "A database issue"] },
        { cat: "Accessibility", val: 400, q: "Designing software is creating a 'Public Space', meaning developers have an ethical responsibility to practice:", a: "Inclusive Design", d: ["Digital Piracy", "Proprietary Locking", "Data Exfiltration"] },

        { cat: "Accessibility", val: 500, q: "How does fixing accessibility often improve the app for everyone?", a: "A simple, clear design is easier for all users to navigate", d: ["It makes the graphics 3D", "It adds new secret levels", "It uses more electricity"] },
        { cat: "Accessibility", val: 500, q: "What is the risk of an 'Accessibility Audit' performed only by people without disabilities?", a: "They may miss blind spots that actual assistive technology users face", d: ["They will delete the code", "They will break the monitor", "They will run out of time"] },
        { cat: "Accessibility", val: 500, q: "Why are 'Keyboard Shortcuts' considered both a Power User tool and an Accessibility requirement?", a: "They allow fast navigation without requiring fine motor mouse control", d: ["They use less RAM than a mouse", "They are legally required by Google", "They look cooler"] },

        // --- CATEGORY: TEAM ROLES & VERSION CONTROL ---
        { cat: "Team Roles & Version Control", val: 100, q: "A system that tracks changes to a file and prevents teammates from overwriting each other's work.", a: "Version Control", d: ["Volume Control", "Hardware Control", "Software License"] },
        { cat: "Team Roles & Version Control", val: 100, q: "The industry-standard professional tool for version control.", a: "Git / GitHub", d: ["Google Docs", "Microsoft Word", "Adobe Photoshop"] },
        { cat: "Team Roles & Version Control", val: 100, q: "In Google Drive, what feature acts as a basic form of version control?", a: "Version History", d: ["Search Bar", "Google Translate", "Spell Check"] },

        { cat: "Team Roles & Version Control", val: 200, q: "The 'Captain' who manages the timeline and communicates with the audience.", a: "Project Manager", d: ["Programmer", "Designer UX/UI", "Hardware Tech"] },
        { cat: "Team Roles & Version Control", val: 200, q: "The 'Architect' who focuses on the visual interface, user experience, and accessibility.", a: "Designer UX/UI", d: ["Project Manager", "Database Admin", "Programmer"] },
        { cat: "Team Roles & Version Control", val: 200, q: "The 'Builder' who writes the logic, algorithms, and data structures.", a: "Programmer / Developer", d: ["UX Designer", "Project Manager", "Beta Tester"] },

        { cat: "Team Roles & Version Control", val: 300, q: "What does it mean to 'Roll Back' a version?", a: "Reverting the code to an older, working state if an update breaks it", d: ["Deleting the entire project", "Sending code to a server", "Fast-forwarding to the end"] },
        { cat: "Team Roles & Version Control", val: 300, q: "Why is professional software considered a 'Team Sport'?", a: "Massive systems require the coordination of many people with different specific roles", d: ["It involves playing video games", "There is a winner and a loser", "Everyone types on one keyboard"] },
        { cat: "Team Roles & Version Control", val: 300, q: "Why is it dangerous for everyone on a team to act as the 'Programmer'?", a: "The app might miss deadlines or have a terrible user interface", d: ["Computers will overheat", "Code will be too secure", "It is illegal"] },

        { cat: "Team Roles & Version Control", val: 400, q: "When should a Logic Builder 'Commit' or save a version of their code?", a: "Every time they finish a sub-problem or specific task", d: ["Only at the end of the year", "Never", "Before starting to type"] },
        { cat: "Team Roles & Version Control", val: 400, q: "If an app is too hard to read in the sun, which role is responsible for fixing the contrast?", a: "Designer UX/UI", d: ["Programmer", "Project Manager", "Database Admin"] },
        { cat: "Team Roles & Version Control", val: 400, q: "If the team is falling behind schedule, which role steps in to adjust the plan?", a: "Project Manager", d: ["Designer", "Programmer", "User"] },

        { cat: "Team Roles & Version Control", val: 500, q: "How does Version Control act as a 'Safety Net'?", a: "It allows developers to experiment without fear of permanently destroying the master code", d: ["It stops hackers from stealing passwords", "It makes the PC faster", "It connects to Wi-Fi"] },
        { cat: "Team Roles & Version Control", val: 500, q: "If an app needs a new database table to store high scores, which role is primarily responsible?", a: "Programmer / Developer", d: ["Designer UX/UI", "Project Manager", "Beta Tester"] },
        { cat: "Team Roles & Version Control", val: 500, q: "What happens in cloud collaboration if there is no 'Single Source of Truth'?", a: "Multiple conflicting files are created, leading to data loss and confusion", d: ["The internet crashes", "The code writes itself", "The servers turn off"] },

        // --- CATEGORY: DOCUMENTATION ---
        { cat: "Documentation", val: 100, q: "Written explanations, screenshots, and diagrams that explain the code.", a: "Documentation", d: ["Source Code", "End User License", "Hardware Specs"] },
        { cat: "Documentation", val: 100, q: "Why is documenting your design decisions critical for a team?", a: "Because teammates won't understand complex logic without an explanation", d: ["It takes up extra storage", "It makes code run faster", "Computers need it to read code"] },
        { cat: "Documentation", val: 100, q: "If you leave a tech company, what ensures the project doesn't fall apart?", a: "High-quality, detailed documentation left behind", d: ["A strong password", "Locking the code", "Taking the hard drive"] },

        { cat: "Documentation", val: 200, q: "What is the primary purpose of a 'Pitch Deck'?", a: "To explain the problem, audience, and the logic engine of the app", d: ["To write the raw code", "To buy a server", "To show the cost of the app"] },
        { cat: "Documentation", val: 200, q: "What should be included in a professional documentation screenshot?", a: "Annotations like arrows pointing to specific code blocks", d: ["A selfie of the programmer", "Random colors", "Just error messages"] },
        { cat: "Documentation", val: 200, q: "Documentation explains the 'How' of the code and the:", a: "'Why' behind the design choices", d: ["'Where' the server is located", "'Who' bought the app", "'When' the computer turns off"] },

        { cat: "Documentation", val: 300, q: "If you chose a Linked List instead of an Array, where would you explain that choice?", a: "In the Technical Documentation", d: ["In the Database", "In the Hardware Specs", "In the CSS styling"] },
        { cat: "Documentation", val: 300, q: "Why is raw code not considered 'Documentation'?", a: "Code tells the computer what to do, but doesn't explain human intent to other programmers", d: ["Code is too colorful", "Code is illegal to read", "Code changes too often"] },
        { cat: "Documentation", val: 300, q: "What is an 'Annotation' in documentation?", a: "A visual note, like an arrow or text box, added to a screenshot to clarify logic", d: ["A piece of hardware", "A broken link", "A loop counter"] },

        { cat: "Documentation", val: 400, q: "How does documentation help in the 'Maintain' phase of the SDLC?", a: "It helps future developers understand how to fix or upgrade the code safely", d: ["It automatically patches bugs", "It speeds up the Wi-Fi", "It deletes old databases"] },
        { cat: "Documentation", val: 400, q: "A 'Technical Document' or 'Pitch Deck' usually begins by defining these two things:", a: "The Problem and the Audience", d: ["The Price and the Color", "The CPU and the RAM", "The HTML and the CSS"] },
        { cat: "Documentation", val: 400, q: "Why is it important to document a change made after a Beta Test?", a: "It provides a record of how user feedback improved the product", d: ["It allows you to sue the beta tester", "It generates more code", "It deletes previous versions"] },

        { cat: "Documentation", val: 500, q: "How does documentation serve as the 'Instruction Manual' for an interrelated system?", a: "It maps the precise inputs and outputs expected by each module", d: ["It encrypts the entire network", "It builds the physical servers", "It writes the loops automatically"] },
        { cat: "Documentation", val: 500, q: "Without documentation, a complex 'Spaghetti Mess' of code becomes a:", a: "Black Box that no one knows how to fix", d: ["Perfectly organized program", "Hardware failure", "Cloud server"] },
        { cat: "Documentation", val: 500, q: "In professional environments, why is writing documentation considered a core job requirement for programmers?", a: "Because code must outlive the original author to be sustainable", d: ["Because computers can't read raw code", "Because it uses more printer paper", "Because it slows the system down"] }
    ].map(item => ({ ...item, chapter: "Chapter 15", grade: "CS & Literacy Guild" })));
    
})();