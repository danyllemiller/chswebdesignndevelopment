/**
 * CHAPTER 14: Modularity & Procedures
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
        // --- CATEGORY: MODULARITY & DRY ---
        { cat: "Modularity & DRY", val: 100, q: "A self-contained unit of code that performs one specific task.", a: "Module", d: ["Hardware", "Array", "Loop"] },
        { cat: "Modularity & DRY", val: 100, q: "Creating a 'Black Box' where you only need to know inputs and outputs is the ultimate form of:", a: "Abstraction", d: ["Encryption", "Hardware", "Iteration"] },
        { cat: "Modularity & DRY", val: 100, q: "What is a 'Black Box' in coding?", a: "A module where the inner workings are hidden from the user", d: ["A physical hard drive", "A broken PC", "A virus"] },

        { cat: "Modularity & DRY", val: 200, q: "What does the acronym 'DRY' stand for in coding?", a: "Don't Repeat Yourself", d: ["Do Read Your Code", "Data Requires Yields", "Digital RAM Yield"] },
        { cat: "Modularity & DRY", val: 200, q: "Why is the DRY principle considered the golden rule of programming?", a: "If you find a bug, you only have to fix it in one place", d: ["It makes the PC run cooler", "It uses less electricity", "It encrypts data"] },
        { cat: "Modularity & DRY", val: 200, q: "Writing the same math formula in 10 different places is bad because it violates:", a: "The DRY Principle", d: ["Copyright Law", "Zero-Based Indexing", "The OSI Model"] },

        { cat: "Modularity & DRY", val: 300, q: "How does a Module demonstrate Abstraction?", a: "You don't need to see the gears turning inside to use it", d: ["It deletes old files", "It makes the screen black", "It encrypts your password"] },
        { cat: "Modularity & DRY", val: 300, q: "Why do large tech companies build software using modular sections?", a: "Because massive systems must be snapped together from smaller, separate pieces", d: ["To save electricity", "To make it run slower", "Because proprietary software is illegal"] },
        { cat: "Modularity & DRY", val: 300, q: "In the Lego Analogy, what does a pre-built Lego piece represent?", a: "A Module or Library", d: ["A Variable", "A Syntax Error", "A Hardware component"] },

        { cat: "Modularity & DRY", val: 400, q: "Why is copying and pasting code a bad habit for a Logic Builder?", a: "It violates DRY and multiplies potential bugs", d: ["It uses up the clipboard", "It is illegal", "It deletes your files"] },
        { cat: "Modularity & DRY", val: 400, q: "What happens if a system is perfectly modular and you rewrite the inside of one module?", a: "The rest of the system keeps working perfectly", d: ["The entire system crashes", "The data is deleted", "All other modules must be rewritten"] },
        { cat: "Modularity & DRY", val: 400, q: "Modular code is highly 'Scalable' because:", a: "You can reuse the same blocks over and over as the program grows", d: ["It weighs less", "It changes colors automatically", "It forces users to buy new PCs"] },

        { cat: "Modularity & DRY", val: 500, q: "If you test a module by looking only at its inputs and outputs, ignoring the code inside, you are doing a:", a: "Black Box Test", d: ["Hardware Test", "Network Ping", "Virus Scan"] },
        { cat: "Modularity & DRY", val: 500, q: "How does Modularity affect teamwork?", a: "Different people can work on different modules simultaneously without breaking each other's code", d: ["Only one person can type at a time", "It forces teams to use the same keyboard", "It prevents collaboration"] },
        { cat: "Modularity & DRY", val: 500, q: "What is the ultimate goal of dividing a program into modules?", a: "To manage complexity and build massive professional systems with ease", d: ["To make the code look longer", "To hide data from hackers", "To use more RAM"] },

        // --- CATEGORY: PROCEDURES ---
        { cat: "Procedures", val: 100, q: "What do we call a named block of code that can be executed whenever needed?", a: "A Procedure or Function", d: ["A Variable", "An Event Handler", "An Array"] },
        { cat: "Procedures", val: 100, q: "When you break a program into 'Procedures', what problem-solving process are you using?", a: "Decomposition", d: ["Phishing", "Data Mining", "Encryption"] },
        { cat: "Procedures", val: 100, q: "In JavaScript, how do you define a function named 'ApplyDiscount'?", a: "function ApplyDiscount() { }", d: ["var ApplyDiscount = []", "loop ApplyDiscount()", "module ApplyDiscount = true"] },

        { cat: "Procedures", val: 200, q: "What is the main benefit of breaking logic into specific procedures?", a: "It prevents your code from becoming a confusing tangle", d: ["It uses more electricity", "It hides code from the user", "It creates random graphics"] },
        { cat: "Procedures", val: 200, q: "In Google Sheets, a custom procedure that returns a value directly into a cell is called a:", a: "Custom Function", d: ["Macro Virus", "Flat File", "Slicer"] },
        { cat: "Procedures", val: 200, q: "What is the difference between a Script and a Custom Function in Sheets?", a: "A custom function returns a value to a cell; a script runs an action", d: ["Scripts are only for Macs", "Custom functions cannot do math", "There is no difference"] },

        { cat: "Procedures", val: 300, q: "If you have a `PrintReceipt` procedure, it acts as an independent:", a: "\"Worker\" with a specific role", d: ["Physical printer", "Network router", "IP address"] },
        { cat: "Procedures", val: 300, q: "How do you trigger a procedure to run in your code?", a: "By \"calling\" its name", d: ["By deleting it", "By highlighting it in red", "By unplugging the computer"] },
        { cat: "Procedures", val: 300, q: "What is the advantage of using a custom function like `=CALCULATE_TAX()` in 1,000 cells?", a: "The math logic only lives in one place and can be updated instantly", d: ["It encrypts the spreadsheet", "It runs faster than basic math", "It prevents all typos"] },

        { cat: "Procedures", val: 400, q: "How do you create a custom function in Google Sheets?", a: "By writing a procedure in Apps Script and returning a value", d: ["By downloading a new app", "By changing font color", "By formatting as currency"] },
        { cat: "Procedures", val: 400, q: "In the App Prototyping Pipeline, writing the pseudocode for a procedure is called building the:", a: "Engine", d: ["UI", "Hardware", "Network"] },
        { cat: "Procedures", val: 400, q: "Grouping related tasks into toolboxes is creating:", a: "Modules", d: ["Objects", "Variables", "Conditionals"] },

        { cat: "Procedures", val: 500, q: "A procedure that takes an action but does NOT hand back a result is known as a:", a: "Void Function", d: ["Return Function", "Broken Function", "Loop"] },
        { cat: "Procedures", val: 500, q: "What allows a procedure to be reused in completely different projects?", a: "Writing it generally without hard-coding specific situational data", d: ["Encrypting it", "Saving it as a PDF", "Printing it out"] },
        { cat: "Procedures", val: 500, q: "How does writing procedures support the 'Fail Fast' philosophy?", a: "It allows you to test small chunks of logic before the whole app is built", d: ["It forces the CPU to crash", "It drops network packets", "It skips the planning phase"] },

        // --- CATEGORY: PARAMETERS & RETURNS ---
        { cat: "Parameters & Returns", val: 100, q: "What are 'Parameters' in programming?", a: "Pieces of information you 'pass' into a procedure so it can do its job", d: ["Final answers from the computer", "Dimensions of a microchip", "Wi-Fi speed"] },
        { cat: "Parameters & Returns", val: 100, q: "What is a 'Return Value'?", a: "The result or answer that a procedure hands back to you once it is finished", d: ["The cost of the software", "Deleting old code", "A password"] },
        { cat: "Parameters & Returns", val: 100, q: "If you write a custom function `CALCULATE_TAX(price)`, what does 'price' represent?", a: "A Parameter", d: ["A Local Variable", "A Return Value", "A Hardware Sensor"] },

        { cat: "Parameters & Returns", val: 200, q: "What is an example of an 'Input' for a LoginUser module?", a: "A username and password", d: ["The total game score", "The user's address", "The button color"] },
        { cat: "Parameters & Returns", val: 200, q: "What is an example of an 'Output' or Return Value for a CheckInventory module?", a: "The number of items left in stock", d: ["A username", "A physical receipt", "A sound effect"] },
        { cat: "Parameters & Returns", val: 200, q: "Which keyword is essential at the end of a custom function to give the answer back to the spreadsheet?", a: "return", d: ["output", "end", "stop"] },

        { cat: "Parameters & Returns", val: 300, q: "Why do we use parameters instead of typing exact numbers inside the procedure?", a: "So the procedure can process different data every time it is called", d: ["Because numbers are illegal", "To save hard drive space", "To encrypt the code"] },
        { cat: "Parameters & Returns", val: 300, q: "A parameter acts as a temporary _____ inside the function.", a: "Variable", d: ["Loop", "Network", "Database"] },
        { cat: "Parameters & Returns", val: 300, q: "If a function is called like `multiply(5, 10)`, what are 5 and 10?", a: "The Arguments/Parameters passed in", d: ["The Return Values", "The loop counters", "The error codes"] },

        { cat: "Parameters & Returns", val: 400, q: "If a module calculates a grade but forgets the `return` keyword, what happens?", a: "The program gets 'undefined' back because nothing was handed out", d: ["The computer explodes", "The grade is automatically A+", "The file is deleted"] },
        { cat: "Parameters & Returns", val: 400, q: "A procedure that requires an Array as a parameter is doing what?", a: "Taking an entire list or collection of data at once to process", d: ["Asking for a single number", "Asking for a physical device", "Encrypting the RAM"] },
        { cat: "Parameters & Returns", val: 400, q: "What must match between a function call and the function definition?", a: "The number and order of the parameters", d: ["The font size", "The IP address", "The hardware used"] },

        { cat: "Parameters & Returns", val: 500, q: "How does passing an Array as a parameter increase efficiency?", a: "The procedure can loop through the collection and process thousands of items in one call", d: ["It compresses the array into a ZIP file", "It deletes the array", "It requires zero CPU power"] },
        { cat: "Parameters & Returns", val: 500, q: "In `function greet(name) { return \"Hello \" + name; }`, what is `\"Hello \" + name`?", a: "The return value", d: ["The parameter", "The argument", "The event"] },
        { cat: "Parameters & Returns", val: 500, q: "What happens if a 'Login' module sends a number, but the 'Profile' module expects a text name?", a: "The system might crash due to mismatched data types", d: ["It translates automatically", "It runs twice as fast", "Nothing"] },

        // --- CATEGORY: SCOPE & LIBRARIES ---
        { cat: "Scope & Libraries", val: 100, q: "What is a 'Local Variable'?", a: "A variable created inside a procedure that only exists while that specific 'Black Box' is running", d: ["A variable saved on the hard drive", "A GPS variable", "An unchangeable variable"] },
        { cat: "Scope & Libraries", val: 100, q: "What happens to a local variable once its procedure finishes running?", a: "It is erased from memory", d: ["It is saved forever", "It goes to the cloud", "It prints on the screen"] },
        { cat: "Scope & Libraries", val: 100, q: "What is a 'Library' in computer science?", a: "A collection of pre-written modules created by other people that you can use", d: ["A physical building with books", "A password database", "A list of syntax errors"] },

        { cat: "Scope & Libraries", val: 200, q: "Why is it a good thing that local variables are erased from RAM?", a: "It frees up RAM and allows you to reuse the variable name elsewhere without interference", d: ["It deletes viruses", "It stops overheating", "It encrypts data"] },
        { cat: "Scope & Libraries", val: 200, q: "Why do programmers use Libraries?", a: "To avoid reinventing the wheel and leverage the work of thousands of developers", d: ["To slow down the app", "Because it's illegal not to", "To learn to read"] },
        { cat: "Scope & Libraries", val: 200, q: "What is a 'Naming Conflict' in programming?", a: "When the same variable name is used in multiple modules and the computer gets confused", d: ["Two programmers arguing", "Saving a file incorrectly", "Deleting a table"] },

        { cat: "Scope & Libraries", val: 300, q: "How do programmers solve naming conflicts?", a: "By using 'Scope' and Local Variables", d: ["By buying more RAM", "Using only numbers for names", "Never using variables"] },
        { cat: "Scope & Libraries", val: 300, q: "If you have variables `score` and `timer` shared by multiple buttons, they are NOT local. They are:", a: "Global Variables", d: ["Hidden Variables", "Dynamic Arrays", "Pointers"] },
        { cat: "Scope & Libraries", val: 300, q: "Why should Power Users keep as many variables 'local' as possible?", a: "To prevent accidental data corruption from other parts of the program", d: ["To save battery", "To make file size larger", "To share data"] },

        { cat: "Scope & Libraries", val: 400, q: "How does using a \"QR Code Library\" demonstrate Abstraction?", a: "You don't need to understand the complex math to generate a QR code", d: ["You have to write the code yourself", "It deletes your history", "It speeds up internet"] },
        { cat: "Scope & Libraries", val: 400, q: "What must you agree to when using a Library written by someone else?", a: "The Software License created by the original author", d: ["A monthly payment plan", "A non-disclosure agreement", "Giving them all your data"] },
        { cat: "Scope & Libraries", val: 400, q: "How does modularity affect the CPU and RAM?", a: "It makes programs more efficient by clearing local variables from RAM when modules finish", d: ["It overheats the CPU", "It deletes RAM", "It has no effect"] },

        { cat: "Scope & Libraries", val: 500, q: "The lifespan and visibility of a variable is known as its:", a: "Scope", d: ["Length", "Breadth", "Array Index"] },
        { cat: "Scope & Libraries", val: 500, q: "If `var count = 0` is defined outside of all functions, it has what kind of scope?", a: "Global Scope", d: ["Local Scope", "Void Scope", "Function Scope"] },
        { cat: "Scope & Libraries", val: 500, q: "Why is modifying global variables from inside multiple different modules dangerous?", a: "It creates unpredictable 'spaghetti' logic where bugs are hard to trace", d: ["It causes the CPU to explode", "It is perfectly safe", "It encrypts the variable"] },

        // --- CATEGORY: SYSTEMS & TESTING ---
        { cat: "Systems & Testing", val: 100, q: "What does it mean for programs to be 'Interrelated'?", a: "Different modules coordinate and 'talk' to each other to solve a larger problem", d: ["Written by same person", "Saved in same folder", "Use same variables"] },
        { cat: "Systems & Testing", val: 100, q: "What is 'Unit Testing'?", a: "Testing one module at a time in isolation to find exactly where a bug is hiding", d: ["Testing the monitor", "Taking a final exam", "Testing Wi-Fi speed"] },
        { cat: "Systems & Testing", val: 100, q: "Why is Unit Testing better than testing the whole system at once?", a: "It isolates the 'broken gear' so you don't have to guess which part failed", d: ["Faster for the computer", "Doesn't require code", "Prevents users from seeing it"] },

        { cat: "Systems & Testing", val: 200, q: "In a system, why are 'Interfaces' between modules important?", a: "Each module must know exactly what kind of data others are expecting", d: ["They make screens pretty", "Connect the mouse", "Block hackers"] },
        { cat: "Systems & Testing", val: 200, q: "What makes an 'Interactive Dashboard' interrelated?", a: "Multiple separate scripts interact with the same UI and underlying data", d: ["It has colors", "Uses one script", "Connects to cloud"] },
        { cat: "Systems & Testing", val: 200, q: "If your 'Store App' crashes during checkout, which module should you unit test first?", a: "The checkout processing module", d: ["The login module", "The graphics module", "The sound module"] },

        { cat: "Systems & Testing", val: 300, q: "What is the first step in building a complex system of interrelated programs?", a: "Planning the Architecture and defining what each module will do", d: ["Typing code instantly", "Buying a server", "Testing modules"] },
        { cat: "Systems & Testing", val: 300, q: "How does Modularity apply to the 'Divide and Conquer' troubleshooting strategy?", a: "It allows you to isolate and test specific parts of the program to find errors", d: ["Makes computer reboot faster", "Hides errors", "Prevents hardware failure"] },
        { cat: "Systems & Testing", val: 300, q: "In an interrelated system, how do different modules share information?", a: "By passing Parameters and returning values", d: ["By writing to the hard drive", "By emailing each other", "By using Bluetooth"] },

        { cat: "Systems & Testing", val: 400, q: "If `Module_A` relies on the output of `Module_B`, they have a:", a: "Dependency", d: ["Syntax Error", "Local Variable", "Broken Link"] },
        { cat: "Systems & Testing", val: 400, q: "How did the buttons in the 'Interactive Slide Dashboard' relate to each other?", a: "They were independent modules that shared and updated the same score variable", d: ["Deleted each other's code", "Part of one giant function", "Did not interact"] },
        { cat: "Systems & Testing", val: 400, q: "Why combine loops with procedures when searching a list?", a: "You write the search loop once inside a procedure and call it for any list", d: ["Loops only work in procedures", "Procedures delete loops", "It is required by Google"] },

        { cat: "Systems & Testing", val: 500, q: "What is 'Integration Testing'?", a: "Testing how multiple modules work together after they pass Unit Testing", d: ["Testing the hardware", "Testing the internet connection", "Testing the user"] },
        { cat: "Systems & Testing", val: 500, q: "If a system is perfectly modular, updating one module's internal code should NOT:", a: "Break the other modules in the system", d: ["Fix any bugs", "Change the file size", "Improve performance"] },
        { cat: "Systems & Testing", val: 500, q: "Which term describes when interrelated modules communicate perfectly based on their defined inputs and outputs?", a: "A robust Interface", d: ["A Flat File", "A Dead End", "A Zero-Day Exploit"] }
    ].map(item => ({ ...item, chapter: "Chapter 14", grade: "CS & Literacy Guild" })));
    
})();