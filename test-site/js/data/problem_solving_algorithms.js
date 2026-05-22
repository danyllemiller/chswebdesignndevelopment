/**
 * CS & LITERACY GUILD: GAMES DATA - CHAPTER 11
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

    window.migrationPool = window.migrationPool || []; 
    
    // ============================================================================
    // CHAPTER 11: PROBLEM SOLVING & ALGORITHMS (75 Questions)
    // Categories: Decomposition, Algorithms, Pseudocode, Flowcharts, Prototyping
    // ============================================================================
    const ch11Data = [
        // --- CATEGORY: DECOMPOSITION ---
        { cat: "Decomposition", val: 100, q: "The process of breaking a complex problem down into smaller, manageable parts.", a: "Decomposition", d: ["Prototyping", "Looping", "Flowcharting"] },
        { cat: "Decomposition", val: 100, q: "A specific, smaller task that can stand on its own within a larger project.", a: "Sub-problem", d: ["Bug", "Hardware", "Network"] },
        { cat: "Decomposition", val: 100, q: "Why do programmers use decomposition?", a: "To prevent failure from tackling massive problems all at once", d: ["To make the CPU faster", "To encrypt data", "To hide code"] },
        { cat: "Decomposition", val: 200, q: "A step-by-step list of instructions or actions in Systematic Analysis.", a: "Procedure", d: ["Object", "Variable", "Module"] },
        { cat: "Decomposition", val: 200, q: "A self-contained toolbox or group of related tasks.", a: "Module", d: ["Procedure", "Variable", "Object"] },
        { cat: "Decomposition", val: 200, q: "A component representing a 'noun' or thing with its own data.", a: "Object", d: ["Procedure", "Module", "Action"] },
        { cat: "Decomposition", val: 300, q: "Finding a step so small it cannot be broken down any further.", a: "Atomic Task", d: ["Infinite Loop", "Dead End", "Giant Chunk"] },
        { cat: "Decomposition", val: 300, q: "The first step in the 4-Step Decomposition Strategy.", a: "Define the Goal", d: ["Write the Code", "Draw a Diamond", "Buy a Server"] },
        { cat: "Decomposition", val: 300, q: "Why do large tech companies use Decomposition?", a: "It allows different teams to work on pieces simultaneously", d: ["It uses less electricity", "It hides code from rivals", "It costs more money"] },
        { cat: "Decomposition", val: 400, q: "How does decomposition make troubleshooting easier?", a: "It isolates problems to specific sub-tasks", d: ["It encrypts the bug", "It speeds up the CPU", "It deletes viruses"] },
        { cat: "Decomposition", val: 400, q: "When breaking down a 'Video Game', which is a clear sub-problem?", a: "Player Movement", d: ["Turn on monitor", "Plug in mouse", "Buy the game"] },
        { cat: "Decomposition", val: 400, q: "Categorizing tasks into procedures, modules, and objects is known as:", a: "Systematic Analysis", d: ["Phishing", "Data Mining", "Encryption"] },
        { cat: "Decomposition", val: 500, q: "Problem solving is an 'Art' because...", a: "Many valid algorithms can solve the same problem", d: ["Computers can paint", "Code must be colorful", "There is only one right answer"] },
        { cat: "Decomposition", val: 500, q: "What builds the 'Architecture' of your logic?", a: "Categorizing sub-problems into structured components", d: ["Buying expensive hardware", "Drawing colorful flowcharts", "Using the fastest Wi-Fi"] },
        { cat: "Decomposition", val: 500, q: "In the 4-step strategy, what do you do after you 'Split the Chunks'?", a: "Identify the Atom", d: ["Define the Goal", "Delete the File", "Run the Code"] },

        // --- CATEGORY: ALGORITHMS ---
        { cat: "Algorithms", val: 100, q: "A finite set of precise instructions designed to solve a specific problem.", a: "Algorithm", d: ["Hardware", "Database", "Loop"] },
        { cat: "Algorithms", val: 100, q: "Why must an algorithm be 'finite'?", a: "So it finishes and doesn't get stuck in a loop", d: ["So humans can read it", "So it fits on the hard drive", "So it can be encrypted"] },
        { cat: "Algorithms", val: 100, q: "A real-world example of an algorithm.", a: "A cookie recipe", d: ["A dictionary", "A flat file", "A photograph"] },
        { cat: "Algorithms", val: 200, q: "What makes an algorithm different from a list of facts?", a: "It provides actionable instructions to achieve a result", d: ["It is longer", "It is encrypted", "It is stored in a database"] },
        { cat: "Algorithms", val: 200, q: "The main lesson of the 'Robot Breakfast Challenge'.", a: "Computers are literal and need precise instructions", d: ["Robots can cook", "Humans are smarter", "Peanut butter ruins circuits"] },
        { cat: "Algorithms", val: 200, q: "What does it mean for an instruction to be 'precise'?", a: "It leaves no room for misinterpretation", d: ["It uses big words", "It is very long", "It is written in English"] },
        { cat: "Algorithms", val: 300, q: "When translating natural language to a computer, what is the biggest challenge?", a: "Removing human ambiguity and assuming zero common sense", d: ["Translating to Spanish", "Making the computer speak", "Finding the right keyboard"] },
        { cat: "Algorithms", val: 300, q: "If an algorithm runs forever without solving the problem, it has hit a(n):", a: "Infinite Loop", d: ["Dead End", "Syntax Error", "Hardware Crash"] },
        { cat: "Algorithms", val: 300, q: "In the Robot Breakfast, why did the robot smash the jar?", a: "The instruction failed to specify 'Open the jar first'", d: ["The robot was angry", "The bread was too hard", "It ran out of battery"] },
        { cat: "Algorithms", val: 400, q: "Algorithms are considered the 'Engines' of software because...", a: "They power the logic that achieves the software's goals", d: ["They generate electricity", "They run the cooling fans", "They create the GUI"] },
        { cat: "Algorithms", val: 400, q: "What is an algorithm's relationship to 'Sub-problems'?", a: "Algorithms are designed to solve specific sub-problems", d: ["They encrypt sub-problems", "They delete sub-problems", "They hide sub-problems"] },
        { cat: "Algorithms", val: 400, q: "A 'Logic Error' in an algorithm means...", a: "The math or the path is wrong, so the result is wrong", d: ["A word is misspelled", "The computer lost power", "The network disconnected"] },
        { cat: "Algorithms", val: 500, q: "Why is a clear 'Start' and 'End' required for an algorithm?", a: "To establish finite boundaries for execution", d: ["To make it colorful", "To save hard drive space", "To prevent physical damage"] },
        { cat: "Algorithms", val: 500, q: "How do GPS apps utilize algorithms?", a: "By calculating the fastest path through thousands of streets", d: ["By guessing directions", "By calling a human operator", "By randomly moving the car"] },
        { cat: "Algorithms", val: 500, q: "The process of evaluating if an algorithm actually works in the real world.", a: "Testing for Feasibility", d: ["Syntax Checking", "Hardware Mounting", "Data Mining"] },

        // --- CATEGORY: PSEUDOCODE ---
        { cat: "Pseudocode", val: 100, q: "Shorthand that looks like code but is meant for humans to read and plan logic.", a: "Pseudocode", d: ["Binary", "Hexadecimal", "Encryption"] },
        { cat: "Pseudocode", val: 100, q: "True or False: Pseudocode must compile and run perfectly in a programming language.", a: "False; it is meant for planning", d: ["True; it must be perfect", "True; it only works in Python", "True; it only works in Apps Script"] },
        { cat: "Pseudocode", val: 100, q: "Why use pseudocode instead of writing real code immediately?", a: "To plan logic without worrying about strict syntax rules", d: ["Because it runs faster", "To test hardware", "Because real code is illegal"] },
        { cat: "Pseudocode", val: 200, q: "The pseudocode keyword best used to ask a user for their age.", a: "INPUT", d: ["OUTPUT", "IF", "REPEAT"] },
        { cat: "Pseudocode", val: 200, q: "The pseudocode keyword best used to show an answer on the screen.", a: "OUTPUT", d: ["INPUT", "THEN", "WHILE"] },
        { cat: "Pseudocode", val: 200, q: "The pseudocode keyword used to make a decision.", a: "IF", d: ["REPEAT", "OUTPUT", "INPUT"] },
        { cat: "Pseudocode", val: 300, q: "What does 'shorthand' mean when referring to pseudocode?", a: "It uses quick, readable keywords instead of perfect syntax", d: ["It is typed very fast", "It uses no words, only symbols", "It is written in binary"] },
        { cat: "Pseudocode", val: 300, q: "The pseudocode keyword used to create a loop.", a: "REPEAT / WHILE", d: ["IF / THEN", "INPUT", "OUTPUT"] },
        { cat: "Pseudocode", val: 300, q: "What comes after an 'IF' condition in standard pseudocode?", a: "THEN", d: ["REPEAT", "INPUT", "END"] },
        { cat: "Pseudocode", val: 400, q: "Pseudocode bridges the gap between these two things.", a: "Human English and Computer Code", d: ["Hardware and Software", "RAM and CPU", "LAN and WAN"] },
        { cat: "Pseudocode", val: 400, q: "What is a major advantage of drafting pseudocode on a team?", a: "Anyone can read and understand the logic plan", d: ["It automatically creates the app", "It encrypts the data", "It runs 10x faster"] },
        { cat: "Pseudocode", val: 400, q: "How does pseudocode relate to the SDLC Design phase?", a: "It serves as the written blueprint for the algorithm", d: ["It is the final product sold to users", "It is a physical hardware sketch", "It tracks versions automatically"] },
        { cat: "Pseudocode", val: 500, q: "Which pseudocode structure best handles 'Ask for password until it is correct'?", a: "REPEAT UNTIL correct", d: ["IF correct THEN", "INPUT password", "OUTPUT error"] },
        { cat: "Pseudocode", val: 500, q: "Which pseudocode snippet correctly models a thermostat?", a: "IF temp < 70 THEN OUTPUT heat", d: ["INPUT heat OUTPUT temp", "REPEAT temp 70 times", "WHILE heat > temp"] },
        { cat: "Pseudocode", val: 500, q: "What happens if pseudocode lacks a clear 'END' instruction?", a: "The human reader cannot determine the algorithm's boundaries", d: ["The computer will explode", "The file will delete itself", "The syntax will fail to compile"] },

        // --- CATEGORY: FLOWCHARTS ---
        { cat: "Flowcharts", val: 100, q: "In a flowchart, what does an Oval represent?", a: "The Start or End", d: ["A decision", "A process", "An error"] },
        { cat: "Flowcharts", val: 100, q: "In a flowchart, what does a Diamond represent?", a: "A decision or Yes/No question", d: ["The Start", "A math calculation", "The End"] },
        { cat: "Flowcharts", val: 100, q: "In a flowchart, what does a Rectangle represent?", a: "A process, command, or action", d: ["A decision", "The End", "User Input"] },
        { cat: "Flowcharts", val: 200, q: "How many arrows usually come out of a Decision Diamond?", a: "Two (usually Yes and No)", d: ["One", "Three", "None"] },
        { cat: "Flowcharts", val: 200, q: "Which shape would represent: 'Is the player's health zero?'", a: "Diamond", d: ["Rectangle", "Oval", "Square"] },
        { cat: "Flowcharts", val: 200, q: "Which shape would represent: 'Add 10 to Score'?", a: "Rectangle", d: ["Diamond", "Oval", "Triangle"] },
        { cat: "Flowcharts", val: 300, q: "What is the main benefit of drawing a flowchart before coding?", a: "It makes it easy to spot logic errors or dead ends visually", d: ["It generates code automatically", "It encrypts data", "It makes code run faster"] },
        { cat: "Flowcharts", val: 300, q: "Why should a flowchart NEVER have a 'Dead End' arrow?", a: "The program crashes if it doesn't know what to do next", d: ["It wastes ink", "It looks messy", "The CPU overheats"] },
        { cat: "Flowcharts", val: 300, q: "In the Navigation Activity, what does 'Is hallway blocked?' represent?", a: "A Decision (Diamond)", d: ["A Process (Rectangle)", "Start (Oval)", "End (Oval)"] },
        { cat: "Flowcharts", val: 400, q: "What happens if an arrow out of a diamond points right back to that exact same diamond?", a: "An Infinite Loop is created", d: ["The program finishes", "The computer turns off", "Data is deleted"] },
        { cat: "Flowcharts", val: 400, q: "What is a 'Logic Error' in a flowchart?", a: "A flaw in the path, like an impossible choice or missing step", d: ["A spelling mistake", "Using wrong colors", "Disconnected keyboard"] },
        { cat: "Flowcharts", val: 400, q: "In a flowchart, what shape is used for 'INPUT passcode'?", a: "Parallelogram", d: ["Diamond", "Oval", "Rectangle"] },
        { cat: "Flowcharts", val: 500, q: "If a diamond has only one arrow coming out of it, what is the flaw?", a: "The computer won't know what to do for the other possible answer", d: ["The arrow is too short", "It needs to be a rectangle", "The program runs too fast"] },
        { cat: "Flowcharts", val: 500, q: "How do flowcharts aid in 'Systematic Analysis'?", a: "They map exactly how Procedures and Objects interact visually", d: ["They compile into machine code", "They test hardware RAM", "They compress large files"] },
        { cat: "Flowcharts", val: 500, q: "Which of these is NOT a standard flowchart shape from Chapter 11?", a: "Star", d: ["Oval", "Diamond", "Rectangle"] },

        // --- CATEGORY: PROTOTYPING ---
        { cat: "Prototyping", val: 100, q: "A rough draft used to test an idea's feasibility before full-scale development.", a: "Prototype", d: ["Final App", "Flowchart", "Processor"] },
        { cat: "Prototyping", val: 100, q: "What does 'Feasibility' mean in software development?", a: "Proving an idea is actually possible and practical to build", d: ["Making code colorful", "Encrypting databases", "Deleting old files"] },
        { cat: "Prototyping", val: 100, q: "What is a 'Low-Fidelity' prototype?", a: "A simple, cheap mockup like a paper sketch or slide presentation", d: ["A fully coded app", "A high-def video", "A 3D printed model"] },
        { cat: "Prototyping", val: 200, q: "Why is it better to fail on a low-fidelity prototype than on a finished app?", a: "It saves massive amounts of time, money, and coding frustration", d: ["It hurts less", "Finished apps cannot fail", "Prototypes are legally protected"] },
        { cat: "Prototyping", val: 200, q: "What is the best tool for designing an app prototype according to Chapter 11?", a: "Paper sketches or Google Slides", d: ["Advanced 3D rendering", "Live database servers", "Soldering irons"] },
        { cat: "Prototyping", val: 200, q: "Why is it dangerous to write code without prototyping first?", a: "You might spend weeks building something the user doesn't want", d: ["The code deletes itself", "Hackers steal it faster", "The computer crashes permanently"] },
        { cat: "Prototyping", val: 300, q: "What does 'Computational Problem Solving' entail?", a: "Identifying a real-world problem that can be solved with programmed logic", d: ["Fixing broken hardware", "Typing essays faster", "Memorizing shortcuts"] },
        { cat: "Prototyping", val: 300, q: "In the App Idea prototype, why is the algorithm more important than visual design?", a: "The algorithm is the engine that actually solves the problem", d: ["Visuals are expensive", "Users don't care about visuals", "Algorithms are legally required"] },
        { cat: "Prototyping", val: 300, q: "What is the purpose of leveraging prior hardware knowledge when prototyping?", a: "To ensure the app is actually possible on the intended device", d: ["To make it more expensive", "To write longer code", "To delete old files"] },
        { cat: "Prototyping", val: 400, q: "How do you transition from 'Static Build' to 'Engine' in the prototyping pipeline?", a: "By writing pseudocode for what happens under the hood of each button", d: ["By buying a faster CPU", "By compiling the binary", "By deleting the sketches"] },
        { cat: "Prototyping", val: 400, q: "What is the goal of a 'User Test' on a prototype?", a: "To watch where someone gets confused and fix logic before coding", d: ["To sell them the app", "To show off your graphics", "To test their Wi-Fi speed"] },
        { cat: "Prototyping", val: 400, q: "If your prototype uses Google Slides, how do you simulate buttons?", a: "Using hyperlinked shapes that jump to different slides", d: ["By writing Java code", "By pressing the spacebar", "By printing them out"] },
        { cat: "Prototyping", val: 500, q: "How does prototyping embody the 'Fail Fast' philosophy?", a: "It exposes logic errors in minutes rather than after weeks of coding", d: ["It forces the CPU to crash instantly", "It deletes bad code automatically", "It drops network packets quickly"] },
        { cat: "Prototyping", val: 500, q: "Which Unit 3 skill is vital when prototyping an app's 'Engine'?", a: "Identifying required Data Elements and Primary Keys", d: ["Formatting colors", "Sorting alphabetically", "Changing font sizes"] },
        { cat: "Prototyping", val: 500, q: "Before prototyping an app, a Logic Builder must clearly define this.", a: "The specific problem the app will solve", d: ["The price of the app", "The name of the database", "The color of the icon"] }
    ].map(item => ({ ...item, chapter: "Chapter 11", grade: "CS & Literacy Guild" }));

    // --- PUSH TO MASTER POOL ---
    window.migrationPool.push(...ch11Data);
    
})();