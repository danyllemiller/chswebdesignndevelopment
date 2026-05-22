/**
 * CS & LITERACY GUILD: GAMES DATA - CHAPTER 12
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
    // CHAPTER 12: CONTROL STRUCTURES & EVENTS (75 Questions)
    // Categories: Conditionals, Boolean Logic, Loops, Events, Event Handlers
    // ============================================================================
    const ch12Data = [
        // --- CATEGORY: CONDITIONALS ---
        { cat: "Conditionals", val: 100, q: "What is the role of a 'Conditional' in programming?", a: "To evaluate a condition and decide which path of code to run", d: ["To repeat a task forever", "To format text", "To store a variable"] },
        { cat: "Conditionals", val: 100, q: "The fundamental structure that acts as a 'Fork in the Road' for a computer.", a: "The If-Then Statement", d: ["The For Loop", "The Event Handler", "The Array"] },
        { cat: "Conditionals", val: 100, q: "How does a computer evaluate a condition in an 'If-Then' statement?", a: "It checks if the condition is True or False", d: ["It guesses a number", "It asks the user to type yes/no", "It checks file size"] },
        { cat: "Conditionals", val: 200, q: "What happens if the condition in an 'If-Then' statement is False?", a: "The computer skips that block of code entirely", d: ["The computer crashes", "The computer deletes the file", "It runs it anyway"] },
        { cat: "Conditionals", val: 200, q: "A program making a decision based on data is an example of a:", a: "Conditional", d: ["Loop", "Event", "Array"] },
        { cat: "Conditionals", val: 200, q: "What happens if you set a conditional threshold too high (like Power Save mode at 1%)?", a: "The device might die before the code can react", d: ["Battery lasts forever", "Screen gets brighter", "Code deletes itself"] },
        { cat: "Conditionals", val: 300, q: "What is 'Nested Logic'?", a: "Placing one decision inside another decision", d: ["Putting code on one line", "A loop running forever", "A variable in the cloud"] },
        { cat: "Conditionals", val: 300, q: "What formatting technique makes nested logic easier to read?", a: "Indentation (pushing text to the right)", d: ["Making font red", "Typing in ALL CAPS", "Deleting spaces"] },
        { cat: "Conditionals", val: 300, q: "Why avoid nesting too many 'If' statements inside each other?", a: "It makes code a confusing 'spaghetti mess' that is hard to read", d: ["It causes screen flicker", "It violates copyright", "It deletes the hard drive"] },
        { cat: "Conditionals", val: 400, q: "If a Thermostat turns off when a window is open regardless of temperature, this is a:", a: "Nested rule overriding an outer rule", d: ["Flat file", "Syntax error", "Infinite loop"] },
        { cat: "Conditionals", val: 400, q: "What executes when an 'If' condition is False but an alternative is provided?", a: "The ELSE block", d: ["The THEN block", "The REPEAT block", "The LOOP block"] },
        { cat: "Conditionals", val: 400, q: "In Google Sheets, which formula mimics this basic programming structure?", a: "=IF()", d: ["=SUM()", "=AVERAGE()", "=COUNT()"] },
        { cat: "Conditionals", val: 500, q: "Which control structure gives devices the appearance of 'intelligence'?", a: "Conditionals evaluating thresholds and taking automated actions", d: ["Loops repeating blindly", "Variables storing data", "Arrays holding lists"] },
        { cat: "Conditionals", val: 500, q: "How does an autonomous car checking for a red light, then checking for a crosswalk demonstrate logic?", a: "It uses nested conditionals to evaluate layered environmental risks", d: ["It uses a For Loop to drive", "It uses an Array of colors", "It uses an Event to crash"] },
        { cat: "Conditionals", val: 500, q: "If `(score > 50) { ... }` is the conditional, what happens when score is exactly 50?", a: "The condition is False, and the code block is skipped", d: ["The condition is True", "The program crashes", "It runs an infinite loop"] },

        // --- CATEGORY: BOOLEAN LOGIC ---
        { cat: "Boolean Logic", val: 100, q: "Which Boolean operator requires BOTH conditions to be True?", a: "AND", d: ["OR", "NOT", "IF"] },
        { cat: "Boolean Logic", val: 100, q: "Which Boolean operator requires only ONE condition to be True?", a: "OR", d: ["AND", "NOT", "WHILE"] },
        { cat: "Boolean Logic", val: 100, q: "Which Boolean operator looks for the 'Opposite' of a condition?", a: "NOT", d: ["AND", "OR", "ELSE"] },
        { cat: "Boolean Logic", val: 200, q: "What is the primary benefit of using Boolean operators?", a: "They allow programmers to build complex, multi-layered rules", d: ["They make code slower", "They translate code to English", "They generate graphics"] },
        { cat: "Boolean Logic", val: 200, q: "Evaluate: `(temperature > 90) AND (window == 'open')` if temp is 95 and window is 'closed'.", a: "False", d: ["True", "Syntax Error", "Crash"] },
        { cat: "Boolean Logic", val: 200, q: "Evaluate: `(day == 'Saturday') OR (day == 'Sunday')` if today is Tuesday.", a: "False", d: ["True", "Syntax Error", "Crash"] },
        { cat: "Boolean Logic", val: 300, q: "Evaluate: `NOT (score < 10)` if the score is 15.", a: "True", d: ["False", "Null", "Syntax Error"] },
        { cat: "Boolean Logic", val: 300, q: "Boolean logic replaces the need for humans to manually do what?", a: "Search for a 'needle in a haystack' by applying automatic filters", d: ["Type faster on a keyboard", "Plug in hardware", "Click the mouse"] },
        { cat: "Boolean Logic", val: 300, q: "If a user needs the correct password AND an Admin role, this is an example of:", a: "Multi-layered Boolean validation", d: ["An Infinite Loop", "An Event Handler", "An Array Index"] },
        { cat: "Boolean Logic", val: 400, q: "In JavaScript, what symbols are typically used for the AND operator?", a: "&&", d: ["||", "!", "=="] },
        { cat: "Boolean Logic", val: 400, q: "In JavaScript, what symbols are typically used for the OR operator?", a: "||", d: ["&&", "!", "=="] },
        { cat: "Boolean Logic", val: 400, q: "How many possible outcomes exist when evaluating a Boolean statement?", a: "Two (True or False)", d: ["Three", "Infinite", "One"] },
        { cat: "Boolean Logic", val: 500, q: "Evaluate: `(5 > 3) AND (10 < 20) AND NOT (1 == 2)`", a: "True", d: ["False", "Undefined", "Error"] },
        { cat: "Boolean Logic", val: 500, q: "What is the danger of writing overly complex Boolean statements without parentheses?", a: "The computer might evaluate the order of operations incorrectly", d: ["It uses too much internet bandwidth", "It deletes the variable", "It triggers an event"] },
        { cat: "Boolean Logic", val: 500, q: "In the Smart Thermostat logic, combining 'Temp > Target' and 'Window = Closed' requires which operator?", a: "AND", d: ["OR", "NOT", "ELSE"] },

        // --- CATEGORY: LOOPS ---
        { cat: "Loops", val: 100, q: "A control structure that repeats a block of code until a specific goal is met.", a: "A Loop", d: ["A Conditional", "An Event", "A Variable"] },
        { cat: "Loops", val: 100, q: "When should a programmer use a 'FOR' loop?", a: "When they know exactly how many times they want the code to repeat", d: ["When they don't know when to stop", "To wait for a click", "To ask a Yes/No question"] },
        { cat: "Loops", val: 100, q: "What is the purpose of a 'Counter' in a FOR loop?", a: "To keep track of how many times the loop has run", d: ["To measure CPU temp", "To stop hackers", "To count files on the PC"] },
        { cat: "Loops", val: 200, q: "When should a programmer use a 'WHILE' loop?", a: "When they don't know the exact number of times, but know when to stop", d: ["To repeat exactly 10 times", "To wait for the keyboard", "When using a flat file"] },
        { cat: "Loops", val: 200, q: "What does the 'DRY Principle' stand for?", a: "Don't Repeat Yourself", d: ["Do Repeat Yourself", "Data Requires Yields", "Digital RAM Yield"] },
        { cat: "Loops", val: 200, q: "How does a loop help follow the DRY Principle?", a: "It prevents typing the same line of code multiple times", d: ["It deletes old files", "It encrypts data", "It makes text bold"] },
        { cat: "Loops", val: 300, q: "A loop with a condition that is always true, causing it to run forever.", a: "Infinite Loop", d: ["Secure Network", "Successful Loop", "Dead Loop"] },
        { cat: "Loops", val: 300, q: "Why is an Infinite Loop considered a major bug?", a: "It will freeze the browser and lock up the CPU", d: ["It deletes the hard drive", "It costs money", "It causes a data breach"] },
        { cat: "Loops", val: 300, q: "What must a Power User always ensure their loop has to prevent crashing?", a: "A guaranteed 'Break Condition'", d: ["A colorful font", "Fast internet", "A charged battery"] },
        { cat: "Loops", val: 400, q: "What does 'Scalable' mean when referring to loops?", a: "The same code handles 10 items or 10 million items", d: ["Code can be weighed", "Text size changes", "Loop gets faster over time"] },
        { cat: "Loops", val: 400, q: "In `for (var i = 1; i <= 10; i++)`, what does `i++` do?", a: "Adds 1 to the counter every time the loop finishes a cycle", d: ["Deletes the variable", "Multiplies by 2", "Stops the loop"] },
        { cat: "Loops", val: 400, q: "Which loop keeps asking a user for a password until they get it right?", a: "A WHILE loop", d: ["A FOR loop", "An IF loop", "An EVENT loop"] },
        { cat: "Loops", val: 500, q: "When evaluating tradeoffs in implementation (e.g., repeating code vs looping), what factors are compared?", a: "Efficiency and Complexity (Speed vs Readability)", d: ["Colors and Sounds", "Keyboards and Mice", "Wi-Fi and Bluetooth"] },
        { cat: "Loops", val: 500, q: "Why is naming a counter 'studentNumber' better than just 'i' in a complex loop?", a: "It makes the code more maintainable and readable for humans", d: ["It makes the CPU faster", "It uses less RAM", "It prevents infinite loops"] },
        { cat: "Loops", val: 500, q: "Which loop would you use to check every single row in a spreadsheet of exactly 500 rows?", a: "A FOR loop", d: ["A WHILE loop", "A WHEN loop", "A NOT loop"] },

        // --- CATEGORY: EVENTS ---
        { cat: "Events", val: 100, q: "Code that sits quietly and waits for a user action to trigger it.", a: "Event-Driven Programming", d: ["Top-to-bottom code", "Holiday code", "AI code"] },
        { cat: "Events", val: 100, q: "An action outside the program's direct control, like a click or keypress.", a: "An Event", d: ["A Loop", "A Scheduled Meeting", "A Hardware Crash"] },
        { cat: "Events", val: 100, q: "'Running a script when the mouse is clicked' is an example of what?", a: "An Event", d: ["A Loop", "A Conditional", "A Flat File"] },
        { cat: "Events", val: 200, q: "How is Event-Driven code different from traditional code?", a: "It listens for triggers rather than running straight through automatically", d: ["It is written backwards", "It is only for databases", "It uses no variables"] },
        { cat: "Events", val: 200, q: "Which type of event is 'onKeyPress'?", a: "A keyboard event", d: ["A mouse event", "A timed event", "A loop event"] },
        { cat: "Events", val: 200, q: "In Google Sheets, what does the `onEdit` event do?", a: "It triggers a script every time a user changes a cell", d: ["It edits the document for you", "It deletes old files", "It saves as PDF"] },
        { cat: "Events", val: 300, q: "What is the role of an 'Event Listener'?", a: "To constantly wait and watch for a specific action to occur", d: ["To play music", "To read code out loud", "To record the microphone"] },
        { cat: "Events", val: 300, q: "How does Event-Driven programming make a computer feel more like a 'tool'?", a: "It reacts instantly to specific user commands instead of running passively", d: ["It plays loud noises", "It looks like a hammer", "It is heavier"] },
        { cat: "Events", val: 300, q: "Why must a Logic Builder anticipate everything a user might do?", a: "The environment must know how to react to unexpected clicks or errors", d: ["So they can sell data", "Because the PC will break", "To make the file smaller"] },
        { cat: "Events", val: 400, q: "In the 'Interactive Soundboard', what type of event triggers the sounds?", a: "A keyboard event (pressing A, S, D, F)", d: ["A mouse movement", "A timer reaching zero", "A database update"] },
        { cat: "Events", val: 400, q: "If an event fires but no code is assigned to listen for it, what happens?", a: "Nothing; the event is ignored by the program", d: ["The program crashes", "The browser closes", "An infinite loop starts"] },
        { cat: "Events", val: 400, q: "What kind of event occurs when a timer counts down to zero?", a: "A Time-Driven Event", d: ["A Mouse Event", "A Keyboard Event", "A Hardware Event"] },
        { cat: "Events", val: 500, q: "What is the relationship between the OS Kernel and an Event?", a: "The Kernel detects the hardware input and passes the event to the application listener", d: ["The Kernel deletes the event", "The Kernel ignores the keyboard", "The Kernel creates loops"] },
        { cat: "Events", val: 500, q: "How do modern Graphical User Interfaces (GUIs) rely on Events?", a: "Every icon and button click is processed as an event triggering a specific function", d: ["They don't use events", "They only use While loops", "They run straight top-to-bottom"] },
        { cat: "Events", val: 500, q: "What is a 'trigger' in Google Apps Script?", a: "A specific rule that tells the server to run a function when an event occurs", d: ["A button on the keyboard", "A type of malware", "A syntax error"] },

        // --- CATEGORY: EVENT HANDLERS ---
        { cat: "Event Handlers", val: 100, q: "A specific block of code mapped to 'wake up' and run when a certain event happens.", a: "Event Handler", d: ["The CPU", "A physical button", "A syntax error"] },
        { cat: "Event Handlers", val: 100, q: "How can you turn a drawn shape in Google Sheets into a logic trigger?", a: "By assigning a script to the drawing so it acts as an onClick button", d: ["By making it red", "By deleting it", "By putting it in cell A1"] },
        { cat: "Event Handlers", val: 100, q: "Why is Accessibility important when designing Event Handlers?", a: "If a button is too small or unclear, the user won't know how to trigger the logic", d: ["It makes the PC faster", "It saves electricity", "It stops viruses"] },
        { cat: "Event Handlers", val: 200, q: "What does it mean for an artifact to have 'Practical Intent'?", a: "The code solves a real problem or expresses a creative idea", d: ["It is cheap to make", "It runs very fast", "It is perfectly secure"] },
        { cat: "Event Handlers", val: 200, q: "If an Event Handler is tied to an 'onClick' event, what must the user do?", a: "Click the specific element with their mouse", d: ["Type a word", "Wait 10 seconds", "Close the browser"] },
        { cat: "Event Handlers", val: 200, q: "What is 'Clean Code'?", a: "Code that is easy for other humans to read and understand", d: ["Code with no viruses", "A brand new laptop", "Code written in white text"] },
        { cat: "Event Handlers", val: 300, q: "If you choose between a 'clever' shortcut and readable code, which is preferred in this class?", a: "Readability", d: ["The clever shortcut", "Neither", "Whichever is typed fastest"] },
        { cat: "Event Handlers", val: 300, q: "An Event Handler is essentially a bridge between:", a: "A user's physical action and the computer's logical response", d: ["The RAM and the SSD", "The LAN and the WAN", "A Flat File and a Database"] },
        { cat: "Event Handlers", val: 300, q: "In a Soundboard app, what connects the 'A' key to the 'Bass Drum' sound?", a: "An Event Handler listening for 'onKeyPress'", d: ["An infinite loop", "A static array", "A firewall"] },
        { cat: "Event Handlers", val: 400, q: "Why might a Logic Builder create a custom Event Handler instead of using a built-in one?", a: "To create a highly specific, customized response to a unique user action", d: ["To make the code run slower", "Because built-in handlers are illegal", "To save hard drive space"] },
        { cat: "Event Handlers", val: 400, q: "How does an Event Handler demonstrate Abstraction to the user?", a: "The user clicks a simple button, hiding the complex code running behind it", d: ["It deletes their data", "It shows them raw binary", "It requires them to type syntax"] },
        { cat: "Event Handlers", val: 400, q: "Can one Event Handler trigger multiple functions?", a: "Yes, a handler can call as many procedures as needed when triggered", d: ["No, only one", "Only if it is an onClick event", "Only in Python"] },
        { cat: "Event Handlers", val: 500, q: "What happens if an Event Handler executes a function containing an Infinite Loop?", a: "The program will freeze the moment the user triggers that event", d: ["The event will un-trigger itself", "The program runs faster", "The OS deletes the button"] },
        { cat: "Event Handlers", val: 500, q: "In Google Apps Script, what object often contains information about the event (like which key was pressed)?", a: "The Event Object (usually 'e')", d: ["The DOM", "The Window", "The Kernel"] },
        { cat: "Event Handlers", val: 500, q: "How do Event Handlers transform a static spreadsheet into an Interactive Dashboard?", a: "By running dynamic scripts in response to user dropdowns or clicks", d: ["By making the grid lines invisible", "By coloring the cells red", "By printing the sheet to PDF"] }
    ].map(item => ({ ...item, chapter: "Chapter 12", grade: "CS & Literacy Guild" }));

    // --- PUSH TO MASTER POOL ---
    window.migrationPool.push(...ch12Data);
    
})();