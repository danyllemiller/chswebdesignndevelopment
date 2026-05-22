/**
 * CHAPTER 1: How Computers Work (Hardware)
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
       // --- CATEGORY: THE CPU & PROCESSING ---
    { cat: "The CPU & Processing", val: 100, q: "What does CPU stand for?", a: "Central Processing Unit", d: ["Computer Power Unit", "Core Processing Utility", "Central Performance Upgrade"] },
    { cat: "The CPU & Processing", val: 100, q: "The CPU is often referred to as the computer's what?", a: "Brain", d: ["Heart", "Lungs", "Stomach"] },
    { cat: "The CPU & Processing", val: 100, q: "What invention in 1947 allowed scientists to shrink giant room-sized vacuum tubes down to microscopic sizes?", a: "The Transistor", d: ["The Microchip", "The Motherboard", "The Silicon Wafer"] },

    { cat: "The CPU & Processing", val: 200, q: "Which part of the CPU is the 'Calculator' that handles the actual math and logical equations?", a: "The ALU (Arithmetic Logic Unit)", d: ["The CU (Control Unit)", "The RAM", "The SSD"] },
    { cat: "The CPU & Processing", val: 200, q: "Which part of the CPU acts as a 'traffic cop' or 'manager' that directs the flow of data?", a: "The Control Unit (CU)", d: ["The ALU", "The Motherboard", "The Kernel"] },
    { cat: "The CPU & Processing", val: 200, q: "The speed of a modern CPU's internal clock is measured in what unit?", a: "Gigahertz (GHz)", d: ["Megabytes (MB)", "Terabytes (TB)", "Kilowatts (kW)"] },

    { cat: "The CPU & Processing", val: 300, q: "A 3.5 GHz processor performs how many cycles every single second?", a: "3.5 billion cycles", d: ["3.5 million cycles", "3,500 cycles", "35 cycles"] },
    { cat: "The CPU & Processing", val: 300, q: "What acts as the 'Post-it Notes' of the CPU, providing microscopic, ultra-fast storage spots inside the chip itself?", a: "Registers", d: ["Hard Drives", "RAM", "Cores"] },
    { cat: "The CPU & Processing", val: 300, q: "The cycle the CPU uses to handle instructions is called Fetch, _____, and Execute.", a: "Decode", d: ["Delete", "Download", "Determine"] },

    { cat: "The CPU & Processing", val: 400, q: "What is the physical material most modern CPU chips are made from?", a: "Silicon", d: ["Copper", "Fiber Optics", "Plastic"] },
    { cat: "The CPU & Processing", val: 400, q: "In the 1940s, the room-sized ENIAC computer used thousands of what instead of modern chips?", a: "Vacuum tubes", d: ["Transistors", "Silicon chips", "LEDs"] },
    { cat: "The CPU & Processing", val: 400, q: "What does the Control Unit do during the 'Decode' step of the CPU cycle?", a: "Translates the instruction into a language of electrical signals", d: ["Deletes it from memory", "Sends it to the monitor", "Downloads it from the internet"] },

    { cat: "The CPU & Processing", val: 500, q: "If a CPU has four 'brains' working together on the same chip, what is it called?", a: "A Quad-Core processor", d: ["Four hard drives", "Four monitors", "Four power supplies"] },
    { cat: "The CPU & Processing", val: 500, q: "When the ALU performs the 'Execute' step, what is it actually doing?", a: "Performing mathematical and logical equations", d: ["Displaying pixels on the screen", "Playing audio through the speakers", "Cooling the computer down"] },
    { cat: "The CPU & Processing", val: 500, q: "In the layers of abstraction, the physical chips, screens, and circuits making up the CPU and Motherboard are known as what?", a: "The Hardware Layer", d: ["The Application Layer", "The System Software Layer", "The Cloud Layer"] },

    // --- CATEGORY: MEMORY & STORAGE ---
    { cat: "Memory & Storage", val: 100, q: "If the CPU is the brain, RAM acts as the computer's short-term what?", a: "Workspace / Desk", d: ["Filing Cabinet", "Trash Can", "Post Office"] },
    { cat: "Memory & Storage", val: 100, q: "Storage (like an SSD or HDD) acts as the computer's long-term what?", a: "Filing Cabinet", d: ["Workspace / Desk", "Traffic Cop", "Calculator"] },
    { cat: "Memory & Storage", val: 100, q: "RAM is 'Volatile', which means what happens when the power turns off?", a: "It is cleared out and the data is gone forever", d: ["The data is saved forever", "The computer explodes", "The data is sent to the cloud"] },

    { cat: "Memory & Storage", val: 200, q: "Storage is 'Non-Volatile', meaning data stays safe even when:", a: "The power is completely off", d: ["The power turns off", "The RAM gets full", "You close the laptop lid"] },
    { cat: "Memory & Storage", val: 200, q: "What does SSD stand for?", a: "Solid State Drive", d: ["Super Speed Disk", "System Storage Device", "Silicon System Drive"] },
    { cat: "Memory & Storage", val: 200, q: "Why is an SSD much faster than an older HDD?", a: "It uses ultra-fast flash memory with no moving parts", d: ["It uses a faster spinning magnetic platter", "It connects directly to the internet", "It is made of pure gold"] },

    { cat: "Memory & Storage", val: 300, q: "What physical circuit board acts as the 'spine' connecting the Filing Cabinet, Desk, and Brain together?", a: "The Motherboard", d: ["The CPU", "The Power Supply", "The Heat Sink"] },
    { cat: "Memory & Storage", val: 300, q: "How does data travel across the motherboard between components?", a: "Along the Bus (a system of tiny wires)", d: ["Through the air via Wi-Fi", "Down the CPU pipe", "Inside the RAM sticks"] },
    { cat: "Memory & Storage", val: 300, q: "What does HDD stand for, and how does it store data?", a: "Hard Disk Drive; spinning magnetic disks", d: ["Hardware Data Drive; lasers", "Hidden Disk Directory; flash memory", "Heavy Duty Drive; tape"] },

    { cat: "Memory & Storage", val: 400, q: "What happens during the 'Boot Process' when you turn your computer on?", a: "The Operating System is copied from slow Storage to ultra-fast RAM", d: ["The computer connects to the internet", "Old files are deleted", "The CPU turns off"] },
    { cat: "Memory & Storage", val: 400, q: "Why does it take a few seconds (or minutes) for a computer to turn on?", a: "Because it takes time to load the OS from the storage drive into the RAM", d: ["It is warming up the vacuum tubes", "It is downloading the OS from the cloud", "It is generating electricity"] },
    { cat: "Memory & Storage", val: 400, q: "On Windows, where can you go to see your CPU speed and Installed Physical Memory?", a: "System Information", d: ["Control Panel", "Task Manager", "Device Manager"] },

    { cat: "Memory & Storage", val: 500, q: "On macOS, what do you click to find out exactly how much RAM you have?", a: "The Apple Logo -> About This Mac", d: ["Finder -> Applications", "System Settings -> Network", "Safari -> Preferences"] },
    { cat: "Memory & Storage", val: 500, q: "If you turn off your computer before hitting 'Save' on a document, what happens to your work?", a: "Anything currently in RAM is cleared out and gone forever", d: ["It is saved automatically to the SSD", "It is printed to the screen", "It is emailed to you as a backup"] },
    { cat: "Memory & Storage", val: 500, q: "To make a computer run more applications smoothly at the same time, should you upgrade the 'Desk' or the 'Filing Cabinet'?", a: "The 'Desk' (RAM)", d: ["The 'Filing Cabinet' (Storage)", "The Monitor", "The Power Supply"] },

    // --- CATEGORY: ABSTRACTION & OS ---
    { cat: "Abstraction & OS", val: 100, q: "What is the 'mind' or invisible set of instructions that tells the hardware what to do?", a: "Software", d: ["The Motherboard", "The CPU", "The Heat Sink"] },
    { cat: "Abstraction & OS", val: 100, q: "What is the process of hiding complex computer details behind a simple interface?", a: "Abstraction", d: ["Encryption", "Decomposition", "Iteration"] },
    { cat: "Abstraction & OS", val: 100, q: "In the Piano Analogy, if the wood, keys, and strings are the Hardware, what is the Software?", a: "The sheet music", d: ["Electricity", "The pianist", "The pedals"] },

    { cat: "Abstraction & OS", val: 200, q: "Windows, macOS, and iOS are all examples of what layer of software?", a: "System Software (The Operating System)", d: ["Application Software", "Hardware Components", "Embedded Systems"] },
    { cat: "Abstraction & OS", val: 200, q: "What layer of the Abstraction Tower do you (the user) interact with directly when using Google Chrome or Minecraft?", a: "The Application Layer", d: ["The System Software Layer", "The Hardware Layer", "The BIOS Layer"] },
    { cat: "Abstraction & OS", val: 200, q: "What is the primary job of the Operating System (Middle Layer) when you click a mouse?", a: "It translates your clicks into hardware commands", d: ["It renders 3D graphics", "It connects to Wi-Fi", "It cools the CPU"] },

    { cat: "Abstraction & OS", val: 300, q: "True or False: You must understand exactly how a combustion engine works in order to drive a car.", a: "False; this is an example of abstraction", d: ["True; engines are required knowledge", "False; because of algorithms", "True; if it's a manual transmission"] },
    { cat: "Abstraction & OS", val: 300, q: "Which of the three layers executes the actual electrical signals?", a: "The Bottom Layer (Hardware)", d: ["The Top Layer (Application)", "The Middle Layer (OS)", "The Cloud Layer"] },
    { cat: "Abstraction & OS", val: 300, q: "The concept that divides the machine into Application, OS, and Hardware layers to make it easier to use is called:", a: "Abstraction", d: ["Decomposition", "Multitasking", "Booting"] },

    { cat: "Abstraction & OS", val: 400, q: "What represents the physical 'body' of the computer in our analogies?", a: "The Hardware", d: ["The Software", "The Operating System", "The Web Browser"] },
    { cat: "Abstraction & OS", val: 400, q: "Why do computer scientists use Abstraction in software design?", a: "To make computers easier to use by hiding complex details", d: ["To make computers run faster", "To save electricity costs", "To prevent viruses"] },
    { cat: "Abstraction & OS", val: 400, q: "The Operating System sits between which two layers in the abstraction tower?", a: "Application Software and Hardware", d: ["RAM and CPU", "Monitor and Keyboard", "Internet and Router"] },

    { cat: "Abstraction & OS", val: 500, q: "If you are playing Minecraft, which layer of abstraction are you directly using?", a: "Application Software", d: ["System Software", "Hardware", "The Motherboard"] },
    { cat: "Abstraction & OS", val: 500, q: "When you press the gas pedal in a car, you don't need to know how the fuel pump works. This is a real-world example of:", a: "Abstraction", d: ["Decomposition", "Iteration", "Data Validation"] },
    { cat: "Abstraction & OS", val: 500, q: "Without an Operating System, what would Application Software have to do?", a: "Talk directly to the physical hardware using complex electrical commands", d: ["Run twice as fast", "Turn into an embedded system", "Delete itself"] },

    // --- CATEGORY: EMBEDDED SYSTEMS ---
    { cat: "Embedded Systems", val: 100, q: "What is a computer built into a larger device for one specific, dedicated function called?", a: "An Embedded System", d: ["A General Purpose Computer", "An Operating System", "A Cloud Server"] },
    { cat: "Embedded Systems", val: 100, q: "A laptop or smartphone that can run thousands of different apps is known as what?", a: "A General Purpose Computer", d: ["An Embedded System", "A Static Model", "A Smart Appliance"] },
    { cat: "Embedded Systems", val: 100, q: "Does an embedded system usually need a full Operating System like Windows or macOS?", a: "No, it just needs to do its one job perfectly", d: ["Yes, to connect to Wi-Fi", "Yes, to run Word", "No, it doesn't use software"] },

    { cat: "Embedded Systems", val: 200, q: "The chip controlling your car's anti-lock brakes is an example of what?", a: "An Embedded System", d: ["A General Purpose Computer", "An Operating System", "Application Software"] },
    { cat: "Embedded Systems", val: 200, q: "Most of the computers in the world are actually what type?", a: "Embedded Systems", d: ["Smartphones", "Laptops", "Supercomputers"] },
    { cat: "Embedded Systems", val: 200, q: "A digital thermostat on your wall is an example of what type of computer?", a: "An Embedded System", d: ["A General Purpose Computer", "A Server", "A Mainframe"] },

    { cat: "Embedded Systems", val: 300, q: "Why doesn't a smart microwave need an OS like macOS?", a: "Because it only performs one specific, dedicated task", d: ["It doesn't have a screen", "It is not powerful enough", "macOS is too expensive"] },
    { cat: "Embedded Systems", val: 300, q: "If you want to play a game, write an essay, and browse the web, what kind of computer do you need?", a: "A General Purpose Computer", d: ["An Embedded System", "A Microcontroller", "A Calculator"] },
    { cat: "Embedded Systems", val: 300, q: "Can an Embedded System run thousands of different apps like a smartphone?", a: "No, it is dedicated to a single task", d: ["Yes, if updated", "Yes, with more RAM", "Yes, using the cloud"] },

    { cat: "Embedded Systems", val: 400, q: "Is the computer chip hidden inside a modern washing machine considered a General Purpose Computer?", a: "No, it is an Embedded System", d: ["Yes, it is General Purpose", "No, it is an OS", "Yes, if it has a digital clock"] },
    { cat: "Embedded Systems", val: 400, q: "Which type of system focuses entirely on being a 'Specialist' to do exactly one job perfectly?", a: "An Embedded System", d: ["A General Purpose Computer", "A Laptop", "A Desktop PC"] },
    { cat: "Embedded Systems", val: 400, q: "True or False: Your laptop is considered an embedded system.", a: "False, it is a General Purpose Computer", d: ["True, it has a battery", "False, it is a mainframe", "True, it runs an OS"] },

    { cat: "Embedded Systems", val: 500, q: "The hidden chips inside everyday appliances like microwaves and refrigerators are usually what kind of computers?", a: "Embedded Systems", d: ["CPUs", "RAM modules", "General Purpose Computers"] },
    { cat: "Embedded Systems", val: 500, q: "What primarily differentiates a smartphone from a digital thermostat?", a: "A smartphone is general purpose; a thermostat is an embedded system", d: ["A smartphone is hardware; a thermostat is software", "A smartphone is embedded; a thermostat is general purpose", "There is no difference"] },
    { cat: "Embedded Systems", val: 500, q: "Can a General Purpose Computer perform the tasks of multiple embedded systems through different apps?", a: "Yes, because it is designed to run thousands of different instructions", d: ["No", "Only if it is plugged into the wall", "Only if it uses a magnetic HDD"] },

    // --- CATEGORY: INPUT, OUTPUT & ACCESSIBILITY ---
    { cat: "Input, Output & Accessibility", val: 100, q: "Devices that allow you to 'talk' to the computer and send data IN are called:", a: "Input Devices", d: ["Output Devices", "Storage Devices", "Processing Devices"] },
    { cat: "Input, Output & Accessibility", val: 100, q: "Devices that are how the computer 'talks' back to you with data OUT are called:", a: "Output Devices", d: ["Input Devices", "Storage Devices", "Memory Devices"] },
    { cat: "Input, Output & Accessibility", val: 100, q: "A mouse and a keyboard are classic examples of what type of device?", a: "Input Devices", d: ["Output Devices", "Storage Devices", "Networking Devices"] },

    { cat: "Input, Output & Accessibility", val: 200, q: "External pieces of hardware connected to the computer are often called what?", a: "Peripherals", d: ["Cores", "Registers", "Buses"] },
    { cat: "Input, Output & Accessibility", val: 200, q: "Microphones and Webcams translate sound waves and light into what?", a: "1s and 0s the CPU can understand", d: ["English words", "Vibrations", "Pixels"] },
    { cat: "Input, Output & Accessibility", val: 200, q: "What hidden input sensor allows a phone to know when you tilt it for a racing game?", a: "An Accelerometer", d: ["A GPS", "A Haptic motor", "A Microphone"] },

    { cat: "Input, Output & Accessibility", val: 300, q: "What input sensor allows a phone to know exactly where you are on a map?", a: "A GPS sensor", d: ["An Accelerometer", "A Webcam", "A Speaker"] },
    { cat: "Input, Output & Accessibility", val: 300, q: "Monitors turn digital data into light by controlling millions of tiny colored dots called what?", a: "Pixels", d: ["Vibrations", "Haptics", "Sound waves"] },
    { cat: "Input, Output & Accessibility", val: 300, q: "When your phone vibrates to give you a tactile notification, it is using what kind of output device?", a: "A Haptic output device", d: ["A Visual output", "An Audio output", "An Input sensor"] },

    { cat: "Input, Output & Accessibility", val: 400, q: "What accessibility output device reads the text on a screen out loud for visually impaired users?", a: "A Screen Reader", d: ["A Microphone", "A Braille Keyboard", "A Web Camera"] },
    { cat: "Input, Output & Accessibility", val: 400, q: "What accessibility input device allows limited mobility users to control a mouse by simply breathing into a tube?", a: "Sip-and-Puff Systems", d: ["Screen Readers", "Braille Displays", "Haptic Motors"] },
    { cat: "Input, Output & Accessibility", val: 400, q: "What output device uses tiny pins that pop up and down so a user can 'read' the screen with their fingertips?", a: "A Braille Display", d: ["A Screen Reader", "A Sip-and-Puff", "A Standard Keyboard"] },

    { cat: "Input, Output & Accessibility", val: 500, q: "Ensuring that technology is designed to be usable by everyone, regardless of physical ability, is called what?", a: "Accessibility", d: ["Usability", "Multitasking", "Abstraction"] },
    { cat: "Input, Output & Accessibility", val: 500, q: "Speakers act as output devices by turning digital data into physical what?", a: "Vibrations in the air that we hear as sound", d: ["Pixels on a screen", "Electrical signals", "Heat energy"] },
    { cat: "Input, Output & Accessibility", val: 500, q: "Why is a modern smartphone touchscreen unique compared to traditional hardware?", a: "It acts as both an Input and an Output device simultaneously", d: ["It doesn't use electricity", "It acts as the CPU", "It requires no software to run"] }
    ].map(item => ({ ...item, chapter: "Chapter 1", grade: "CS & Literacy Guild" })));
    
})();