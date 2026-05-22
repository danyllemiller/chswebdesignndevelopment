/**
 * CHAPTER 4: How the Internet Works
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
        // --- CATEGORY: NODES, LINKS & SCALE ---
        { cat: "Nodes, Links & Scale", val: 100, q: "What is a 'node' on a network?", a: "Any device connected to the network (laptop, phone, printer)", d: ["The cables connecting the devices", "A type of computer virus", "The password to the Wi-Fi"] },
        { cat: "Nodes, Links & Scale", val: 100, q: "What is a 'link' in networking?", a: "The physical or wireless path that connects nodes", d: ["A clickable button on a website", "A type of server", "A piece of software"] },
        { cat: "Nodes, Links & Scale", val: 100, q: "What does LAN stand for?", a: "Local Area Network", d: ["Large Area Node", "Logical Array Network", "Linked Access Node"] },

        { cat: "Nodes, Links & Scale", val: 200, q: "Which type of network covers a small, restricted area like a single classroom?", a: "LAN (Local Area Network)", d: ["WAN (Wide Area Network)", "PAN (Private Area Network)", "GAN (Global Area Network)"] },
        { cat: "Nodes, Links & Scale", val: 200, q: "What does WAN stand for?", a: "Wide Area Network", d: ["Wireless Area Network", "Web Access Node", "Wired Array Network"] },
        { cat: "Nodes, Links & Scale", val: 200, q: "The global Internet is the largest example of what kind of network?", a: "WAN (Wide Area Network)", d: ["LAN (Local Area Network)", "Bluetooth Network", "Intranet"] },

        { cat: "Nodes, Links & Scale", val: 300, q: "What is the main difference between a LAN and a WAN?", a: "A LAN covers a small local area, while a WAN covers large geographic distances", d: ["A LAN is wireless, while a WAN uses cables", "A LAN is for Macs, while a WAN is for PCs", "There is no difference"] },
        { cat: "Nodes, Links & Scale", val: 300, q: "Which of these is an example of a physical link?", a: "An Ethernet cable", d: ["Wi-Fi radio waves", "Bluetooth signals", "Satellite connections"] },
        { cat: "Nodes, Links & Scale", val: 300, q: "Which of these is an example of a wireless link?", a: "Wi-Fi radio waves", d: ["Fiber optic cables", "Copper wiring", "An Ethernet cord"] },

        { cat: "Nodes, Links & Scale", val: 400, q: "Why do we need networks instead of just using 'standalone' computers?", a: "To share resources and data instantly across devices", d: ["To make computers run faster", "To save electricity", "To prevent all computer viruses"] },
        { cat: "Nodes, Links & Scale", val: 400, q: "If you print a document from your school computer to a printer down the hall, what are you using?", a: "The school's LAN", d: ["The global WAN", "The Dark Web", "A Bluetooth PAN"] },
        { cat: "Nodes, Links & Scale", val: 400, q: "In the 'Sneakernet' days, how was data moved between isolated computers?", a: "By saving it to a physical disk and walking it over", d: ["By using fiber optic cables", "By sending an email", "By using satellite internet"] },

        { cat: "Nodes, Links & Scale", val: 500, q: "A smart refrigerator connected to your home Wi-Fi is considered a:", a: "Node", d: ["Link", "Router", "Server"] },
        { cat: "Nodes, Links & Scale", val: 500, q: "What is the primary purpose of the 'Invisible Infrastructure' of the internet?", a: "To allow billions of devices to share data globally in milliseconds", d: ["To store video games locally", "To make computer monitors brighter", "To generate electricity for homes"] },
        { cat: "Nodes, Links & Scale", val: 500, q: "When your data leaves your house to go to Google.com, it transitions from your Home LAN to your ISP's:", a: "WAN", d: ["CPU", "Switch", "Bluetooth"] },

        // --- CATEGORY: NETWORK HARDWARE ---
        { cat: "Network Hardware", val: 100, q: "Which network device acts as the 'Librarian,' holding data like websites and videos?", a: "Server", d: ["Client", "Switch", "Hub"] },
        { cat: "Network Hardware", val: 100, q: "Which network device acts as the 'Post Office,' directing data between different networks?", a: "Router", d: ["Switch", "Hub", "Node"] },
        { cat: "Network Hardware", val: 100, q: "What is a 'Client' on a network?", a: "A device that asks a server for information (like your laptop)", d: ["A device that holds all the websites", "A device that links networks together", "A cable used for internet"] },

        { cat: "Network Hardware", val: 200, q: "What is the main difference between a Hub and a Switch?", a: "A Switch is 'smart' and sends data only to the correct device; a Hub shouts it to everyone", d: ["A Hub is faster than a Switch", "A Switch uses Wi-Fi, a Hub uses cables", "A Hub is for WANs, a Switch is for LANs"] },
        { cat: "Network Hardware", val: 200, q: "Why are Hubs considered slow and unsecure compared to Switches?", a: "Because they broadcast every piece of data to every connected device", d: ["Because they delete data randomly", "Because they only use fiber optics", "Because they overheat easily"] },
        { cat: "Network Hardware", val: 200, q: "Where does a Router typically sit?", a: "Between your local network (LAN) and the internet (WAN)", d: ["Inside the CPU", "Inside the computer monitor", "Between the mouse and keyboard"] },

        { cat: "Network Hardware", val: 300, q: "If you want to connect 20 computers together in a single classroom lab, what device should you use?", a: "A Switch", d: ["A Server", "A Router", "A Modem"] },
        { cat: "Network Hardware", val: 300, q: "What is the purpose of a Wireless Access Point (WAP)?", a: "To allow wireless devices to connect to a wired network", d: ["To block hackers from the internet", "To store website data", "To increase the computer's RAM"] },
        { cat: "Network Hardware", val: 300, q: "In the 'Mapping the Classroom' activity, what connects your computer to the wall port?", a: "An Ethernet cable", d: ["A USB drive", "A fiber optic strand", "A Bluetooth receiver"] },

        { cat: "Network Hardware", val: 400, q: "Servers are usually much more powerful than normal desktops and are stored in:", a: "Data Centers", d: ["Classrooms", "Living Rooms", "Briefcases"] },
        { cat: "Network Hardware", val: 400, q: "How does a Switch keep a local network quiet and fast?", a: "It learns the unique addresses of plugged-in devices and directs traffic efficiently", d: ["It turns off devices that aren't being used", "It deletes large files", "It blocks all internet access"] },
        { cat: "Network Hardware", val: 400, q: "If your home Wi-Fi is working but you can't reach Google, which device is likely failing to connect to the WAN?", a: "The Router", d: ["The Switch", "Your Laptop", "The Printer"] },

        { cat: "Network Hardware", val: 500, q: "What happens when a 'Client' requests a YouTube video?", a: "The client asks a YouTube Server to send the video file packets over the network", d: ["The client creates the video locally", "The router plays the video", "The switch downloads the video permanently"] },
        { cat: "Network Hardware", val: 500, q: "Why do enterprise networks use massive racks of Switches instead of Hubs?", a: "To prevent data collisions and ensure high-speed, secure local traffic", d: ["To make the network look cooler", "To generate more electricity", "To make it easier for hackers to enter"] },
        { cat: "Network Hardware", val: 500, q: "Which piece of hardware is responsible for looking at the destination address and deciding the best path for data to take?", a: "The Router", d: ["The Switch", "The Hub", "The Ethernet Cable"] },

        // --- CATEGORY: TOPOLOGIES & TRACING ---
        { cat: "Topologies & Tracing", val: 100, q: "What does 'Topology' mean in computer networking?", a: "The physical or logical 'shape' of the network", d: ["The study of mountains", "The speed of the internet", "The brand of the router"] },
        { cat: "Topologies & Tracing", val: 100, q: "In a Star Topology, all nodes connect to what?", a: "A central device, like a Switch", d: ["Each other in a big circle", "A single long cable", "The sky"] },
        { cat: "Topologies & Tracing", val: 100, q: "Which topology looks like a single, long cable that every computer plugs into?", a: "Bus Topology", d: ["Star Topology", "Ring Topology", "Mesh Topology"] },

        { cat: "Topologies & Tracing", val: 200, q: "Why is the Bus Topology rarely used today?", a: "Data collisions caused the network to slow down as more users joined", d: ["The cables were too expensive", "It only worked with wireless devices", "It required too much electricity"] },
        { cat: "Topologies & Tracing", val: 200, q: "What is the most common topology used in modern school labs and offices?", a: "Star Topology", d: ["Bus Topology", "Ring Topology", "Mesh Topology"] },
        { cat: "Topologies & Tracing", val: 200, q: "Which topology connects every node to many other nodes, creating multiple paths?", a: "Mesh Topology", d: ["Star Topology", "Bus Topology", "Ring Topology"] },

        { cat: "Topologies & Tracing", val: 300, q: "Why is the global Internet backbone built using a Mesh Topology?", a: "It is the most reliable because if one link breaks, data can take another path", d: ["It is the cheapest way to build a network", "It uses the least amount of cables", "It looks the prettiest on a map"] },
        { cat: "Topologies & Tracing", val: 300, q: "In the command prompt, what does the `tracert` (TraceRoute) command do?", a: "It visualizes the path and counts the 'hops' data takes to reach a website", d: ["It deletes viruses from the computer", "It tests the monitor's colors", "It downloads a file from the server"] },
        { cat: "Topologies & Tracing", val: 300, q: "In a TraceRoute, what does a single 'Hop' represent?", a: "A Router that the data passed through", d: ["A second of time", "A mile of cable", "A computer crashing"] },

        { cat: "Topologies & Tracing", val: 400, q: "What is 'Attenuation' in networking?", a: "The natural weakening of a signal as it travels over a long distance", d: ["The speed of the processor", "A type of computer virus", "The shape of the network"] },
        { cat: "Topologies & Tracing", val: 400, q: "Why do we use Fiber Optics instead of Copper for long-distance internet cables?", a: "Fiber uses light, which doesn't suffer from electrical interference and has low attenuation", d: ["Fiber is much heavier", "Fiber glows in the dark", "Copper is illegal to use underwater"] },
        { cat: "Topologies & Tracing", val: 400, q: "If a cable breaks in a Star Topology, what happens?", a: "Only the one computer connected to that cable loses its connection", d: ["The entire network shuts down", "The switch explodes", "Data collisions increase rapidly"] },

        { cat: "Topologies & Tracing", val: 500, q: "What is a 'Collision Domain'?", a: "A network segment where data packets can crash into each other, common in Bus topologies", d: ["A website for reporting car accidents", "A secure folder on a server", "A type of fiber optic cable"] },
        { cat: "Topologies & Tracing", val: 500, q: "How do undersea Fiber Optic cables transmit data across the Atlantic Ocean?", a: "By sending rapid pulses of light through glass strands", d: ["By sending electricity through copper wires", "By using satellite dishes", "By using Bluetooth"] },
        { cat: "Topologies & Tracing", val: 500, q: "If you run a TraceRoute to a server in Japan and see 15 hops, what does that mean?", a: "Your data was handed off 15 times by different routers across the globe", d: ["It took 15 seconds to load", "You used 15 megabytes of data", "The server is 15 miles away"] },

        // --- CATEGORY: ADDRESSING & DNS ---
        { cat: "Addressing & DNS", val: 100, q: "What does IP stand for in networking?", a: "Internet Protocol", d: ["Internal Processing", "Internet Provider", "Information Path"] },
        { cat: "Addressing & DNS", val: 100, q: "What is an IP Address?", a: "A unique string of numbers that identifies a device on a network", d: ["A physical location of a server", "A password for a Wi-Fi network", "A type of computer virus"] },
        { cat: "Addressing & DNS", val: 100, q: "What does DNS stand for?", a: "Domain Name System", d: ["Data Network Service", "Digital Name Server", "Dynamic Node System"] },

        { cat: "Addressing & DNS", val: 200, q: "What is the purpose of the DNS?", a: "It acts as the 'Phone Book' of the internet, translating URLs into IP addresses", d: ["It protects the computer from viruses", "It makes the internet faster", "It stores all website images"] },
        { cat: "Addressing & DNS", val: 200, q: "Why do we use human-friendly URLs like 'google.com' instead of IP addresses?", a: "Because computers are great at remembering numbers, but humans are not", d: ["Because IP addresses are illegal", "Because URLs load faster", "Because URLs use less electricity"] },
        { cat: "Addressing & DNS", val: 200, q: "Which IP version is the older standard that looks like 192.168.1.1?", a: "IPv4", d: ["IPv6", "IPv8", "IPX"] },

        { cat: "Addressing & DNS", val: 300, q: "Why did the world need to invent IPv6?", a: "We ran out of unique IPv4 addresses because there are too many devices in the world", d: ["IPv4 was too slow for gaming", "IPv4 only worked in America", "IPv4 was easily hacked"] },
        { cat: "Addressing & DNS", val: 300, q: "What does an IPv6 address look like?", a: "A long string of numbers and letters (hexadecimal)", d: ["Four sets of numbers separated by periods", "A single word like 'google.com'", "A 4-digit pin code"] },
        { cat: "Addressing & DNS", val: 300, q: "When you type a URL, what is the very first thing your computer does?", a: "It asks a DNS Server for the matching IP address", d: ["It downloads the entire website", "It runs a virus scan", "It turns on the Wi-Fi"] },

        { cat: "Addressing & DNS", val: 400, q: "If the school's DNS Server goes down, what happens?", a: "You cannot reach websites by typing their names, only by typing their exact IP addresses", d: ["The internet is permanently broken", "Your computer will shut off", "All websites become free"] },
        { cat: "Addressing & DNS", val: 400, q: "Why does your computer need a 'Return Address' (your IP) when searching Google?", a: "So the Google Server knows exactly where to send the search results back", d: ["To prove you aren't a robot", "To charge you money for the search", "To track your physical location for the police"] },
        { cat: "Addressing & DNS", val: 400, q: "How did the explosion of smartphones impact IP addressing?", a: "It caused the exhaustion of IPv4 addresses much faster than expected", d: ["It made IP addresses completely unnecessary", "It forced everyone to use DNS", "It slowed down the internet backbone"] },

        { cat: "Addressing & DNS", val: 500, q: "What does URL stand for?", a: "Uniform Resource Locator", d: ["Universal Routing Link", "Unified Resource Label", "User Routing Language"] },
        { cat: "Addressing & DNS", val: 500, q: "How many unique addresses does IPv6 provide compared to IPv4?", a: "Virtually infinite; enough for every grain of sand on Earth", d: ["Exactly double the amount", "About one million more", "Fewer addresses, but more secure ones"] },
        { cat: "Addressing & DNS", val: 500, q: "In the 'Phone Book' analogy, what is the equivalent of looking up your friend's name to find their phone number?", a: "Using DNS to translate a domain name into an IP address", d: ["Using a Router to find a switch", "Using a server to download a file", "Using an IP to find a MAC address"] },

        // --- CATEGORY: SCALABILITY, REDUNDANCY & PROTOCOLS ---
        { cat: "Scalability & Protocols", val: 100, q: "What does 'Scalability' mean for the internet?", a: "The ability to handle millions of new devices and users without breaking", d: ["The ability to weigh network cables", "The speed at which websites load", "The cost of building a server"] },
        { cat: "Scalability & Protocols", val: 100, q: "When data is sent across the internet, it is broken down into small 'envelopes' called:", a: "Packets", d: ["Boxes", "Letters", "Chunks"] },
        { cat: "Scalability & Protocols", val: 100, q: "What are 'Protocols' in computer science?", a: "A set of strict rules that govern how data is formatted and transmitted", d: ["The physical cables connecting routers", "A type of computer virus", "The password for a Wi-Fi network"] },

        { cat: "Scalability & Protocols", val: 200, q: "What does 'Redundancy' mean in networking?", a: "Having multiple backup paths for data to travel in case one link fails", d: ["Deleting old data automatically", "Using the same password everywhere", "Compressing files to save space"] },
        { cat: "Scalability & Protocols", val: 200, q: "Why does redundancy make the internet reliable?", a: "If a router in New York fails, data can automatically route through California instead", d: ["It prevents hackers from entering", "It makes the cables stronger", "It charges users extra money"] },
        { cat: "Scalability & Protocols", val: 200, q: "What happens if a single fiber optic cable is cut in a highly redundant network?", a: "Routers automatically find a different path and the network stays online", d: ["The entire internet crashes", "Data is lost forever", "The network slows down to 1 byte per second"] },

        { cat: "Scalability & Protocols", val: 300, q: "What does TCP/IP stand for?", a: "Transmission Control Protocol / Internet Protocol", d: ["Transfer Code Process / Internal Path", "Total Computer Protocol / Internet Path", "Telecom Center Protocol / IP"] },
        { cat: "Scalability & Protocols", val: 300, q: "What is the role of TCP (Transmission Control Protocol)?", a: "It ensures packets are assembled in the right order and checks for missing data", d: ["It finds the IP address", "It creates the website graphics", "It encrypts the data"] },
        { cat: "Scalability & Protocols", val: 300, q: "What is the role of IP (Internet Protocol) in TCP/IP?", a: "It handles the addressing and routing to ensure the packet knows where to go", d: ["It translates the website text", "It blocks computer viruses", "It plays audio files"] },

        { cat: "Scalability & Protocols", val: 400, q: "Why is data broken into tiny Packets instead of sent as one giant file?", a: "It allows data to travel efficiently through different routes and prevents network traffic jams", d: ["Giant files are illegal to send", "Routers can only hold one byte at a time", "It makes the file colorful"] },
        { cat: "Scalability & Protocols", val: 400, q: "If a packet gets lost during transmission, what does TCP do?", a: "It realizes a piece is missing and asks the sender to re-transmit that specific packet", d: ["It crashes the computer", "It ignores the missing data", "It deletes the rest of the file"] },
        { cat: "Scalability & Protocols", val: 400, q: "What is a 'Single Point of Failure'?", a: "A part of a system that, if it fails, will stop the entire system from working", d: ["A student failing a test", "A dropped internet packet", "A disconnected mouse"] },

        { cat: "Scalability & Protocols", val: 500, q: "Why is the internet considered 'Decentralized'?", a: "There is no one 'Main Computer' running the whole thing; it is a web of equal networks", d: ["It is only used in the center of cities", "All data goes to one server in Washington", "It has no rules or protocols"] },
        { cat: "Scalability & Protocols", val: 500, q: "In the 'When the Internet Breaks' case study, what usually causes massive global outages?", a: "A failure in a major centralized cloud provider that lacks sufficient redundancy", d: ["A single Ethernet cable being unplugged", "Too many people watching YouTube", "A power outage at a single house"] },
        { cat: "Scalability & Protocols", val: 500, q: "How does a 'Fault-Tolerant' system handle hardware failures?", a: "It continues operating properly by relying on redundant backup systems", d: ["It shuts down immediately to save data", "It alerts the police", "It sends an electrical shock to the router"] }
    ].map(item => ({ ...item, chapter: "Chapter 4", grade: "CS & Literacy Guild" })));
    
})();