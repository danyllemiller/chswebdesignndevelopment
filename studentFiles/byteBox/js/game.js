// ByteBox Arcade — Chapter 14 Starter
// js/game.js

document.addEventListener("DOMContentLoaded", function () {

    const saveBtn = document.getElementById("save-btn");
    const statusMsg = document.getElementById("status-msg");
    const scoreList = document.getElementById("score-list");

    // ---------------------------------------------------------------
    // SECTION: Saving Data (Local Storage)
    // Follow along: save a score to localStorage
    // ---------------------------------------------------------------
    function saveHighScore(name, score) {
        // Step 1: Read the existing scores array from localStorage
        // Hint: use localStorage.getItem("bytebox_scores")
        // If nothing is saved yet, start with an empty array []

        // Step 2: Add the new score object to the array
        // { name: name, score: score }

        // Step 3: Save the updated array back to localStorage
        // Hint: use JSON.stringify() to convert array → string
    }

    // ---------------------------------------------------------------
    // SECTION: Reading Data (Local Storage)
    // Follow along: load scores and display them on the page
    // ---------------------------------------------------------------
    function loadLeaderboard() {
        // Step 1: Read scores from localStorage
        // Hint: use localStorage.getItem("bytebox_scores")
        // Hint: use JSON.parse() to convert string → array

        // Step 2: Sort scores from highest to lowest

        // Step 3: Build and display the list items in #score-list
    }

    // ---------------------------------------------------------------
    // SECTION: Button Click Handler
    // ---------------------------------------------------------------
    saveBtn.addEventListener("click", function () {
        const name = document.getElementById("player-name").value.trim();
        const score = parseInt(document.getElementById("player-score").value);

        // Add your input validation here (check for empty name, valid score)

        // Call saveHighScore() and loadLeaderboard()
    });

    // Load leaderboard when page first opens
    loadLeaderboard();

});
