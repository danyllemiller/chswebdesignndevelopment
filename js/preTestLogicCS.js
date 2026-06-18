/**
 * COMP SCI PRE-TEST ENGINE (DIAGNOSTIC EDITION)
 * COMP SCI VERSION - Uses MariaDB for gradebook & API for questions
 * FIXED: Better debugging, prioritizes API over embedded fallback
 */

// Wait for auth to complete before loading questions
async function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => { resolve(window.dacAuthData); };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

// Fallback questions for units 0-8 (only used if API completely fails)
// Each unit has 10 questions from its chapter
const csUnitQuestions = {
    // Unit 0: Office Productivity - Basic computer concepts
    0: [
        { chapter: 0, question: "What type of software is Microsoft Word primarily used for?", options: ["Word Processing", "Spreadsheet Calculations", "Presentation Graphics", "Database Management"] },
        { chapter: 0, question: "Which Microsoft Office application is best suited for creating financial budgets and calculations?", options: ["Excel", "Word", "PowerPoint", "Outlook"] },
        { chapter: 0, question: "What is the primary purpose of a spreadsheet application like Excel?", options: ["Organize and calculate numerical data", "Create visual presentations", "Send emails", "Design websites"] },
{ chapter: 0, question: "In Excel, an intersection of a row and column is called a:", options: ["Cell", "Block", "Grid", "Box"] },
        { chapter: 0, question: "Which file extension indicates a Microsoft Excel workbook?", options: [".xlsx", ".docx", ".pptx", ".pdf"] },
        { chapter: 0, question: "What is the main function of PowerPoint?", options: ["Create visual presentations", "Manage databases", "Write code", "Send emails"] },
        { chapter: 0, question: "Which Office application would you use to create a professional resume?", options: ["Word", "Excel", "PowerPoint", "Access"] },
        { chapter: 0, question: "What does the abbreviation 'PDF' stand for?", options: ["Portable Document Format", "Personal Data File", "Print Document First", "Protected Digital Format"] },
        { chapter: 0, question: "In a spreadsheet, what is a collection of related data cells called?", options: ["Range", "Block", "Group", "Cluster"] },
        { chapter: 0, question: "Which cloud storage service is integrated with Microsoft Office?", options: ["OneDrive", "Google Drive", "Dropbox", "iCloud"] }
    ],
    // Unit 'a' for legacy compatibility
    a: [
        { chapter: "a", question: "What is the physical metal component that pulls heat away from the CPU to prevent it from melting?", options: ["Heat Sink", "Power Supply Unit", "Cooling Fan", "Thermal Paste"] },
        { chapter: "a", question: "The speed at which a CPU can execute instructions is known as its:", options: ["Clock Speed", "Processing Limit", "Bus Rate", "Bandwidth"] },
        { chapter: "a", question: "A CPU clock speed of 3.0 GHz means the processor can handle how many cycles per second?", options: ["3 Billion", "3 Million", "3 Trillion", "3 Thousand"] },
        { chapter: "a", question: "Any external device connected to a computer, like a printer or scanner, is called a:", options: ["Peripheral", "Accessory", "Component", "Node"] },
        { chapter: "a", question: "Which specialized processor is designed specifically to render high-definition graphics and video?", options: ["GPU (Graphics Processing Unit)", "CPU (Central Processing Unit)", "ALU (Arithmetic Logic Unit)", "RAM (Random Access Memory)"] },
        { chapter: "a", question: "The standard physical size and shape of a motherboard (like ATX or Micro-ATX) is called its:", options: ["Form Factor", "Layout Profile", "Design Blueprint", "System Board Matrix"] },
        { chapter: "a", question: "Memory that contains permanent instructions for booting the computer and cannot be easily erased is:", options: ["ROM (Read-Only Memory)", "RAM (Random Access Memory)", "Cache Memory", "Virtual Memory"] },
        { chapter: "a", question: "Which fundamental firmware wakes up the hardware and loads the operating system when you press the power button?", options: ["BIOS / UEFI", "Windows OS", "Command Prompt", "Kernel"] },
        { chapter: "a", question: "What microscopic electronic component acts as a digital on/off switch inside the CPU?", options: ["Transistor", "Capacitor", "Resistor", "Diode"] },
        { chapter: "a", question: "The historical observation that the number of transistors on a microchip doubles every two years is known as:", options: ["Moore's Law", "Gates' Principle", "Turing's Theory", "The Silicon Rule"] }
    ],
    1: [
        { chapter: 1, question: "What is the fundamental building block of a network, representing any physical device connected to it?", options: ["Node", "Link", "Router", "Packet"] },
        { chapter: 1, question: "Which network type is most appropriate for connecting devices within a single high school classroom?", options: ["LAN (Local Area Network)", "WAN (Wide Area Network)", "VPN", "SAN"] },
        { chapter: 1, question: "The global system of interconnected computer networks that links billions of devices worldwide is a:", options: ["WAN", "LAN", "Intranet", "Subnet"] },
        { chapter: 1, question: "Why is a network Switch considered 'smarter' than a network Hub?", options: ["It directs data only to the specific intended device", "It broadcasts data to every port", "It encrypts the data automatically", "It generates IP addresses"] },
        { chapter: 1, question: "Which device functions as the 'Post Office' of the internet, directing data between different networks?", options: ["Router", "Switch", "Hub", "Modem"] },
        { chapter: 1, question: "In the Client-Server model, which node is responsible for holding the data and 'serving' it upon request?", options: ["Server", "Client", "Router", "Switch"] },
        { chapter: 1, question: "What is the most common modern LAN topology, where all nodes connect independently to a central Switch?", options: ["Star", "Bus", "Ring", "Mesh"] },
        { chapter: 1, question: "Which highly reliable topology connects every node to every other node, allowing data multiple paths?", options: ["Mesh", "Star", "Ring", "Bus"] },
        { chapter: 1, question: "How many bits are used in a standard IPv4 address?", options: ["32 bits", "64 bits", "128 bits", "8 bits"] },
        { chapter: 1, question: "What is the primary role of the Domain Name System (DNS)?", options: ["Translating human-friendly URLs into machine-friendly IP addresses", "Encrypting user passwords", "Assigning dynamic IP addresses", "Hosting website files"] }
    ],
    // Units 2-8 would come from the API database
    2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
};

