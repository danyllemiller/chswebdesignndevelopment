// File: /js/prof-scales.js
/**
 * REUSABLE FIREBASE LOGIC FOR COMPUTER SCIENCE PROFICIENCY SCALES
 * Automatically detects the Unit Number via the body's data-unit attribute.
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "/js/firebase-init.js";

// Pull the unit number dynamically from the HTML body tag
const unitNum = parseInt(document.body.getAttribute('data-unit') || "1", 10);
let currentUserUid = null;

function parsePts(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return parseInt(ptsMatch[1], 10);
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('diagnostic') || lowerName.includes('pre-assessment')) return 10;
    if (lowerName.includes('exam') || lowerName.includes('summative')) return 20;
    return 100;
}

function calculateProficiencyLevel(score, max) {
    if (score === "Submitted" || score === "" || max === 0) return 0;
    const pct = Number(score) / max;
    if (pct >= 0.90) return 4.0;
    if (pct >= 0.70) return 3.0; 
    if (pct >= 0.40) return 2.0; 
    return 1.0;
}

// 1. LIVE AUTO-LOAD HISTORICAL GRADES ON PAGE LOAD
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        const username = user.email.split('@')[0].toLowerCase();
        const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
        
        try {
            const q = query(rosterRef, where("username", "==", username));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const studentId = snap.docs[0].data().studentId || snap.docs[0].id;

                // A. LIVE Fetch Teacher Grades via onSnapshot!
                const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', studentId);
                
                onSnapshot(gradeRef, (gradeSnap) => {
                    if (gradeSnap.exists()) {
                        const grades = gradeSnap.data();
                        const keys = Object.keys(grades);
                        
                        // Strict Matcher for Pre-Assessment
                        const preKey = keys.find(k => {
                            const name = k.toLowerCase();
                            const hasUnit = name.includes(`unit ${unitNum}`) || name.includes(`unit${unitNum}-`) || name.includes(`unit ${unitNum}-`);
                            const hasPre = name.includes('pre') || name.includes('diagnostic');
                            return hasUnit && hasPre;
                        });
                        
                        if (preKey && grades[preKey]) {
                            const score = typeof grades[preKey] === 'object' ? grades[preKey].score : grades[preKey];
                            let max = typeof grades[preKey] === 'object' && grades[preKey].max ? grades[preKey].max : parsePts(preKey);
                            if (!max) max = 10;
                            
                            const lvl = calculateProficiencyLevel(score, max);
                            if (window.updateSystemBar) {
                                window.updateSystemBar('pre-test-bar', 'pre-test-label', lvl);
                            }
                        }

                        // Strict Matcher for Summative/Exam Score
                        const postKey = keys.find(k => {
                            const name = k.toLowerCase();
                            const hasUnit = name.includes(`unit ${unitNum}`) || name.includes(`unit${unitNum}-`) || name.includes(`unit ${unitNum}-`);
                            const hasPost = name.includes('summative') || name.includes('exam') || name.includes('project');
                            return hasUnit && hasPost;
                        });
                        
                        if (postKey && grades[postKey]) {
                            const score = typeof grades[postKey] === 'object' ? grades[postKey].score : grades[postKey];
                            let max = typeof grades[postKey] === 'object' && grades[postKey].max ? grades[postKey].max : parsePts(postKey);
                            if (!max) max = 20;

                            const lvl = calculateProficiencyLevel(score, max);
                            if (window.updateSystemBar) {
                                window.updateSystemBar('post-test-bar', 'post-test-label', lvl);
                            }
                        }
                    }
                });

                // B. LIVE Fetch Previous Self-Assessment for Computer Science
                const saRef = doc(db, 'artifacts', appId, 'users', currentUserUid, 'self_assessments', 'computer_science');
                onSnapshot(saRef, (saSnap) => {
                    if (saSnap.exists() && saSnap.data()[`unit${unitNum}`]) {
                        const savedLvl = parseFloat(saSnap.data()[`unit${unitNum}`]);
                        if (window.setSelfAssessment) {
                            window.setSelfAssessment(savedLvl);
                        }
                    }
                });
                
            }
        } catch (err) {
            console.error("[ProfScale Database] Error fetching data:", err);
        }
    }
});

// 2. EXPORT SAVE FUNCTION FOR HTML ONCLICK EVENTS
window.saveToFirebase = async function(level) {
    if (!currentUserUid) return;
    const btn = document.getElementById('submit-btn');
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Saving to Database...';
    }

    try {
        const saRef = doc(db, 'artifacts', appId, 'users', currentUserUid, 'self_assessments', 'computer_science');
        await setDoc(saRef, { [`unit${unitNum}`]: parseFloat(level) }, { merge: true });
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check me-2"></i> Saved Successfully!';
            btn.style.backgroundColor = 'var(--code-color)';
            setTimeout(() => {
                btn.innerHTML = 'Save & Continue <i class="fas fa-arrow-right ms-2"></i>';
                btn.style.backgroundColor = 'var(--primary-color)';
                
                // Signal the parent iframe to continue
                if(window.submitToGateway) window.submitToGateway();
            }, 1000); // Faster transition inside the notebook
        }
    } catch (e) {
        console.error("Save failed:", e);
        if (btn) btn.innerHTML = 'Error Saving. Check Connection.';
    }
}