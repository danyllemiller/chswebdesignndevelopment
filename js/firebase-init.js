/** /js/firebase-init.js
 * CHS Web Design - Master Firebase Configuration
 * Centralized initialization to prevent duplicate code across the site.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
    authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
    projectId: "digitalartsclasses-games-67ae7",
    storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
    messagingSenderId: "662051088920",
    appId: "1:662051088920:web:3b05cb890d834c0b9cb16d",
    measurementId: "G-LZ4CXH6X3G"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dac-exam-system';

// Export these so any other file can just import them instantly!
export { app, auth, db, appId };