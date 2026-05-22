/**
 * CHAPTER 9: intro to JavaScript Data
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
        // --- CATEGORY: SYNTAX ---
        { cat: "Syntax", val: 100, q: "This HTML tag is used to define client-side JavaScript.", a: "<script>", d: ["<js>", "<javascript>", "<code>"] },
        { cat: "Syntax", val: 100, q: "This character is used to end a JavaScript statement.", a: "Semicolon ( ; )", d: ["Colon", "Period", "Comma"] },
        { cat: "Syntax", val: 100, q: "The standard file extension used for external JavaScript files.", a: ".js", d: [".java", ".script", ".xml"] },
        { cat: "Syntax", val: 200, q: "This type of comment starts with two forward slashes.", a: "Single-line comment", d: ["Multi-line comment", "Header comment", "Block comment"] },
        { cat: "Syntax", val: 200, q: "This type of comment starts with /* and ends with */.", a: "Multi-line comment", d: ["Tag comment", "Inline comment", "Hash comment"] },
        { cat: "Syntax", val: 200, q: "The process of finding and fixing errors in code.", a: "Debugging", d: ["Deploying", "Compiling", "Drafting"] },
        { cat: "Syntax", val: 300, q: "JavaScript is this, meaning 'apple' and 'Apple' are different.", a: "Case-sensitive", d: ["Type-safe", "Case-insensitive", "Static"] },
        { cat: "Syntax", val: 300, q: "The set of rules defining how a JavaScript program is constructed.", a: "Syntax", d: ["Grammar", "Logic", "Style"] },
        { cat: "Syntax", val: 300, q: "A name given to variables or functions, such as 'myVar'.", a: "Identifier", d: ["Keyword", "Operator", "Literal"] },
        { cat: "Syntax", val: 400, q: "This operator is used to assign a value to a variable.", a: "Equals ( = )", d: ["Minus", "Plus", "Multiply"] },
        { cat: "Syntax", val: 400, q: "A single instruction in JavaScript that ends with a semicolon.", a: "Statement", d: ["Expression", "Paragraph", "Phrase"] },
        { cat: "Syntax", val: 400, q: "A block of code grouped between curly braces.", a: "Block", d: ["Array", "Object", "Function"] },
        { cat: "Syntax", val: 500, q: "The browser tool used to log messages and find errors.", a: "Console", d: ["Network", "Elements", "Application"] },
        { cat: "Syntax", val: 500, q: "This function displays a simple popup box with a message.", a: "alert()", d: ["msg()", "popup()", "box()"] },
        { cat: "Syntax", val: 500, q: "This keyword is used to return a value from a function.", a: "return", d: ["stop", "send", "exit"] },

        // --- CATEGORY: VARIABLES ---
        { cat: "Variables", val: 100, q: "This keyword creates a variable that can be changed later.", a: "let", d: ["const", "var", "fixed"] },
        { cat: "Variables", val: 100, q: "This keyword creates a variable that cannot be reassigned.", a: "const", d: ["let", "var", "set"] },
        { cat: "Variables", val: 100, q: "The legacy keyword for creating variables used before ES6.", a: "var", d: ["let", "const", "def"] },
        { cat: "Variables", val: 200, q: "Text data stored inside of quotes.", a: "String", d: ["Number", "Boolean", "Object"] },
        { cat: "Variables", val: 200, q: "A data type that can only be true or false.", a: "Boolean", d: ["String", "Float", "Integer"] },
        { cat: "Variables", val: 200, q: "Default value of a variable that is declared but not assigned.", a: "undefined", d: ["null", "NaN", "void"] },
        { cat: "Variables", val: 300, q: "This represents the intentional absence of any value.", a: "null", d: ["undefined", "0", "false"] },
        { cat: "Variables", val: 300, q: "A container that holds a numbered list of multiple items.", a: "Array", d: ["Object", "String", "Number"] },
        { cat: "Variables", val: 300, q: "A variable type used to store collections of key-value pairs.", a: "Object", d: ["Array", "List", "Function"] },
        { cat: "Variables", val: 400, q: "Variable names cannot start with this type of character.", a: "Number", d: ["Letter", "Underscore", "Dollar sign"] },
        { cat: "Variables", val: 400, q: "This operator checks for strict equality, including data type.", a: "===", d: ["==", "=", "!="] },
        { cat: "Variables", val: 400, q: "The visibility of a variable (Global vs Local).", a: "Scope", d: ["Range", "View", "Focus"] },
        { cat: "Variables", val: 500, q: "Moving variable declarations to the top of their scope.", a: "Hoisting", d: ["Bubbling", "Capturing", "Lifting"] },
        { cat: "Variables", val: 500, q: "Using backticks and ${} to inject variables into text.", a: "Template Literal", d: ["String Concat", "Macro", "Interpolation"] },
        { cat: "Variables", val: 500, q: "The property used to find how many characters are in a string.", a: "length", d: ["size", "count", "width"] },

        // --- CATEGORY: LOGIC ---
        { cat: "Logic", val: 100, q: "Executes code only if a specific condition is true.", a: "if statement", d: ["while loop", "for loop", "function"] },
        { cat: "Logic", val: 100, q: "Executes code when the 'if' condition is false.", a: "else statement", d: ["then statement", "break", "continue"] },
        { cat: "Logic", val: 100, q: "The logical operator for AND.", a: "&&", d: ["||", "!", "??"] },
        { cat: "Logic", val: 200, q: "The logical operator for OR.", a: "||", d: ["&&", "!", "??"] },
        { cat: "Logic", val: 200, q: "The logical operator for NOT.", a: "!", d: ["~", "?", "&"] },
        { cat: "Logic", val: 200, q: "This loop repeats as long as a condition remains true.", a: "while loop", d: ["for loop", "if statement", "forEach"] },
        { cat: "Logic", val: 300, q: "Loop with an initializer, condition, and increment.", a: "for loop", d: ["while loop", "do-while", "if-else"] },
        { cat: "Logic", val: 300, q: "A loop that never ends because the condition stays true.", a: "Infinite Loop", d: ["Recursion", "Nesting", "Breakpoint"] },
        { cat: "Logic", val: 300, q: "The keyword used to jump out of or stop a loop.", a: "break", d: ["exit", "stop", "return"] },
        { cat: "Logic", val: 400, q: "The keyword used to skip the current iteration of a loop.", a: "continue", d: ["skip", "pass", "next"] },
        { cat: "Logic", val: 400, q: "This operator is used to find the remainder of a division.", a: "Modulo ( % )", d: ["Exponent", "Increment", "Decrement"] },
        { cat: "Logic", val: 400, q: "Data type returned when a math operation fails.", a: "NaN (Not a Number)", d: ["Null", "Undefined", "Error"] },
        { cat: "Logic", val: 500, q: "A reusable block of code designed to perform a task.", a: "Function", d: ["Loop", "Variable", "Array"] },
        { cat: "Logic", val: 500, q: "The variables listed in the function definition.", a: "Parameters", d: ["Arguments", "Literals", "Strings"] },
        { cat: "Logic", val: 500, q: "The actual values passed into a function when called.", a: "Arguments", d: ["Parameters", "Results", "Return values"] },

        // --- CATEGORY: DOM & EVENTS ---
        { cat: "DOM & Events", val: 100, q: "Acronym for the tree structure browsers use for HTML.", a: "DOM", d: ["URL", "API", "SSL"] },
        { cat: "DOM & Events", val: 100, q: "This method selects an HTML element by its ID.", a: "getElementById()", d: ["querySelector()", "getElementByClass()", "find()"] },
        { cat: "DOM & Events", val: 100, q: "This method adds a listener for user actions like clicks.", a: "addEventListener()", d: ["onClick()", "hearEvent()", "attach()"] },
        { cat: "DOM & Events", val: 200, q: "This property is used to change the HTML content of an element.", a: "innerHTML", d: ["textContent", "value", "style"] },
        { cat: "DOM & Events", val: 200, q: "This property is used to change the plain text inside an element.", a: "textContent", d: ["innerHTML", "value", "innerText"] },
        { cat: "DOM & Events", val: 200, q: "This property is used to modify the CSS style of an element.", a: "style", d: ["cssText", "format", "design"] },
        { cat: "DOM & Events", val: 300, q: "This event occurs when a user clicks on an element.", a: "onclick", d: ["onmouseover", "onchange", "onload"] },
        { cat: "DOM & Events", val: 300, q: "This event detects when a user presses a key down.", a: "onkeydown", d: ["onclick", "onscroll", "onblur"] },
        { cat: "DOM & Events", val: 300, q: "Method used to find elements using CSS selectors.", a: "querySelector()", d: ["getElementById()", "findCSS()", "select()"] },
        { cat: "DOM & Events", val: 400, q: "This object represents the entire browser window.", a: "window", d: ["document", "page", "browser"] },
        { cat: "DOM & Events", val: 400, q: "This object represents the specific web page loaded.", a: "document", d: ["window", "root", "body"] },
        { cat: "DOM & Events", val: 400, q: "A user action that JavaScript can react to.", a: "Event", d: ["Function", "Statement", "Comment"] },
        { cat: "DOM & Events", val: 500, q: "The method used to stop a form from refreshing the page.", a: "preventDefault()", d: ["stopProp()", "halt()", "cancel()"] },
        { cat: "DOM & Events", val: 500, q: "This property holds the value typed into an input field.", a: "value", d: ["text", "input", "data"] },
        { cat: "DOM & Events", val: 500, q: "This method can be used to add or remove CSS classes.", a: "classList", d: ["className", "style", "css"] },

        // --- CATEGORY: ADVANCED ---
        { cat: "Advanced", val: 100, q: "This function runs code once after a specified delay.", a: "setTimeout()", d: ["setInterval()", "delay()", "wait()"] },
        { cat: "Advanced", val: 100, q: "This function runs code repeatedly at set time intervals.", a: "setInterval()", d: ["setTimeout()", "repeat()", "loop()"] },
        { cat: "Advanced", val: 100, q: "This method stops an interval timer from running.", a: "clearInterval()", d: ["stopInterval()", "clear()", "kill()"] },
        { cat: "Advanced", val: 200, q: "A function passed as an argument to another function.", a: "Callback", d: ["Return", "Loop", "Promise"] },
        { cat: "Advanced", val: 200, q: "Converts a JavaScript object into a JSON string.", a: "JSON.stringify()", d: ["JSON.parse()", "toString()", "serialize()"] },
        { cat: "Advanced", val: 200, q: "Converts a JSON string back into a JS object.", a: "JSON.parse()", d: ["JSON.stringify()", "toObject()", "deserialize()"] },
        { cat: "Advanced", val: 300, q: "A modern API used to fetch data from a server.", a: "fetch()", d: ["get()", "pull()", "request()"] },
        { cat: "Advanced", val: 300, q: "Object representing eventual completion of a task.", a: "Promise", d: ["Future", "Task", "Callback"] },
        { cat: "Advanced", val: 300, q: "Pauses an async function until a promise is resolved.", a: "await", d: ["halt", "wait", "yield"] },
        { cat: "Advanced", val: 400, q: "This method creates a copy of a Git repository locally.", a: "clone", d: ["copy", "fork", "init"] },
        { cat: "Advanced", val: 400, q: "This command saves changes to your local Git history.", a: "commit", d: ["save", "push", "add"] },
        { cat: "Advanced", val: 400, q: "Command uploads your local code to a remote site.", a: "push", d: ["pull", "sync", "deploy"] },
        { cat: "Advanced", val: 500, q: "Moving code from local machine to a live server.", a: "Deployment", d: ["Development", "Designing", "Debugging"] },
        { cat: "Advanced", val: 500, q: "Protocol for transferring files directly to a server.", a: "FTP", d: ["HTTP", "SMTP", "DNS"] },
        { cat: "Advanced", val: 500, q: "The error code returned when a server cannot find a file.", a: "404", d: ["500", "200", "403"] }
    ].map(item => ({ ...item, chapter: "Chapter 9", grade: "Web Design 1" })));
    
})();