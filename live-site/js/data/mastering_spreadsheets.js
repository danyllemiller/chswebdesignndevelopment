/**
 * CHAPTER 9: Mastering Spreadsheets & Data Visualization
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
        // --- CATEGORY: FOUNDATIONS & ENTRY ---
        { cat: "Foundations & Entry", val: 100, q: "A single 'bucket' in a spreadsheet where a row and column intersect is a:", a: "Cell", d: ["Range", "Sheet", "Header"] },
        { cat: "Foundations & Entry", val: 100, q: "Spreadsheet rows are labeled with _____, while columns are labeled with _____.", a: "Numbers; Letters", d: ["Letters; Numbers", "Binary; Hex", "Names; IDs"] },
        { cat: "Foundations & Entry", val: 100, q: "The actual number or text inside a cell is the 'Value'; how it looks is the:", a: "Formatting", d: ["Metadata", "Attribute", "Reference"] },

        { cat: "Foundations & Entry", val: 200, q: "Why should you type the number '10' and use currency tools instead of typing '$10' manually?", a: "Typing symbols manually might make the computer see it as text instead of a number.", d: ["It uses too much RAM.", "It causes a syntax error.", "It is illegal in Google Sheets."] },
        { cat: "Foundations & Entry", val: 200, q: "The coordinate system (like B4) that identifies a specific bucket is a:", a: "Cell Address", d: ["Memory Pointer", "Primary Key", "Data Relationship"] },
        { cat: "Foundations & Entry", val: 200, q: "Which data type would you choose for a column containing transaction dates?", a: "Date", d: ["Currency", "Plain Text", "Percentage"] },

        { cat: "Foundations & Entry", val: 300, q: "A Power User types raw numbers and uses this to keep data 'clean' for math.", a: "Data Types / Formatting Tools", d: ["Ink", "Encryption", "Manual Labels"] },
        { cat: "Foundations & Entry", val: 300, q: "The foundation of all spreadsheet power is the use of this coordinate-based system:", a: "Grid System (Rows and Columns)", d: ["Binary Conversion", "Hardware Hierarchy", "Network Topology"] },
        { cat: "Foundations & Entry", val: 300, q: "If you want to ensure a user only types a number between 1 and 10, you use:", a: "Data Validation", d: ["Conditional Formatting", "Absolute Referencing", "Auto-sum"] },

        { cat: "Foundations & Entry", val: 400, q: "A spreadsheet is different from a word processor because it treats every cell as a:", a: "Variable that can be manipulated", d: ["Paragraph of text", "Static image", "Hidden file"] },
        { cat: "Foundations & Entry", val: 400, q: "This tool allows you to create a list of choices (like 'Paid' or 'Pending') in a cell:", a: "Dropdown Menu", d: ["Slicer", "Formula Bar", "Relative Reference"] },
        { cat: "Foundations & Entry", val: 400, q: "Ensuring the computer knows a cell is 'Currency' prevents what common problem?", a: "Calculation errors where math formulas break.", d: ["The computer overheating.", "The Wi-Fi disconnecting.", "Data exfiltration."] },

        { cat: "Foundations & Entry", val: 500, q: "In the 'Anatomy of a Sheet', the 'Value' represents the truth, while formatting is the:", a: "Visual Costume", d: ["Binary Code", "Hardware driver", "Encryption key"] },
        { cat: "Foundations & Entry", val: 500, q: "Data Validation prevents 'Dirty Data' from entering the system by setting:", a: "Rules for what can be typed", d: ["Passwords for folders", "Colors for charts", "Limits on CPU usage"] },
        { cat: "Foundations & Entry", val: 500, q: "What coordinate represents the cell in the 3rd column and 5th row?", a: "C5", d: ["5C", "E3", "3E"] },

        // --- CATEGORY: CELL REFERENCING ---
        { cat: "Cell Referencing", val: 100, q: "A value you type directly into a cell that never changes is a:", a: "Static Number", d: ["Dynamic Formula", "Absolute Reference", "Logical Operator"] },
        { cat: "Cell Referencing", val: 100, q: "A relationship between cells that updates instantly when data changes is a:", a: "Dynamic Formula", d: ["Static List", "Flat File", "Word Document"] },
        { cat: "Cell Referencing", val: 100, q: "Every formula in a spreadsheet must start with this character:", a: "Equals sign ( = )", d: ["Dollar sign ( $ )", "Plus sign ( + )", "At symbol ( @ )"] },

        { cat: "Cell Referencing", val: 200, q: "This default reference type changes 'relative' to where a formula is copied.", a: "Relative Referencing", d: ["Absolute Referencing", "Static Referencing", "Hard-coding"] },
        { cat: "Cell Referencing", val: 200, q: "If you copy `=A1+A2` from cell A3 to B3, what does the formula become?", a: "=B1+B2", d: ["=A1+A2", "=A2+A3", "=C1+C2"] },
        { cat: "Cell Referencing", val: 200, q: "What allows you to build 'What-If' models that show how saving more money affects your future?", a: "Dynamic Formulas", d: ["Plain Text", "Hardware Upgrades", "Lossy Compression"] },

        { cat: "Cell Referencing", val: 300, q: "Which symbol acts as an 'Anchor' to lock a cell reference in place?", a: "Dollar sign ( $ )", d: ["Percentage sign ( % )", "Asterisk ( * )", "Hashtag ( # )"] },
        { cat: "Cell Referencing", val: 300, q: "The act of locking a cell so it does not move when dragged is called:", a: "Absolute Referencing", d: ["Data Validation", "Relative Referencing", "Cell Formatting"] },
        { cat: "Cell Referencing", val: 300, q: "How would you write an absolute reference for cell B1?", a: "$B$1", d: ["B1$", "$B1", "B$1"] },

        { cat: "Cell Referencing", val: 400, q: "In the formula `=A2*$B$1`, which part will change when dragged down to the next row?", a: "A2", d: ["$B$1", "The whole formula", "Nothing"] },
        { cat: "Cell Referencing", val: 400, q: "What is the primary benefit of Absolute Referencing?", a: "It allows you to multiply a whole list by one specific 'Tax Rate' or 'Goal' cell.", d: ["It makes the file smaller.", "It encrypts the math.", "It allows for 3D graphics."] },
        { cat: "Cell Referencing", val: 400, q: "Which error code usually appears if you delete a cell that a formula was pointing to?", a: "#REF!", d: ["#NAME?", "#VALUE!", "#DIV/0!"] },

        { cat: "Cell Referencing", val: 500, q: "If you want to lock only the column but let the row change, how do you write it?", a: "$B1", d: ["B$1", "$B$1", "B1$"] },
        { cat: "Cell Referencing", val: 500, q: "Absolute references are essential for building professional dashboards because they:", a: "Link summary charts to specific global settings or 'knobs'.", d: ["Increase Wi-Fi speed.", "Fix broken hardware.", "Delete old versions."] },
        { cat: "Cell Referencing", val: 500, q: "Formula `=Sum(A:A)` does what?", a: "Adds up every single number in Column A.", d: ["Adds only the first cell.", "Counts how many 'A's are in the sheet.", "Deletes Column A."] },

        // --- CATEGORY: CLEANING & TRANSFORMATION ---
        { cat: "Cleaning & Transformation", val: 100, q: "Rearranging rows based on a rule like 'Alphabetical Order' is called:", a: "Sorting", d: ["Filtering", "Validating", "Aggregating"] },
        { cat: "Cleaning & Transformation", val: 100, q: "Hiding rows that don't meet a specific criteria (like GPA < 3.5) is called:", a: "Filtering", d: ["Sorting", "Erasing", "Compressing"] },
        { cat: "Cleaning & Transformation", val: 100, q: "Data that is messy, inconsistent, or contains duplicates is known as:", a: "Dirty Data", d: ["Encrypted Data", "Binary Data", "Metadata"] },

        { cat: "Cleaning & Transformation", val: 200, q: "What does GIGO stand for in data analysis?", a: "Garbage In, Garbage Out", d: ["Global Internet Gateway Operations", "Get Information, Generate Output", "Grid Internal Graphics Object"] },
        { cat: "Cleaning & Transformation", val: 200, q: "Why is 'NV' and 'Nevada' in the same column a problem for a computer?", a: "The computer sees them as two completely different things, ruining your totals.", d: ["It uses too much RAM.", "It causes a hardware bottleneck.", "It is illegal under GDPR."] },
        { cat: "Cleaning & Transformation", val: 200, q: "Which tool helps fix inconsistent naming across 1,000 rows instantly?", a: "Find & Replace", d: ["Copy & Paste", "Data Validation", "Text Wrapping"] },

        { cat: "Cleaning & Transformation", val: 300, q: "The process of sifting through thousands of rows to find the 'Big Picture' is:", a: "Data Transformation", d: ["Hardware Assembly", "Network Mapping", "Packet Routing"] },
        { cat: "Cleaning & Transformation", val: 300, q: "Removing these ensures that no person or order is counted twice in a census.", a: "Duplicate Entries", d: ["Empty Cells", "Primary Keys", "Absolute References"] },
        { cat: "Cleaning & Transformation", val: 300, q: "What is the first step a Data Architect takes after downloading a messy dataset?", a: "Cleaning the data to ensure accuracy.", d: ["Making a colorful chart.", "Emailing the boss.", "Deleting the file."] },

        { cat: "Cleaning & Transformation", val: 400, q: "Filtering a list of students to show only '10th Grade' is a form of:", a: "Abstraction (hiding unnecessary details)", d: ["Encryption", "Compression", "Decomposition"] },
        { cat: "Cleaning & Transformation", val: 400, q: "Standardizing abbreviations to ensure data integrity is called:", a: "Cleaning / Normalizing", d: ["Formatting", "Styling", "Summarizing"] },
        { cat: "Cleaning & Transformation", val: 400, q: "If you create a chart from uncleaned data, the chart will likely be:", a: "A 'Calculated Lie' or misleading.", d: ["Very fast to load.", "Extremely accurate.", "Encrypted."] },

        { cat: "Cleaning & Transformation", val: 500, q: "Which tool allows you to see only a specific subset of data without deleting the rest?", a: "Filter", d: ["Delete Key", "Sort", "Styles"] },
        { cat: "Cleaning & Transformation", val: 500, q: "Professional data architects spend the most time on this phase of a project:", a: "Data Cleaning", d: ["Picking colors", "Buying monitors", "Typing names"] },
        { cat: "Cleaning & Transformation", val: 500, q: "What happens to your analysis if your starting data is messy and full of errors?", a: "Your results will be untruthful and unreliable.", d: ["The internet will slow down.", "The computer will run out of storage.", "The charts will be too bright."] },

        // --- CATEGORY: AGGREGATION & LOGIC ---
        { cat: "Aggregation & Logic", val: 100, q: "Which function adds up a range of numbers?", a: "SUM", d: ["COUNT", "AVERAGE", "TOTAL"] },
        { cat: "Aggregation & Logic", val: 100, q: "Which function finds the mathematical mean of a range of numbers?", a: "AVERAGE", d: ["SUM", "MEDIAN", "MAX"] },
        { cat: "Aggregation & Logic", val: 100, q: "Which function tells you how many cells in a range contain numbers?", a: "COUNT", d: ["SUM", "LIST", "CALC"] },

        { cat: "Aggregation & Logic", val: 200, q: "This logical structure tells the computer to make a decision based on a rule.", a: "IF Statement", d: ["Loop", "Variable", "Array"] },
        { cat: "Aggregation & Logic", val: 200, q: "In `=IF(B1 > 60, \"Pass\", \"Fail\")`, what happens if B1 is 75?", a: "The cell says 'Pass'", d: ["The cell says 'Fail'", "It shows an error", "It deletes the number"] },
        { cat: "Aggregation & Logic", val: 200, q: "Using functions to summarize thousands of rows into one number is called:", a: "Aggregation", d: ["Decomposition", "Visualization", "Extraction"] },

        { cat: "Aggregation & Logic", val: 300, q: "Which function would you use to find the highest score on a test?", a: "MAX", d: ["MIN", "SUM", "COUNT"] },
        { cat: "Aggregation & Logic", val: 300, q: "An IF statement turns a passive spreadsheet into a:", a: "Active tool that can flag problems", d: ["Flat file list", "Video file", "Hard drive driver"] },
        { cat: "Aggregation & Logic", val: 300, q: "What is the correct syntax for a simple IF statement?", a: "=IF(condition, true_result, false_result)", d: ["=IF(true, false, condition)", "=IF(result, condition)", "=IF(math)"] },

        { cat: "Aggregation & Logic", val: 400, q: "A logic rule that flags inventory when it falls below 10 items is an example of:", a: "Automated Monitoring", d: ["Static Modeling", "Lossy Compression", "Manual Entry"] },
        { cat: "Aggregation & Logic", val: 400, q: "Aggregation functions like SUM and AVERAGE help us see the data's:", a: "Big Picture or 'Story'", d: ["File extension", "Hardware specs", "Binary code"] },
        { cat: "Aggregation & Logic", val: 400, q: "If you want to count how many students are in '10th Grade', you use:", a: "COUNTIF", d: ["SUM", "AVERAGE", "MAX"] },

        { cat: "Aggregation & Logic", val: 500, q: "Combining logic with math allows a spreadsheet to act as an automated:", a: "Grader or Security Monitor", d: ["Operating System", "Wi-Fi Router", "Microchip"] },
        { cat: "Aggregation & Logic", val: 500, q: "What does the 'MEDIAN' function find?", a: "The middle value in a sorted list.", d: ["The average.", "The total.", "The most common number."] },
        { cat: "Aggregation & Logic", val: 500, q: "Which function would help find the lowest price in a catalog?", a: "MIN", d: ["MAX", "SUM", "LOW"] },

        // --- CATEGORY: VISUALIZATION & INTERACTIVITY ---
        { cat: "Visualization & Interactivity", val: 100, q: "Which chart type is best for showing 'Parts of a Whole'?", a: "Pie Chart", d: ["Line Graph", "Scatter Plot", "Bar Chart"] },
        { cat: "Visualization & Interactivity", val: 100, q: "Which chart type is best for showing 'Trends Over Time'?", a: "Line Graph", d: ["Pie Chart", "Bar Chart", "Box Plot"] },
        { cat: "Visualization & Interactivity", val: 100, q: "A one-page visual summary that updates as a user interacts with it is a:", a: "Dashboard", d: ["Database", "Flat File", "Word Document"] },

        { cat: "Visualization & Interactivity", val: 200, q: "This interactive tool allows users to filter a dashboard by clicking buttons:", a: "Slicer", d: ["Formula Bar", "Relative Reference", "Checksum"] },
        { cat: "Visualization & Interactivity", val: 200, q: "Why is a 'Truncated Axis' (not starting at 0) considered misleading?", a: "It makes tiny changes look much larger than they actually are.", d: ["It uses too many colors.", "It crashes the web browser.", "It requires a special driver."] },
        { cat: "Visualization & Interactivity", val: 200, q: "Which chart is best for comparing different categories (like 4 school lunches)?", a: "Bar or Column Chart", d: ["Line Graph", "Pie Chart", "Scatter Plot"] },

        { cat: "Visualization & Interactivity", val: 300, q: "What is the ultimate form of 'Data Abstraction' in a spreadsheet?", a: "An Interactive Dashboard", d: ["A long list of numbers", "A binary conversion table", "A hardware spec sheet"] },
        { cat: "Visualization & Interactivity", val: 300, q: "As an 'Ethical Visualizer,' your charts should always be:", a: "Transparent, fair, and provide full context.", d: ["Brightly colored with red and green.", "Hidden from the general public.", "As complex as possible."] },
        { cat: "Visualization & Interactivity", val: 300, q: "Which chart helps identify relationships between two variables (like study time vs test scores)?", a: "Scatter Plot", d: ["Pie Chart", "Line Graph", "Bar Chart"] },

        { cat: "Visualization & Interactivity", val: 400, q: "To make charts accessible for colorblind users, you should avoid relying only on:", a: "Red and Green color coding.", d: ["Labels and titles.", "High-contrast colors.", "Axis numbers."] },
        { cat: "Visualization & Interactivity", val: 400, q: "A chart should be clear enough that a viewer understands it within:", a: "Three seconds", d: ["Ten minutes", "One hour", "A full day"] },
        { cat: "Visualization & Interactivity", val: 400, q: "In a Line Graph, the horizontal axis (X) should almost always represent:", a: "Time", d: ["Cost", "Weight", "Names"] },

        { cat: "Visualization & Interactivity", val: 500, q: "Dashboards empower others by allowing them to discover their own:", a: "Insights and answers", d: ["Binary codes", "Hardware failures", "Network passwords"] },
        { cat: "Visualization & Interactivity", val: 500, q: "Which principle ensures your message is readable from the back of a large room?", a: "High-contrast colors and clear labels", d: ["Small font sizes", "Using only blue and black", "Low resolution images"] },
        { cat: "Visualization & Interactivity", val: 500, q: "A Pie Chart is only appropriate if the slices add up to exactly:", a: "100%", d: ["50%", "Any number", "1,024"] }
    ].map(item => ({ ...item, chapter: "Chapter 9", grade: "CS & Literacy Guild" })));
    
})();