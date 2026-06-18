/* Day 5: Render, Toggle, Debug
    Name: __________________
*/

// 1. THE DATA (Do not change this)
const pets = [
    {
        name: 'Robo-Pup',
        img: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pup',
        fact: 'Runs on solar power and loves naps.'
    },
    {
        name: 'Cyber-Kitty',
        img: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kitty',
        fact: 'Chases laser pointers made of actual lasers.'
    },
    {
        name: 'Mecha-Bird',
        img: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bird',
        fact: 'Can fly at Mach 1 for 3 seconds.'
    }
];

// 2. THE RENDER FUNCTION
function renderPets() {
    console.log("Render function started...");

    // TODO Step A: Select the container (#pet-container)
    // const container = ...


    // TODO Step B: Loop through the pets array
    // for (const pet of pets) {
        
        // DEBUG: Check if we are looping correctly
        // console.log("Current pet:", pet);

        // TODO Step C: Create Elements
        // 1. Create div for card (add class 'card')

        // 2. Create h3 for name (use pet.name)

        // 3. Create img (use pet.img)

        // 4. Create p for fact (use pet.fact, add class 'hidden-fact')


        // TODO Step D: Create Button & Add Event Listener
        // Create button, set text to 'Show Fact'
        // Add click listener to toggle 'hidden-fact' on the paragraph


        // TODO Step E: Append elements to card, then card to container
        
    // } // End of Loop
}

// 3. INITIALIZATION
// We wait for the DOM, then run our robot.
document.addEventListener('DOMContentLoaded', () => {
    renderPets();
});