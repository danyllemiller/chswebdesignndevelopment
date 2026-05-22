/**
 * CHAPTER 10: Computational Modeling
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
        // --- CATEGORY: MODEL FOUNDATIONS ---
        { cat: "Model Foundations", val: 100, q: "A simplified digital representation of a real-world process using math and logic is a:", a: "Computational Model", d: ["Hardware Spec", "Flat File", "Word Document"] },
        { cat: "Model Foundations", val: 100, q: "What is the primary purpose of a computational model?", a: "To test ideas and predict outcomes in a safe digital 'sandbox'.", d: ["To make the computer monitor brighter.", "To delete old spreadsheet files.", "To hide data from the internet."] },
        { cat: "Model Foundations", val: 100, q: "In modeling, we strip away unnecessary details to focus on core math. This is:", a: "Abstraction", d: ["Compression", "Encryption", "Exfiltration"] },

        { cat: "Model Foundations", val: 200, q: "A model that represents a 'snapshot' in time and does not change on its own is:", a: "Static Model", d: ["Dynamic Model", "Linear Model", "Exponential Model"] },
        { cat: "Model Foundations", val: 200, q: "A model that changes over time based on specific rules and feedback loops is:", a: "Dynamic Model", d: ["Static Model", "Flat File", "Binary String"] },
        { cat: "Model Foundations", val: 200, q: "Which of these is an example of a 'Static Model'?", a: "A spreadsheet showing your current semester grades.", d: ["A simulation of a growing bee colony.", "A wildfire spread predictor.", "A flight simulator."] },

        { cat: "Model Foundations", val: 300, q: "What is a 'Digital Laboratory' in the context of computer science?", a: "A model used to test things that are too dangerous or expensive for real life.", d: ["A room filled with physical servers.", "An antivirus software program.", "A website for buying hardware."] },
        { cat: "Model Foundations", val: 300, q: "Why do architects use computational models before pouring concrete?", a: "To simulate if a building will survive an earthquake.", d: ["To see what color the walls should be.", "To connect the building to the Wi-Fi.", "To calculate the price of a mouse."] },
        { cat: "Model Foundations", val: 300, q: "A video game character's movement is usually governed by what type of model?", a: "A Dynamic Model of physics.", d: ["A Static Model of text.", "A Primary Key relationship.", "A Hexadecimal color chart."] },

        { cat: "Model Foundations", val: 400, q: "If a model calculates results based on what happened in the previous step, it is:", a: "Dynamic", d: ["Static", "Truncated", "Lossy"] },
        { cat: "Model Foundations", val: 400, q: "In a 'Virus Spread' model, do you need to know the students' favorite colors?", a: "No; Abstraction requires removing unnecessary details.", d: ["Yes; every detail is critical for math.", "No; color is only used in Unit 5.", "Yes; it helps the CPU run faster."] },
        { cat: "Model Foundations", val: 400, q: "Computational modeling is the foundation of which modern professional skill?", a: "Data-driven decision making.", d: ["Manual typewriter operation.", "Physical filing cabinet organization.", "Binary-to-Decimal speed typing."] },

        { cat: "Model Foundations", val: 500, q: "What is a 'Feedback Loop' in a dynamic model?", a: "When the output of one step becomes the input for the next step.", d: ["When the computer speakers make a loud noise.", "When a user deletes a file and regrets it.", "When a network router crashes."] },
        { cat: "Model Foundations", val: 500, q: "How do scientists use models to study things too big to see (like the solar system)?", a: "By using math to scale down distances and speeds into a simulation.", d: ["By building a physical model out of wood.", "By ignoring the math and guessing.", "By looking at a photo only."] },
        { cat: "Model Foundations", val: 500, q: "The accuracy of a digital blueprint depends on correctly identifying:", a: "The specific rules and logic that drive the system.", d: ["The brand of the computer case.", "The color of the icons on the screen.", "The length of the power cable."] },

        // --- CATEGORY: VARIABLES & PARAMETERS ---
        { cat: "Variables & Parameters", val: 100, q: "A piece of data that changes during a simulation run is a:", a: "Variable", d: ["Parameter", "Constant", "Static Key"] },
        { cat: "Variables & Parameters", val: 100, q: "In a wildfire model, 'Wind Speed' is likely what type of input?", a: "Variable", d: ["Parameter", "Fixed Label", "Primary Key"] },
        { cat: "Variables & Parameters", val: 100, q: "The 'Knobs and Dials' you turn to change a model's outcome are:", a: "Inputs (Variables and Parameters)", d: ["Outputs", "Physical Hardware", "Screen Pixels"] },

        { cat: "Variables & Parameters", val: 200, q: "A value that stays the same for a specific run of a model is a:", a: "Parameter", d: ["Variable", "Dynamic Link", "Logic Gate"] },
        { cat: "Variables & Parameters", val: 200, q: "If you set 'Type of Wood' in a fire model and don't change it, it is a:", a: "Parameter", d: ["Variable", "Result", "Formula"] },
        { cat: "Variables & Parameters", val: 200, q: "In the Paper Airplane activity, the 'Weight' of the paper you choose is a:", a: "Variable (if you change it to see the impact)", d: ["Algorithm", "Logic Error", "Output"] },

        { cat: "Variables & Parameters", val: 300, q: "What happens if a Data Architect forgets a key variable in a model?", a: "The simulation will be inaccurate and misleading.", d: ["The computer will explode.", "The Wi-Fi will disconnect.", "The file size will become zero."] },
        { cat: "Variables & Parameters", val: 300, q: "Thinking about the 'Hidden Forces' that make a system move is called:", a: "Systems Thinking", d: ["Binary Conversion", "Data Entry", "Hardware Spec Writing"] },
        { cat: "Variables & Parameters", val: 300, q: "In a traffic model, why is 'Traffic Light Timing' a vital variable?", a: "It directly impacts how fast cars can move through the system.", d: ["It makes the model look more colorful.", "It is a requirement of the HTML code.", "It speeds up the hard drive."] },

        { cat: "Variables & Parameters", val: 400, q: "In a spreadsheet model, why keep 'Inputs' in separate cells from 'Formulas'?", a: "So you can turn the 'Knobs' without breaking the math engine.", d: ["To hide the data from the user.", "To make the file heavier.", "Because formulas are illegal to see."] },
        { cat: "Variables & Parameters", val: 400, q: "If you change an input and the output doesn't change, what is likely wrong?", a: "The variable is not correctly linked to the formula.", d: ["The computer is out of RAM.", "The variable is too large.", "The monitor is broken."] },
        { cat: "Variables & Parameters", val: 400, q: "In the Paper Airplane activity, the 'Average Distance' was your:", a: "Output / Result", d: ["Variable", "Parameter", "Baseline"] },

        { cat: "Variables & Parameters", val: 500, q: "The 'Baseline' in a model (like the first 3 throws of a plane) is also called the:", a: "Control Group", d: ["Variable Group", "Logic Engine", "Static Block"] },
        { cat: "Variables & Parameters", val: 500, q: "If a business model includes 'Rent' which never changes, it is a:", a: "Constant / Parameter", d: ["Dynamic Variable", "Lossy File", "Random Number"] },
        { cat: "Variables & Parameters", val: 500, q: "Choosing the 'Right' variables is an example of what CS principle?", a: "Decomposition (breaking the system into parts)", d: ["Encryption", "Localization", "Compression"] },

        // --- CATEGORY: DATA RELATIONSHIPS ---
        { cat: "Data Relationships", val: 100, q: "When two pieces of data move together, they have a:", a: "Correlation", d: ["Causation", "Binary Pair", "Hardware Link"] },
        { cat: "Data Relationships", val: 100, q: "When one event directly makes another event happen, it is:", a: "Causation", d: ["Correlation", "Randomness", "Static State"] },
        { cat: "Data Relationships", val: 100, q: "Buying ice cream and shark attacks move together in summer. This is:", a: "Correlation (not Causation)", d: ["Causation", "A Logic Error", "Binary Code"] },

        { cat: "Data Relationships", val: 200, q: "A relationship where changes happen at a steady, predictable rate is:", a: "Linear", d: ["Non-Linear", "Exponential", "Truncated"] },
        { cat: "Data Relationships", val: 200, q: "A relationship where small changes in input lead to explosive changes in output is:", a: "Non-Linear / Exponential", d: ["Linear", "Static", "Flat"] },
        { cat: "Data Relationships", val: 200, q: "Doubling a cookie recipe is an example of what kind of relationship?", a: "Linear", d: ["Exponential", "Non-Linear", "Random"] },

        { cat: "Data Relationships", val: 300, q: "Social media posts that 'Go Viral' are examples of what growth pattern?", a: "Exponential / Non-Linear", d: ["Linear", "Static", "Downward"] },
        { cat: "Data Relationships", val: 300, q: "Why is proving 'Causation' important for a Logic Builder?", a: "To ensure the model understands the true 'Engine' of the system.", d: ["To make the charts look prettier.", "To save electricity.", "Because it is required by law."] },
        { cat: "Data Relationships", val: 300, q: "On a graph, a straight diagonal line represents what relationship?", a: "Linear", d: ["Non-Linear", "Random", "Static"] },

        { cat: "Data Relationships", val: 400, q: "What is the third variable that 'causes' ice cream sales and shark attacks to move?", a: "Summer Heat", d: ["Money", "The Internet", "CPU Speed"] },
        { cat: "Data Relationships", val: 400, q: "Models based only on correlations usually fail because they lack:", a: "Understanding of direct cause-and-effect.", d: ["Enough colors.", "Wi-Fi access.", "Large monitors."] },
        { cat: "Data Relationships", val: 400, q: "A chart showing population growth over 1,000 years usually looks like:", a: "A sharp upward curve (Non-Linear).", d: ["A perfectly straight line.", "A flat line.", "A circle."] },

        { cat: "Data Relationships", val: 500, q: "If you increase 'Temperature' and a pot of water boils, this is:", a: "Causation", d: ["Correlation", "Static Modeling", "Abstraction"] },
        { cat: "Data Relationships", val: 500, q: "In math terms, a non-linear relationship is often modeled using:", a: "Exponents or Multiplication", d: ["Simple Addition", "Subtraction", "Rounding"] },
        { cat: "Data Relationships", val: 500, q: "Which relationship is harder to predict for a computer model?", a: "Non-Linear (Exponential)", d: ["Linear", "Static", "Constant"] },

        // --- CATEGORY: SIMULATION LOGIC ---
        { cat: "Simulation Logic", val: 100, q: "Using a model to explore different scenarios is called:", a: "'What-If' Analysis", d: ["Data Cleaning", "Hardware Mounting", "File Compression"] },
        { cat: "Simulation Logic", val: 100, q: "A single 'run' of a computational model is called a:", a: "Simulation", d: ["Variable", "Flat File", "Record"] },
        { cat: "Simulation Logic", val: 100, q: "In the Lemonade Stand, what was the primary input variable?", a: "Weather", d: ["Binary", "The Hard Drive", "The Keyboard"] },

        { cat: "Simulation Logic", val: 200, q: "Running a simulation 1,000 times with different inputs is a:", a: "Monte Carlo Simulation", d: ["Linear Path", "Static Snapshot", "Binary Switch"] },
        { cat: "Simulation Logic", val: 200, q: "The goal of a 'What-If' analysis is to find the:", a: "Most likely outcome or worst-case scenario.", d: ["Fastest CPU speed.", "Cheapest monitor.", "Longest password."] },
        { cat: "Simulation Logic", val: 200, q: "In the Lemonade simulator, if Weather = Sun, Customer Demand was:", a: "High", d: ["Low", "Zero", "Exactly 10"] },

        { cat: "Simulation Logic", val: 300, q: "What is the 'Sweet Spot' in a business model simulation?", a: "The price point that balances demand and profit for the best result.", d: ["The name of the store.", "A type of sugar used in lemonade.", "The brand of laptop used."] },
        { cat: "Simulation Logic", val: 300, q: "Simulations allow us to 'fail' in the computer so we can:", a: "Succeed in the real world.", d: ["Delete our grades.", "Hack a server.", "Buy more RAM."] },
        { cat: "Simulation Logic", val: 300, q: "Which spreadsheet function is the heart of the Lemonade Stand engine?", a: "IF", d: ["SUM", "AVERAGE", "COUNT"] },

        { cat: "Simulation Logic", val: 400, q: "If price is too high in a model, demand goes to zero. This is a:", a: "Logic Rule / Penalty", d: ["Hardware failure", "Syntax error", "Binary conversion"] },
        { cat: "Simulation Logic", val: 400, q: "A 'What-If' model for a bank helps them predict:", a: "How many people will fail to pay back loans.", d: ["The color of the bank's logo.", "The weight of the vault door.", "The size of the keyboard."] },
        { cat: "Simulation Logic", val: 400, q: "Running multiple simulations helps a Power User identify:", a: "Patterns and Trends", d: ["Spelling mistakes", "CPU serial numbers", "Pixel depth"] },

        { cat: "Simulation Logic", val: 500, q: "In the Lemonade Stand, Profit = (Price - Cost) * _____", a: "Demand", d: ["Weather", "RAM", "Encryption"] },
        { cat: "Simulation Logic", val: 500, q: "Why is a computer simulation faster than real-world testing?", a: "It can run millions of mathematical steps in seconds.", d: ["It doesn't use math.", "It only works at night.", "It is 100% accurate without testing."] },
        { cat: "Simulation Logic", val: 500, q: "A flight simulator is a high-fidelity version of which CS concept?", a: "Computational Model / Simulation", d: ["Flat File", "Relational Database", "Hard Drive Driver"] },

        // --- CATEGORY: VALIDATION & ETHICS ---
        { cat: "Validation & Ethics", val: 100, q: "What does GIGO stand for?", a: "Garbage In, Garbage Out", d: ["Global Internet Gateway Operations", "Great Information, Great Output", "Get Input, Generate Output"] },
        { cat: "Validation & Ethics", val: 100, q: "The process of comparing a model's prediction to real-world results is:", a: "Validation", d: ["Abstraction", "Compression", "Encryption"] },
        { cat: "Validation & Ethics", val: 100, q: "If a model predicts 50 customers but you only get 5, your model is:", a: "Not Valid / Needs Refinement", d: ["Perfect", "A hardware success", "A binary failure"] },

        { cat: "Validation & Ethics", val: 200, q: "Why are models often dangerously wrong?", a: "Because they might be missing a key variable or using bad data.", d: ["Because computers hate math.", "Because binary is too simple.", "Because electricity is unstable."] },
        { cat: "Validation & Ethics", val: 200, q: "The 'Human Factor' means models are limited because:", a: "Humans act on unpredictable emotions and sudden mood changes.", d: ["Humans are too slow to type.", "Humans don't understand binary.", "Humans are too expensive."] },
        { cat: "Validation & Ethics", val: 200, q: "If your input data only represents one group of people, your model is:", a: "Biased", d: ["Lossless", "Standardized", "Relational"] },

        { cat: "Validation & Ethics", val: 300, q: "Which phase of the SDLC (from Ch 15) handles model refinement?", a: "Test and Maintain", d: ["Plan", "Build", "Hardware"] },
        { cat: "Validation & Ethics", val: 300, q: "A Data Architect must be a 'Skeptic,' which means they should:", a: "Always question the numbers and look for flaws in the logic.", d: ["Never use a computer.", "Assume the computer is always 100% right.", "Delete all their data."] },
        { cat: "Validation & Ethics", val: 300, q: "What happens to a model's prediction if the starting math is wrong?", a: "It becomes a 'Calculated Lie'.", d: ["It stays 100% accurate.", "The CPU fixes it automatically.", "It turns into a video file."] },

        { cat: "Validation & Ethics", val: 400, q: "Climate models are often debated because they must handle thousands of:", a: "Complex, interacting variables.", d: ["Different colors.", "Network passwords.", "Keyboard shortcuts."] },
        { cat: "Validation & Ethics", val: 400, q: "Should a model be used to make a law if it hasn't been validated?", a: "No; it could have harmful unintended consequences.", d: ["Yes; models are always better than humans.", "Yes; as long as the charts are pretty.", "No; because models are illegal."] },
        { cat: "Validation & Ethics", val: 400, q: "In the Lemonade Stand, forgetting to subtract the 'Cost' of lemons is a:", a: "GIGO mistake (bad logic).", d: ["Hardware failure.", "Network timeout.", "Monitor glitch."] },

        { cat: "Validation & Ethics", val: 500, q: "What is the 'Black Box' problem in advanced models?", a: "When we see the result but don't know exactly how the model calculated it.", d: ["When the monitor turns off.", "When the hard drive is physically black.", "When the Wi-Fi is hidden."] },
        { cat: "Validation & Ethics", val: 500, q: "A model that predicts success but ignores systemic barriers is:", a: "Ethically flawed.", d: ["Statistically perfect.", "A hardware requirement.", "A lossless compression."] },
        { cat: "Validation & Ethics", val: 500, q: "Ultimately, a model is a _____, not an oracle.", a: "Tool", d: ["God", "Law", "Secret"] }
    ].map(item => ({ ...item, chapter: "Chapter 10", grade: "CS & Literacy Guild" })));
    
})();