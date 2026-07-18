// AstroAnna — Chapter 13 Starter
// Replace the URL below with your chosen public API endpoint
const API_URL = "https://api.example.com/data";

const fetchBtn = document.getElementById("fetch-btn");
const resultsSection = document.getElementById("results");

// ---------------------------------------------------------------
// STEP 1: Add a click listener to the button
// ---------------------------------------------------------------
fetchBtn.addEventListener("click", function () {
    fetchData();
});

// ---------------------------------------------------------------
// STEP 2: Write the async fetch function
// ---------------------------------------------------------------
async function fetchData() {
    resultsSection.innerHTML = "<p>Loading...</p>";

    // Add your fetch call here:
    // try {
    //     const response = await fetch(API_URL);
    //     const data = await response.json();
    //     displayResults(data);
    // } catch (error) {
    //     resultsSection.innerHTML = "<p>Error fetching data.</p>";
    //     console.error(error);
    // }
}

// ---------------------------------------------------------------
// STEP 3: Write the display function
// Build HTML cards from the data and inject into #results
// ---------------------------------------------------------------
function displayResults(data) {
    // Build your HTML here using the data object
    // resultsSection.innerHTML = ...
}