// Fetch questions from the API with better debugging
async function fetchCSQuestionsFromAPI(unitNum) {
    console.log("[PreTestCS] ===== FETCHING QUESTIONS FOR UNIT " + unitNum + " =====");
    
    try {
        const url = '/api/cs-exam-questions?unit=' + unitNum + '&v=' + Date.now();
        console.log("[PreTestCS] Calling API: " + url);
        
        const response = await fetch(url);
        console.log("[PreTestCS] Response status:", response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error('API returned status: ' + response.status);
        }
        
        const data = await response.json();
        console.log("[PreTestCS] Full API response:", JSON.stringify(data).substring(0, 1000));
        
        // SUCCESS - API returned questions!
        if (data.questions && data.questions.length > 0) {
            console.log("[PreTestCS] SUCCESS: Got " + data.questions.length + " questions from MariaDB!");
            return data.questions;
        }
        
        // FAILURE - API returned empty data - log clearly for debugging
        console.error("===========================================");
        console.error("[PreTestCS] BUG FOUND: API returned 0 questions!");
        console.error("[PreTestCS] Check: 1) questions table has data, 2) exam_id = 'cs-unit-" + unitNum + "'");
        console.error("===========================================");
        
    } catch (e) {
        console.error("[PreTestCS] API EXCEPTION:", e.message);
        console.error("[PreTestCS] Stack:", e.stack);
    }
    
// Fallback to embedded only as last resort
    console.log("[PreTestCS] Using EMBEDDED fallback questions (API failed)");
    // Handle different unitNum formats - converts string "0" to number 0 for object key lookup
    let unitKey = unitNum;
    if (unitNum === "a" || unitNum === "A") {
        unitKey = "a"; // Keep 'a' as string for legacy compatibility
    } else if (unitNum === "0") {
        unitKey = 0; // Convert string "0" to number 0
    }
    // Try to find questions using the numeric key first, then string key
    if (csUnitQuestions[unitKey] && csUnitQuestions[unitKey].length > 0) {
        return csUnitQuestions[unitKey];
    }
    // Try string version if numeric didn't work (for unit "1" vs 1)
    if (typeof unitNum === 'number' && csUnitQuestions[String(unitNum)] && csUnitQuestions[String(unitNum)].length > 0) {
        return csUnitQuestions[String(unitNum)];
    }
    // If no fallback questions available, return empty array
    return [];
}

// Helper to ensure the base exam engine is fully loaded into the global scope
function ensureBaseEngine() {
    return new Promise((resolve, reject) => {
        if (window.initPreTest) {
            resolve(window.initPreTest);
            return;
        }
        const script = document.createElement('script');
        script.src = '/js/quizLogic.js';
        script.onload = () => {
            if (window.initPreTest) {
                resolve(window.initPreTest);
            } else {
                reject(new Error("Core testing function 'window.initPreTest' was not found in quizLogic.js"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load core script dependency: /js/quizLogic.js"));
        document.head.appendChild(script);
    });
}

// Main init function for CS pre-assessments - loads from API
window.initCSPreTest = async function(unitNum) {
    console.log("[PreTestCS] initCSPreTest called for unit " + unitNum);
    
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentId = user.student_id;

    // Fetch questions from the API
    const questions = await fetchCSQuestionsFromAPI(unitNum);
    
    if (questions.length === 0) {
        document.getElementById('exam-container').innerHTML = `
            <div class="alert alert-danger text-center">
                <h4>No Questions Available</h4>
                <p>Please contact your instructor - the question bank is empty for Unit ${unitNum}</p>
            </div>`;
        return;
    }

// Configure for Comp Sci track with the fetched questions
    const chapterLabel = (unitNum === "a") ? "Chapter A" : `Unit ${unitNum}`;
    const config = {
        questions: questions,
        chapterTitle: `${chapterLabel} Pre-Assessment`,
        questionCount: 10,
        trackType: 'compsci',
        // MARIADB ONLY - No Google Sheets webhook
        useGradebook: true
    };

    try {
        // Guarantee base engine script execution before firing canvas render
        const runEngine = await ensureBaseEngine();
        runEngine(config);
    } catch (err) {
        console.error("[Pre-Test Logic Engine Failure]:", err);
        document.getElementById('exam-container').innerHTML = `
            <div class="alert alert-danger text-center">
                <h4>Engine Initialization Error</h4>
                <p>${err.message}</p>
            </div>`;
    }
};
