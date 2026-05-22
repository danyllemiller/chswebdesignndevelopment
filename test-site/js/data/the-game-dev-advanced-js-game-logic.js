/**
 * CHAPTER 10: GAME DEV (Advanced JS)
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
        // --- CATEGORY: GAME LOOPS ---
        { cat: "Game Loops", val: 100, q: "The core function that runs approximately 60 times per second.", a: "Game Loop", d: ["While Loop", "Event Listener", "Main Method"] },
        { cat: "Game Loops", val: 100, q: "The browser API used to run smooth animations efficiently.", a: "requestAnimationFrame", d: ["setInterval", "setTimeout", "animate()"] },
        { cat: "Game Loops", val: 100, q: "The standard number of frames per second for smooth web movement.", a: "60 FPS", d: ["30 FPS", "24 FPS", "120 FPS"] },
        
        { cat: "Game Loops", val: 200, q: "The difference in time between the current frame and the last frame.", a: "Delta Time", d: ["Lag Time", "Refresh Rate", "Frame Gap"] },
        { cat: "Game Loops", val: 200, q: "Using delta time ensures that the game speed is independent of this.", a: "Framerate", d: ["Resolution", "Input Lag", "CPU Speed"] },
        { cat: "Game Loops", val: 200, q: "A loop that never stops running during gameplay.", a: "Infinite Loop", d: ["Finite Loop", "Logic Loop", "Render Loop"] },

        { cat: "Game Loops", val: 300, q: "The 'Update' step in a game loop specifically handles this.", a: "Logic", d: ["Rendering", "Painting", "Drawing"] },
        { cat: "Game Loops", val: 300, q: "The 'Draw' step in a game loop handles this visual process.", a: "Rendering", d: ["Logic", "Collision", "Input"] },
        { cat: "Game Loops", val: 300, q: "Stopping the game loop when the user switches tabs is called this.", a: "Auto-pausing", d: ["Hibernating", "Freezing", "Sleeping"] },

        { cat: "Game Loops", val: 400, q: "A fixed time step specifically used for consistent physics calculations.", a: "Internal Clock", d: ["System Time", "Game Timer", "Logic Sync"] },
        { cat: "Game Loops", val: 400, q: "The legacy JS method for loops, now replaced by RAF.", a: "setInterval", d: ["setTimeout", "requestAnimationFrame", "while"] },
        { cat: "Game Loops", val: 400, q: "A loop that finishes only when a specific condition is met.", a: "Finite Loop", d: ["Logic Loop", "Infinite Loop", "Dead Loop"] },

        { cat: "Game Loops", val: 500, q: "The term for when logic calculations fall behind the visual frame rate.", a: "Lag", d: ["Buffering", "Latency", "Ping"] },
        { cat: "Game Loops", val: 500, q: "Predicting where a game object will be in the very next frame.", a: "Interpolation", d: ["Extrapolation", "Collision", "Tweening"] },
        { cat: "Game Loops", val: 500, q: "Handling complex game logic in a separate background thread.", a: "Web Worker", d: ["Service Worker", "API Request", "Canvas Context"] },

        // --- CATEGORY: CANVAS API ---
        { cat: "Canvas API", val: 100, q: "The HTML tag used specifically for drawing graphics via scripts.", a: "<canvas>", d: ["<graphics>", "<svg>", "<img>"] },
        { cat: "Canvas API", val: 100, q: "The object used to access the 2D drawing environment.", a: "Context (2d)", d: ["Frame", "Canvas Shell", "Render Engine"] },
        { cat: "Canvas API", val: 100, q: "The canvas method used to draw a solid, filled rectangle.", a: "fillRect", d: ["drawRect", "makeBox", "strokeRect"] },

        { cat: "Canvas API", val: 200, q: "The property used to set the current fill color for shapes.", a: "fillStyle", d: ["color", "strokeColor", "fillColor"] },
        { cat: "Canvas API", val: 200, q: "The method used to erase a specific area of the canvas.", a: "clearRect", d: ["deleteRect", "wipe", "reset"] },
        { cat: "Canvas API", val: 200, q: "The method used to start a new drawing path.", a: "beginPath", d: ["startLine", "newPath", "drawStart"] },

        { cat: "Canvas API", val: 300, q: "The method used to draw a straight line to a specific coordinate.", a: "lineTo", d: ["drawLine", "moveTo", "strokeLine"] },
        { cat: "Canvas API", val: 300, q: "The method used to draw an arc or a circle.", a: "arc", d: ["circle", "curve", "round"] },
        { cat: "Canvas API", val: 300, q: "Capturing and saving the current state of the canvas context.", a: "save()", d: ["snapshot()", "store()", "backup()"] },

        { cat: "Canvas API", val: 400, q: "Restoring the previously saved state of the canvas context.", a: "restore()", d: ["reset()", "load()", "undo()"] },
        { cat: "Canvas API", val: 400, q: "Moving the origin point (0,0) to a new location on the canvas.", a: "translate()", d: ["move()", "offset()", "recenter()"] },
        { cat: "Canvas API", val: 400, q: "Rotating the entire drawing surface of the canvas.", a: "rotate()", d: ["spin()", "turn()", "flip()"] },

        { cat: "Canvas API", val: 500, q: "The method used to draw an external image onto the canvas surface.", a: "drawImage", d: ["putImage", "renderImg", "showPic"] },
        { cat: "Canvas API", val: 500, q: "Creating a smooth color transition effect across a shape.", a: "Gradient", d: ["Texture", "Pattern", "Shader"] },
        { cat: "Canvas API", val: 500, q: "Filling a shape with a repeating, tiled image pattern.", a: "Pattern", d: ["Sprite", "Texture", "Stencil"] },

        // --- CATEGORY: PHYSICS & LOGIC ---
        { cat: "Physics & Logic", val: 100, q: "The technique of detecting when two game objects overlap or touch.", a: "Collision Detection", d: ["Input Mapping", "State Checking", "Rendering"] },
        { cat: "Physics & Logic", val: 100, q: "The simplest collision check method using non-rotated rectangles.", a: "AABB", d: ["SAT", "GJK", "Raycast"] },
        { cat: "Physics & Logic", val: 100, q: "The simulated force that pulls objects downward on the screen.", a: "Gravity", d: ["Mass", "Weight", "Momentum"] },

        { cat: "Physics & Logic", val: 200, q: "The speed of an object in a specific direction.", a: "Velocity", d: ["Speed", "Acceleration", "Force"] },
        { cat: "Physics & Logic", val: 200, q: "The rate at which an object's velocity changes over time.", a: "Acceleration", d: ["Momentum", "Velocity", "Mass"] },
        { cat: "Physics & Logic", val: 200, q: "The resistance force that slows objects down when they rub together.", a: "Friction", d: ["Tension", "Torque", "Drag"] },

        { cat: "Physics & Logic", val: 300, q: "The physics property determining how 'bouncy' an object is.", a: "Restitution", d: ["Density", "Friction", "Elasticity"] },
        { cat: "Physics & Logic", val: 300, q: "A mathematical object used in physics that contains both X and Y values.", a: "Vector", d: ["Scalar", "Matrix", "Array"] },
        { cat: "Physics & Logic", val: 300, q: "The theorem used to calculate the exact distance between two game objects.", a: "Pythagorean Theorem", d: ["Law of Sines", "Quadratic Formula", "Ohm's Law"] },

        { cat: "Physics & Logic", val: 400, q: "Detecting collisions between objects based on their radius.", a: "Distance-based collision", d: ["AABB", "Box collision", "Edge detection"] },
        { cat: "Physics & Logic", val: 400, q: "Calculating if objects WILL collide before the frame is drawn.", a: "Predictive Collision", d: ["Post-collision", "Reactive Collision", "Static Check"] },
        { cat: "Physics & Logic", val: 400, q: "The 'invisible' area around a character that triggers a collision.", a: "Hitbox", d: ["Hurtbox", "Spritebox", "Collision Shell"] },

        { cat: "Physics & Logic", val: 500, q: "An invisible line used to detect collisions over long distances.", a: "Ray", d: ["Vector", "Segment", "Normal"] },
        { cat: "Physics & Logic", val: 500, q: "Shooting a 'ray' from a point to see where it hits an object.", a: "Raycasting", d: ["Raytracing", "Mapping", "Scanning"] },
        { cat: "Physics & Logic", val: 500, q: "A popular JS library used for advanced physics simulations.", a: "Matter.js", d: ["React.js", "Three.js", "Chart.js"] },

        // --- CATEGORY: STATE & INPUT ---
        { cat: "State & Input", val: 100, q: "A variable type used to track binary states (e.g. isGameOver).", a: "Boolean", d: ["String", "Number", "Array"] },
        { cat: "State & Input", val: 100, q: "The object that stores all the current data about a game's progress.", a: "State", d: ["Config", "Profile", "Save Game"] },
        { cat: "State & Input", val: 100, q: "The JavaScript event triggered when a key is first pressed.", a: "keydown", d: ["keyup", "keypress", "input"] },

        { cat: "State & Input", val: 200, q: "An object used to keep track of multiple keys being held down at once.", a: "Input Map", d: ["Key Table", "Control List", "Input Array"] },
        { cat: "State & Input", val: 200, q: "The event used to detect when a user clicks the mouse button.", a: "click", d: ["scroll", "hover", "drag"] },
        { cat: "State & Input", val: 200, q: "Standard method used to prevent default actions like page scrolling.", a: "preventDefault", d: ["stopEvent", "halt", "cancel"] },

        { cat: "State & Input", val: 300, q: "A custom set of named constants used for states (e.g. Win, Lose).", a: "Enum", d: ["Literal", "Variable", "Object"] },
        { cat: "State & Input", val: 300, q: "The process of moving from a 'Menu' screen to a 'Gameplay' screen.", a: "State Switching", d: ["Level Loading", "Scene Change", "Game Reset"] },
        { cat: "State & Input", val: 300, q: "The browser API used to connect game controllers via USB or Bluetooth.", a: "Gamepad API", d: ["Joystick API", "Controller API", "Input API"] },

        { cat: "State & Input", val: 400, q: "Input that triggers only once per press, regardless of how long it is held.", a: "Discrete Input", d: ["Continuous Input", "Single Input", "Static Input"] },
        { cat: "State & Input", val: 400, q: "Input that repeats constantly while a key is held down.", a: "Continuous Input", d: ["Discrete Input", "Hold Input", "Dynamic Input"] },
        { cat: "State & Input", val: 400, q: "A JS function that 'waits' for a user action to occur.", a: "Event Listener", d: ["Hook", "Callback", "Trigger"] },

        { cat: "State & Input", val: 500, q: "Creating a layer that handles multiple input types the same way.", a: "Input Abstraction", d: ["Input Mapping", "Device Sync", "Signal Logic"] },
        { cat: "State & Input", val: 500, q: "The API used to manage gestures and taps on a mobile device.", a: "Touch API", d: ["Mobile API", "Gesture API", "Haptic API"] },
        { cat: "State & Input", val: 500, q: "The ability of a screen to detect multiple fingers at once.", a: "Multi-touch", d: ["Dual-touch", "Omni-touch", "Gesture-touch"] },

        // --- CATEGORY: ASSETS & SOUND ---
        { cat: "Assets & Sound", val: 100, q: "A single image file that contains multiple animation frames or icons.", a: "Sprite Sheet", d: ["Asset Folder", "Texture Map", "Icon Grid"] },
        { cat: "Assets & Sound", val: 100, q: "A single, individual frame or graphic pulled from a sprite sheet.", a: "Sprite", d: ["Frame", "Asset", "Clip"] },
        { cat: "Assets & Sound", val: 100, q: "The process of loading all required files before the game begins.", a: "Preloading", d: ["Caching", "Indexing", "Buffering"] },

        { cat: "Assets & Sound", val: 200, q: "The browser API used for high-quality, complex sound manipulation.", a: "Web Audio API", d: ["Sound API", "JS Audio API", "Noise API"] },
        { cat: "Assets & Sound", val: 200, q: "The standard HTML tag used for simple audio playback.", a: "<audio>", d: ["<sound>", "<music>", "<voice>"] },
        { cat: "Assets & Sound", val: 200, q: "A short, one-time sound played for a specific action (like a jump).", a: "SFX", d: ["BGM", "OST", "Clip"] },

        { cat: "Assets & Sound", val: 300, q: "A sound or music file that repeats automatically from start to finish.", a: "Loop", d: ["Cycle", "Rebound", "Replay"] },
        { cat: "Assets & Sound", val: 300, q: "A collection of individual sprites that form a specific character movement.", a: "Animation Set", d: ["Frame Pack", "Sprite Sheet", "Motion Group"] },
        { cat: "Assets & Sound", val: 300, q: "The speed at which animation frames are swapped (usually FPS).", a: "Anim Speed", d: ["Loop Speed", "Playback Rate", "Refresh Rate"] },

        { cat: "Assets & Sound", val: 400, q: "Loading assets only at the exact moment they are needed to save memory.", a: "Lazy Loading", d: ["Preloading", "Active Loading", "Smart Loading"] },
        { cat: "Assets & Sound", val: 400, q: "Creating depth by having background layers scroll slower than foreground ones.", a: "Parallax Scrolling", d: ["Infinite Scroll", "Layered Scroll", "Perspective Map"] },
        { cat: "Assets & Sound", val: 400, q: "Sound that changes its volume or pan based on an object's distance.", a: "Spatial Audio", d: ["Stereo Audio", "3D Noise", "Dynamic Volume"] },

        { cat: "Assets & Sound", val: 500, q: "A small script that mathematically generates sound in real-time.", a: "Synthesizer", d: ["Oscillator", "Sampler", "Mixer"] },
        { cat: "Assets & Sound", val: 500, q: "The common JSON or XML file format used for defining 2D game levels.", a: "Tilemap", d: ["Gridmap", "Levelset", "Worldfile"] },
        { cat: "Assets & Sound", val: 500, q: "The specialized object that tracks the loading progress of all assets.", a: "Asset Loader", d: ["File Manager", "Progress Tracker", "Registry"] }
    ].map(item => ({ ...item, chapter: "Chapter 10", grade: "Web Design 2" })));
    
})();