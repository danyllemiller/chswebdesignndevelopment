function updateExhibitSign() {
    // 1. Lock onto the target element using its ID
    const signElement = document.getElementById("statusSign");

    // 2. Define the new state using a constant variable
    const NEW_STATUS = "The Nebula Gallery is now open for viewing!";

    // 3. Change the element's content property (.innerHTML)
    signElement.innerHTML = NEW_STATUS;

    // 4. Console log the change for debugging
    console.log("Sign updated to: " + NEW_STATUS);
}
